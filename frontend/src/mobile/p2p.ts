import {PCConfig} from "../configs/pc-config.js";
import {ServerConfig} from "../configs/server-config";
import {type AppUI} from "../interaces/app-ui.js";
import {PlayerMovementInit} from "../player-char-movement.js";
import {DragElement} from "../draggable.js";
import {AddSamplePlayer} from "../add-sample-player.js";
import {io, Socket} from "socket.io-client";

async function createOffer(signallingSocket: Socket, destID: string, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined) {
    if (!peerConnection) {
        console.error("create offer failed - peer connection undefined");
        return;
    }
    console.log("create offer");
    peerConnection
        .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true})
        .then(async sdp => {
            await peerConnection.setLocalDescription(sdp);
            signallingSocket.emit("offer", {dest: destID, sdp: sdp});
        })
        .catch(error => {
            console.log(error);
        });

}

async function createAnswer(signallingSocket: Socket, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined, sdp: string | RTCSessionDescription, destID: string) {
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
                signallingSocket.emit("answer", {dest: destID, sdp: sdp1});
            })
            .catch(error => {
                console.log(error);
            });
    });
}

function InitPlayerCharacter(appUI: AppUI){
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


export function roomJoin(peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket) {
    console.log("roomJoin");

    InitPlayerCharacter(appUI);

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    const signallingSocket = io(ServerConfig.url, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
    });

    signallingSocket.onAny(async (ev, ...args) => {
        switch (ev.toString()) {
            case "connect":
                signallingSocket.emit("listRooms", {});
                console.log('Hello, successfully connected to the signaling server!');
                break;
            case "disconnect":
                console.log("disconnect:" + args[0].data);
                break;
            case "error":
                console.log("Error: " + args[0].data.message);
                appUI.errorMsgLabel.innerHTML = "Error" + args[0].data.message;
                break;
            case "listRooms":
                appUI.roomList.innerHTML = "Rooms: \n" + args[0].data.roomsList;
                break;
            case "sharedWorkerMessage":
                console.log("SharedWorker says: " + args[0].data.message);
                break;
            case "getCandidate":
                if (!args[0].data.candidate.candidate) {
                    return;
                }
                if (IceCandidateQueue[args[0].data.id] && IceCandidateQueue[args[0].data.id]!.popped) {
                    console.log("getCandidate", args[0].data.candidate.candidate);
                    if (peerConnections[args[0].data.id]!.connectionState == "connected") {
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    if (args[0].data.candidate.candidate == "") return;
                    peerConnections[args[0].data.id]!.addIceCandidate(new RTCIceCandidate(args[0].data.candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                } else if (!IceCandidateQueue[args[0].data.id]) {
                    IceCandidateQueue[args[0].data.id] = {popped: false, queue: []};
                }
                IceCandidateQueue[args[0].data.id]!.queue.push(args[0].data.candidate);
                console.log("getCandidate -- pushed to queue: ", args[0].data.candidate);
                break;
            case "listUsers":
                console.log("listUsers: ", args[0].data);
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                if (IceCandidateQueue[args[0].data.id] == undefined) {
                    IceCandidateQueue[args[0].data.id] = {popped: true, queue: []};
                    console.log("undefined queue");
                    return;
                }
                await useQueuedCandidates(peerConnections, IceCandidateQueue, args[0].data.id)
                IceCandidateQueue[args[0].data.id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + args[0].data.sdp);
                await pinit(signallingSocket, args[0].data.id, peerConnections, appUI, wsPositions, false, args[0].data.username);
                await createAnswer(signallingSocket, peerConnections, peerConnections[args[0].data.id], args[0].data.sdp, args[0].data.id);
                break;
            case "getAnswer":
                console.log("get answer:" + args[0].data.sdp);
                if (!peerConnections[args[0].data.id]!.remoteDescription || !peerConnections[args[0].data.id]!.remoteDescription!.type) {
                    console.log("setting remote desc after getting an answer");
                    await peerConnections[args[0].data.id]!.setRemoteDescription(args[0].data.sdp);
                }
                console.log("answerAck sent")
                signallingSocket.emit("answerAck", {dest: args[0].data.id});
                if (!IceCandidateQueue[args[0].data.id]) {
                    console.log("NO QUEUE TO POP");
                    IceCandidateQueue[args[0].data.id] = {popped: true, queue: []};
                    return;
                }
                console.log("getAnswerAck");
                await useQueuedCandidates(peerConnections, IceCandidateQueue, args[0].data.id)
                break;
            case "PeerJoined":
                console.log("Peer joined: " + args[0].data.id);
                if (peerConnections[args[0].data.id]) {
                    console.log("peer already connected");
                    return;
                }

                await pinit(signallingSocket, args[0].data.id, peerConnections, appUI, wsPositions, true, args[0].data.username);
                await createOffer(signallingSocket, args[0].data.id, peerConnections, peerConnections[args[0].data.id]);
                break;

        }
    });

    signallingSocket.emit("join", {
        roomId: appUI.roomIDInput.value,
        name: appUI.nameInput.value,
        password: appUI.passwordInput.value
    });

    console.log("join posted");
    const sampleSoundButton = CreateSampleSoundButton(appUI);
    document.getElementById("container")?.appendChild(sampleSoundButton);
}

function CreateSampleSoundButton(appUI: AppUI) {
    let sampleSoundButton = document.createElement("button");
    sampleSoundButton.innerText = "Add a sample VC member";
    sampleSoundButton.style.fontSize = "32";

    sampleSoundButton.addEventListener('click', async e => {
        await AddSamplePlayer("0", appUI, "Sample");
        sampleSoundButton.remove();
    });
    return sampleSoundButton;
}

async function pinit(signallingSocket: Socket, id : string, peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket, offer: boolean, username: string) {
    let audioCtx = appUI.audioCtx;

    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection = new RTCPeerConnection({...PCConfig, iceTransportPolicy: "all"});

    console.log("render videos");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1,
                sampleRate: 48000,
            }});
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
                    signallingSocket.emit("candidate", {dest: id, candidate: {candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                            sdpMLineIndex: e.candidate.sdpMLineIndex,
                            usernameFragment: (e.candidate as any).usernameFragment}});
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

function HandleNewReceivedStream(stream: MediaStream, remoteAudio: HTMLAudioElement, remoteVideo: HTMLCanvasElement, appUI: AppUI, id: string) {
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
        requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
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

        const now = audioCtx.currentTime;
        const rampTime = 0.05; // 50 ms

        panNode.positionX.cancelScheduledValues(now);
        panNode.positionY.cancelScheduledValues(now);
        panNode.positionZ.setValueAtTime(0, now);
        panNode.positionX.linearRampToValueAtTime((pCPositions.x - lCPositions.x) / 100, now + rampTime);
        panNode.positionY.linearRampToValueAtTime((pCPositions.y - lCPositions.y) / 100, now + rampTime);
    }
    requestAnimationFrame((time) => draw());
    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
}

export function SetPanNodeParams(panNode: PannerNode) {
    panNode.panningModel = "equalpower";
    panNode.distanceModel = "linear";
    panNode.refDistance = 5;
    panNode.maxDistance = 500;
    panNode.rolloffFactor = 1;
    panNode.coneInnerAngle = 360;
    panNode.coneOuterAngle = 360;
    panNode.coneOuterGain = 1;
}

function BindDataChannel(appUI: AppUI, dc: RTCDataChannel, id: string) {
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


async function useQueuedCandidates (peerConnections: { [p: string]: RTCPeerConnection }, iceCandidateQueue:any, id: string) {
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
