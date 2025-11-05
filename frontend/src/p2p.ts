import {PCConfig} from "./configs/pc-config.js";
import {type AppUI} from "./interaces/app-ui.js";
import {PlayerMovementInit} from "./player-char-movement.js";
import {DragElement} from "./draggable.js";
import {AddSamplePlayer} from "./add-sample-player.js";
import {io, Socket} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";



export function SignallingSend(signalling: Socket | MessagePort, message: any){
    if ("emit" in signalling) {
        signalling.emit(message.type, message.payload);
    } else if ("postMessage" in signalling) {
        signalling.postMessage({message: message.payload, type: message.type});
    } else {
        console.error("signalling object can't emit or postMessage");
    }
}

export async function CreateOffer(signalling: Socket | MessagePort, destID: string, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined) {
    if (!peerConnection) {
        console.error("create offer failed - peer connection undefined");
        return;
    }
    console.log("create offer");
    peerConnection
        .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true})
        .then(async sdp => {
            await peerConnection.setLocalDescription(sdp);
            SignallingSend(signalling, {type: "offer", payload: {dest: destID, sdp: sdp}})
        })
        .catch(error => {
            console.log(error);
        });
}




export async function CreateAnswer(signalling: Socket | MessagePort, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined, sdp: string | RTCSessionDescription, destID: string) {
    if (peerConnection === undefined) {
        console.error("create answer failed - peer connection undefined");
        return;
    }
    console.log("create answer");
    peerConnection.setRemoteDescription(<RTCSessionDescriptionInit>sdp).then(() => {
        console.log("answer set remote description success");
        peerConnection
            .createAnswer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
                offerToReceivePositions: true,
            })
            .then(async sdp1 => {
                await peerConnection.setLocalDescription(sdp1);
                SignallingSend(signalling, {type: "answer", payload: {dest: destID, sdp: sdp1}})
            })
            .catch(error => {
                console.log(error);
            });
    });
}

export function InitPlayerCharacter(appUI: AppUI){
    let clientCharacterContainer = document.createElement("div");
    clientCharacterContainer.style.position = "absolute";
    clientCharacterContainer.style.top = "50%";
    clientCharacterContainer.style.left = "50%";
    clientCharacterContainer.id = "playerCharacter";

    let nameLabel = document.createElement("div");
    nameLabel.textContent = "Me";
    nameLabel.style.textAlign = "center";
    nameLabel.style.fontSize = "12px";
    nameLabel.style.color = "blue";
    nameLabel.style.fontWeight = "bold";
    clientCharacterContainer.appendChild(nameLabel);

    let clientCharacter = document.createElement("canvas");
    clientCharacter.width = 30;
    clientCharacter.height = 30;
    clientCharacter.style.position = "absolute";
    clientCharacter.style.backgroundColor = "blue";

    clientCharacterContainer.appendChild(clientCharacter);

    document.getElementById("container")!.appendChild(clientCharacterContainer);

    DragElement(clientCharacterContainer, appUI);

    PlayerMovementInit();
}


export function roomJoin(isMobile: boolean, peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket) {
    console.log("roomJoin");

    InitPlayerCharacter(appUI);

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    let signalling;

    if (isMobile) {
        signalling = io(ServerConfig.url, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

    } else {
        const worker = new SharedWorker(new URL('/src/signalling-worker.ts', import.meta.url), {type: "module"});
        console.log("worker " + worker);
        signalling = worker.port;

        signalling.start();
        console.log("port " + signalling + " ; ");
    }


    if ("onAny" in signalling){
        signalling.onAny(async (ev, ...args) => {
            console.log("Event: ", ev, args);
            await HandleSignallingEvent(signalling, ev.toString(), args[0], appUI, IceCandidateQueue, peerConnections, wsPositions);
        })
    } else if ("addEventListener" in signalling){
        signalling.addEventListener("message", async (event) => {
            await HandleSignallingEvent(signalling, event.data.type, event.data, appUI, IceCandidateQueue, peerConnections, wsPositions);
        });
    }


    SignallingSend(signalling, {
        payload: {
            roomId: appUI.roomIDInput.value,
            name: appUI.nameInput.value,
            password: appUI.passwordInput.value
        }, type: "join"
    });
    console.log("join posted");
    const sampleSoundButton = CreateSampleSoundButton(appUI);
    document.getElementById("container")?.appendChild(sampleSoundButton);
}

export async function HandleSignallingEvent(signalling: Socket | MessagePort, eventName: string, eventData: any, appUI: AppUI, IceCandidateQueue: { [key: string]: { popped: boolean, queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]}}, peerConnections: { [key: string]: RTCPeerConnection }, wsPositions: WebSocket) {
        switch (eventName) {
            case "connect":
                SignallingSend(signalling, {type: "listRooms", payload: {}});
                console.log('Hello, successfully connected to the signaling server!');
                break;
            case "disconnect":
                console.log("disconnect:" + eventData);
                break;
            case "error":
                console.log("Error: " + eventData.message);
                appUI.errorMsgLabel.innerHTML = "Error" + eventData.message;
                break;
            case "listRooms":
                appUI.roomList.innerHTML = "Rooms: \n" + eventData.roomsList;
                break;
            case "sharedWorkerMessage":
                console.log("SharedWorker says: " + eventData.message);
                break;
            case "getCandidate":
                if (!eventData.candidate.candidate) {
                    return;
                }
                if (IceCandidateQueue[eventData.id] && IceCandidateQueue[eventData.id]!.popped) {
                    console.log("getCandidate", eventData.candidate.candidate);
                    if (peerConnections[eventData.id]!.connectionState == "connected") {
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    if (eventData.candidate.candidate == "") return;
                    peerConnections[eventData.id]!.addIceCandidate(new RTCIceCandidate(eventData.candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                } else if (!IceCandidateQueue[eventData.id]) {
                    IceCandidateQueue[eventData.id] = {popped: false, queue: []};
                }
                IceCandidateQueue[eventData.id]!.queue.push(eventData.candidate);
                console.log("getCandidate -- pushed to queue: ", eventData.candidate);
                break;
            case "listUsers":
                console.log("listUsers: ", eventData);
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                if (IceCandidateQueue[eventData.id] == undefined) {
                    IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    console.log("undefined queue");
                    return;
                }
                await useQueuedCandidates(peerConnections, IceCandidateQueue, eventData.id)
                IceCandidateQueue[eventData.id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + eventData.sdp);
                await InitPC(signalling, eventData.id, peerConnections, appUI, wsPositions, false, eventData.username);
                await CreateAnswer(signalling, peerConnections, peerConnections[eventData.id], eventData.sdp, eventData.id);
                break;
            case "getAnswer":
                console.log("get answer:" + eventData.sdp);
                if (!peerConnections[eventData.id]!.remoteDescription || !peerConnections[eventData.id]!.remoteDescription!.type) {
                    console.log("setting remote desc after getting an answer");
                    await peerConnections[eventData.id]!.setRemoteDescription(eventData.sdp);
                }
                console.log("answerAck sent")
                SignallingSend(signalling, {payload: {dest: eventData.id}, type: "answerAck"});
                if (!IceCandidateQueue[eventData.id]) {
                    console.log("NO QUEUE TO POP");
                    IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    return;
                }
                console.log("getAnswerAck");
                await useQueuedCandidates(peerConnections, IceCandidateQueue, eventData.id)
                break;
            case "PeerJoined":
                console.log("Peer joined: " + eventData.id);
                if (peerConnections[eventData.id]) {
                    console.log("peer already connected");
                    return;
                }

                await InitPC(signalling, eventData.id, peerConnections, appUI, wsPositions, true, eventData.username);
                await CreateOffer(signalling, eventData.id, peerConnections, peerConnections[eventData.id]);
                break;

        }
    }


export function CreateSampleSoundButton(appUI: AppUI) {
    let sampleSoundButton = document.createElement("button");
    sampleSoundButton.innerText = "Add a sample VC member";
    sampleSoundButton.style.fontSize = "32";

    sampleSoundButton.addEventListener('click', async e => {
        await AddSamplePlayer("0", appUI, "Sample");
        sampleSoundButton.remove();
    });
    return sampleSoundButton;
}

export async function InitPC(signalling: Socket | MessagePort, id : string, peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket, offer: boolean, username: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection = new RTCPeerConnection({...PCConfig, iceTransportPolicy: "all"});

    console.log("render videos");
    try {
        const stream = await navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000,
                },
            })
        const remoteVideo = document.createElement("canvas");
        const remoteAudio: HTMLAudioElement = document.createElement("audio");

        remoteVideo.id = "remoteVideo-" + id;
        remoteAudio.id = "remoteAudio-" + id;

        remoteAudio.autoplay = true;
        remoteAudio.muted = false;

        if (appUI.videoContainer) {
            appUI.videoContainer.appendChild(remoteAudio);
            appUI.videoContainer.appendChild(remoteVideo);
        }

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        let peerCharacterContainer = document.createElement("div");
        peerCharacterContainer.style.position = "absolute";
        peerCharacterContainer.style.top = "50%";
        peerCharacterContainer.style.left = "50%";
        peerCharacterContainer.id = "remotePlayerCharacter-" + id;

        let nameLabel = document.createElement("div");
        nameLabel.textContent = username;
        console.log("USERNAMMEEE: " + username);
        nameLabel.style.textAlign = "center";
        nameLabel.style.fontSize = "12px";
        nameLabel.style.color = "green";
        nameLabel.style.fontWeight = "bold";
        peerCharacterContainer.appendChild(nameLabel);

        let peerCharacter = document.createElement("canvas");
        peerCharacter.width = 30;
        peerCharacter.height = 30;
        peerCharacter.style.position = "absolute";
        peerCharacter.style.backgroundColor = "green";

        peerCharacterContainer.appendChild(peerCharacter);
        document.body.appendChild(peerCharacterContainer);

        DragElement(peerCharacterContainer, appUI);

        if (offer) {
            let dc = peerConnection.createDataChannel("positions", {ordered: true});
            BindDataChannel(appUI, dc, id);
        } else {
            peerConnection.ondatachannel = (e) => {
                let dc = e.channel;
                BindDataChannel(appUI, dc, id);
            };
        }

        peerConnection.onicecandidate = e => {
            console.log("onicecandidate");
            if (e.candidate) {
                console.log("candidate: " + e.candidate);
                if ("emit" in signalling) {
                    signalling.emit("candidate", {dest: id, candidate: {candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                        sdpMLineIndex: e.candidate.sdpMLineIndex,
                        usernameFragment: (e.candidate as any).usernameFragment}});
                } else if ("postMessage" in signalling) {
                    signalling.postMessage({message: {dest: id, candidate: {candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                            sdpMLineIndex: e.candidate.sdpMLineIndex,
                            usernameFragment: (e.candidate as any).usernameFragment,}}, type: "candidate"});
                }
            } else {
                console.log("no candidate")
            }
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log(e);
        };


        peerConnection.ontrack = async ev => {
            HandleNewReceivedStream(ev.streams[0], remoteAudio, remoteVideo, appUI, id);
        };
    } catch (e) {
        console.log(e);
    }
    console.log("set new peerConnection");
    peerConnections[id] = peerConnection;
}

export function HandleNewReceivedStream(stream: MediaStream, remoteAudio: HTMLAudioElement, remoteVideo: HTMLCanvasElement, appUI: AppUI, id: string) {
    let audioCtx = appUI.audioCtx;
    let microphone = audioCtx.createMediaStreamSource(stream);
    if (remoteAudio) {
        remoteAudio.muted = true;
        remoteAudio.srcObject = stream;
    }
    let analyser = audioCtx.createAnalyser();
    let panNode = audioCtx.createPanner();
    SetPanNodeParams(panNode);

    appUI.distanceFalloff.addEventListener("change", () => {
        panNode.refDistance = appUI.distanceFalloff.valueAsNumber;
        panNode.maxDistance = appUI.distanceFalloff.valueAsNumber
    });

    microphone.connect(panNode);
    panNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    let muted = false;

    remoteVideo.onclick = () => {
        if (muted) {
            console.log("unmuted");
            muted = false;
            analyser.connect(audioCtx.destination);
        } else {
            console.log("muted");
            muted = true;
            analyser.disconnect(audioCtx.destination);
        }
    }

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let canvasCtx = remoteVideo.getContext("2d")!;
    const WIDTH = 200;
    const HEIGHT = 100;
    function draw() {
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        analyser.getByteTimeDomainData(dataArray);
        // Fill solid color
        canvasCtx.fillStyle = "rgb(200 200 200)";
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        // Begin the path
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(0 0 0)";
        canvasCtx.beginPath();
        // Draw each point in the waveform
        const sliceWidth = WIDTH / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]! / 128.0;
            const y = v * (HEIGHT / 2);

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        // Finish the line
        canvasCtx.lineTo(WIDTH, HEIGHT / 2);
        canvasCtx.stroke();
        requestAnimationFrame(draw);
    }
    function updateAudioPosition(timeDelta: DOMHighResTimeStamp, panNode: PannerNode, id: string) {
        let peerChar = document.getElementById("remotePlayerCharacter-" + id);
        let localChar = document.getElementById("playerCharacter");
        if (!localChar || !peerChar) {
            console.log("no peer char or local char");
            return
        }
        let lCPositions = {
            x: parseFloat(localChar.style.left) / 100 * window.innerWidth,
            y: parseFloat(localChar.style.top) / 100 * window.innerHeight
        };
        let pCPositions = {
            x: parseFloat(peerChar.style.left) / 100 * window.innerWidth,
            y: parseFloat(peerChar.style.top) / 100 * window.innerHeight
        };

        panNode.positionX.setValueAtTime((pCPositions.x - lCPositions.x) / 100, 0);
        panNode.positionZ.setValueAtTime((pCPositions.y - lCPositions.y) / 100, 0);

        console.log("x: " + (pCPositions.x - lCPositions.x) / 100 + " y: " + (pCPositions.y - lCPositions.y) / 100);
        requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
    }
    requestAnimationFrame((time) => draw());
    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
}

export function SetPanNodeParams(panNode: PannerNode) {
    panNode.panningModel = "HRTF";
    panNode.distanceModel = "exponential";
    panNode.refDistance = 5;
    panNode.maxDistance = 500;
    panNode.rolloffFactor = 1;
    panNode.coneInnerAngle = 360;
    panNode.coneOuterAngle = 360;
    panNode.coneOuterGain = 1;
}

export function BindDataChannel(appUI: AppUI, dc: RTCDataChannel, id: string) {
    dc.onopen = () => {
        function sendPos() {
            setTimeout(()=>{
                let char = document.getElementById("playerCharacter");
                dc.send(new URLSearchParams({top: char!.style.top, left: char!.style.left}).toString());
                sendPos()
            }, 10)
        }
        sendPos();
    };
    dc.onmessage = (event: { data: any }) => {
        if (appUI.manualPositions.checked) return;
        let char = document.getElementById("remotePlayerCharacter-" + id);
        let data = Object.fromEntries(new URLSearchParams(event.data));
        char!.style.top = data.top!;
        char!.style.left = data.left!;
    }
}


export async function useQueuedCandidates (peerConnections: { [p: string]: RTCPeerConnection }, iceCandidateQueue:any, id: string) {
    for (const cand of iceCandidateQueue[id]!.queue) {
        if (peerConnections[id]!.connectionState == "connected") {
            console.log("getCandidate ignored - connected");
            return;
        }
        console.log("popped from queue");
        if (cand.candidate.candidate == "") return;
        await peerConnections[id]!.addIceCandidate(new RTCIceCandidate(cand.candidate));
    }
    iceCandidateQueue[id]!.popped = true;
}
