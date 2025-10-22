import { PCConfig } from "./configs/pc-config.js";
import { type AppUI } from "./interaces/app-ui.js";
import { PlayerMovementInit } from "./player-char-movement.js";
import { DragElement } from "./draggable.js";

async function createOffer(wWPort: MessagePort, destID: string, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined) {
    if (!peerConnection) {
        console.error("create offer failed - peer connection undefined");
        return;
    }
    console.log("create offer");
    peerConnection
        .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true})
        .then(async sdp => {
            sdp.sdp = sdp.sdp!.replace(/a=fmtp:111 minptime=10;useinbandfec=1/g,
                'a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=96000');

            await peerConnection.setLocalDescription(sdp);
            wWPort.postMessage({message: {dest: destID, sdp: sdp}, type: "offer"});
        })
        .catch(error => {
            console.log(error);
        });

}

async function createAnswer(wWPort: MessagePort, peerConnections: {[key: string] : RTCPeerConnection}, peerConnection: RTCPeerConnection | undefined, sdp: string | RTCSessionDescription, destID: string) {
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
                wWPort.postMessage({message: {dest: destID, sdp: sdp1}, type: "answer"});
            })
            .catch(error => {
                console.log(error);
            });
    });
}


export function roomJoin(peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket) {
    console.log("roomJoin");

    let audioCtx = new AudioContext();

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

    let IceCandidateQueue: {[key: string] : {popped: boolean, queue: {candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]}} = {};

    const worker = new SharedWorker(new URL('/src/signalling-worker.ts', import.meta.url), {type: "module"});
    console.log("worker " + worker);
    const wWPort = worker.port;

    wWPort.start();
    console.log("port " + wWPort + " ; ");

    wWPort.addEventListener("message", async (event) => {
        console.log("message", event.data);
        switch (event.data.type) {
            case "connect":
                wWPort.postMessage({ type: "listRooms" });
                console.log('Hello, successfully connected to the signaling server!');
                break;
            case "disconnect":
                console.log("disconnect:" + event.data);
                break;
            case "error":
                console.log("Error: " + event.data.message);
                appUI.errorMsgLabel.innerHTML = "Error" + event.data.message;
                break;
            case "listRooms":
                appUI.roomList.innerHTML = "Rooms: \n" + event.data.roomsList;
                break;
            case "sharedWorkerMessage":
                console.log("SharedWorker says: " + event.data.message);
                break;
            case "getCandidate":
                if (!event.data.candidate.candidate) {
                    return;
                }
                if (IceCandidateQueue[event.data.id] && IceCandidateQueue[event.data.id]!.popped) {
                    console.log("getCandidate", event.data.candidate.candidate);
                    if (peerConnections[event.data.id]!.connectionState == "connected"){
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    peerConnections[event.data.id]!.addIceCandidate(new RTCIceCandidate(event.data.candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                }
                else if (!IceCandidateQueue[event.data.id]) {
                    IceCandidateQueue[event.data.id] = {popped: false, queue: []};
                }
                IceCandidateQueue[event.data.id]!.queue.push(event.data.candidate);
                console.log("getCandidate -- pushed to queue: ", event.data.candidate);
                break;
            case "listUsers":
                console.log("listUsers");
                for (const userID of event.data.userIDs) {
                    if (userID < event.data.selfID && (!(userID in peerConnections || peerConnections[userID]!.connectionState != "connected"))) {
                        console.log("found disconnected user");
                        await pinit(wWPort, userID, peerConnections, appUI, wsPositions, true, "DISCONNECTED USER PLACEHOLDER");
                        await createOffer(wWPort, userID, peerConnections, peerConnections[userID]);
                    }
                }
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                for (const cand of IceCandidateQueue[event.data.id]!.queue) {
                    if (peerConnections[event.data.id]!.connectionState == "connected"){
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    console.log("popped from queue");
                    await peerConnections[event.data.id]!.addIceCandidate(new RTCIceCandidate(cand.candidate));
                }
                IceCandidateQueue[event.data.id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + event.data.sdp);
                await pinit(wWPort, event.data.id, peerConnections, appUI, wsPositions, false, event.data.username);
                await createAnswer(wWPort, peerConnections, peerConnections[event.data.id], event.data.sdp, event.data.id);
                break;
            case "getAnswer":
                console.log("get answer:" + event.data.sdp);
                if (!peerConnections[event.data.id]!.remoteDescription || !peerConnections[event.data.id]!.remoteDescription!.type){
                    console.log("setting remote desc after getting an answer");
                    await peerConnections[event.data.id]!.setRemoteDescription(event.data.sdp);
                }
                console.log("answerAck sent")
                wWPort.postMessage({message: {dest: event.data.id}, type: "answerAck"});
                if (!IceCandidateQueue[event.data.id]){
                    return;
                }
                useQueuedCandidates(IceCandidateQueue[event.data.id], peerConnections[event.data.id]);
                break;
            case "PeerJoined":
                console.log("Peer joined: " + event.data.id);
                if (peerConnections[event.data.id]){
                    console.log("peer already connected");
                    return;
                }
                await pinit(wWPort, event.data.id, peerConnections, appUI, wsPositions, true, event.data.username);
                await createOffer(wWPort, event.data.id, peerConnections, peerConnections[event.data.id]);
                break;

        }
    })

    wWPort.postMessage({message: {
        roomId: appUI.roomIDInput.value,
        name: appUI.nameInput.value,
        password: appUI.passwordInput.value
        }, type: "join"});
    console.log("join posted");

async function pinit(wWPort: MessagePort, id : string, peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket, offer: boolean, username: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection = new RTCPeerConnection(PCConfig);

    console.log("render videos");
    try {
        await navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000,
                },
                // audio: true
            })
            .then(stream => {
                const remoteVideo = document.createElement("canvas");
                const remoteAudio = document.createElement("audio");


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
                peerCharacter.style.backgroundColor = "blue";

                peerCharacterContainer.appendChild(peerCharacter);
                document.body.appendChild(peerCharacterContainer);

                DragElement(peerCharacterContainer, appUI);


                if (offer) {
                    let dc = peerConnection.createDataChannel("positions", {ordered: true});
                    dc.onopen = () => {
                        // peerCharacter.id = "remotePlayerCharacter-" + id;
                        // peerCharacter.width = 20;
                        // peerCharacter.height = 20;
                        // peerCharacter.style.position = "absolute";
                        // peerCharacter.style.top = "50%";
                        // peerCharacter.style.left = "50%";
                        // peerCharacter.style.backgroundColor = "green";
                        // document.body.appendChild(peerCharacter);
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
                        console.log("received position message: ", event.data);
                        let data = Object.fromEntries(new URLSearchParams(event.data));
                        char!.style.top = data.top!;
                        char!.style.left = data.left!;
                    }
                } else {
                    peerConnection.ondatachannel = (e) => {
                        let dc = e.channel;
                        dc.onopen = () => {
                            // peerCharacter.id = "remotePlayerCharacter-" + id;
                            // peerCharacter.width = 20;
                            // peerCharacter.height = 20;
                            // peerCharacter.style.position = "absolute";
                            // peerCharacter.style.top = "50%";
                            // peerCharacter.style.left = "50%";
                            // peerCharacter.style.backgroundColor = "green";


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
                            console.log("received position message: ", event.data);
                            let data = Object.fromEntries(new URLSearchParams(event.data));
                            char!.style.top = data.top!;
                            char!.style.left = data.left!;
                        }
                    };
                }

                peerConnection.onicecandidate = e => {
                    console.log("onicecandidate");

                    if (e.candidate) {
                        console.log("candidate: " + e.candidate);
                        wWPort.postMessage({message: {dest: id, candidate: {candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                                    usernameFragment: (e.candidate as any).usernameFragment,}}, type: "candidate"});
                    } else {
                        console.log("no candidate")
                    }
                };

                peerConnection.oniceconnectionstatechange = e => {
                    console.log(e);
                };


                peerConnection.ontrack = ev => {
                    let microphone = audioCtx.createMediaStreamSource(ev.streams[0]!);
                    let analyser = audioCtx.createAnalyser();
                    // let gainNode = audioCtx.createGain();
                    let panNode = audioCtx.createPanner();
                    panNode.panningModel = "HRTF";
                    panNode.distanceModel = "linear";
                    panNode.refDistance = 50;
                    panNode.maxDistance = 500;
                    panNode.rolloffFactor = 1;
                    microphone.connect(panNode);
                    panNode.connect(analyser);
                    const dest = audioCtx.createMediaStreamDestination();
                    panNode.connect(dest);

                    analyser.fftSize = 512;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    let canvasCtx = remoteVideo.getContext("2d")!;
                    const WIDTH = 200;
                    const HEIGHT = 100;
                    function draw() {
                        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                        const drawVisual = requestAnimationFrame(draw);
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
                    }
                    function updateAudioPosition(timeDelta: DOMHighResTimeStamp, panNode: PannerNode, id: string){
                        requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
                        let peerChar = document.getElementById("remotePlayerCharacter-" + id);
                        let localChar = document.getElementById("playerCharacter");
                        if (!localChar || !peerChar) {
                            console.log("no peer char or local char");
                            return
                        }
                        let lCPositions = {x: parseFloat(localChar.style.left) / 100 * window.innerWidth, y: parseFloat(localChar.style.top) / 100 * window.innerHeight};
                        let pCPositions = {x: parseFloat(peerChar.style.left) / 100 * window.innerWidth, y: parseFloat(peerChar.style.top) / 100 * window.innerHeight};

                        panNode.positionX.linearRampToValueAtTime(pCPositions.x - lCPositions.x, 0.05);
                        panNode.positionY.linearRampToValueAtTime(pCPositions.y - lCPositions.y, 0.05);


                        // const dx = lCPositions.x - pCPositions.x;
                        // const dy = lCPositions.y - pCPositions.y;
                        // const distance = Math.sqrt(dx * dx + dy * dy);
                        //
                        // const maxDistance = 800; // px
                        // const minDistance = 50;
                        // const normalized = Math.max(0, Math.min(1, 1 - (distance - minDistance) / (maxDistance - minDistance)));
                        // // gainNode.gain.value = normalized;
                        // console.log("Gain: " + normalized);
                        // gainNode.gain.linearRampToValueAtTime(normalized, audioCtx.currentTime + 0.05);
                        // //
                        // const halfWidth = window.innerWidth / 2;
                        // const relativeX = (lCPositions.x - halfWidth) / halfWidth;
                        // const pan = Math.max(-1, Math.min(1, relativeX));
                        // // panNode.pan.value = pan;
                        // panNode.pan.linearRampToValueAtTime(pan, audioCtx.currentTime + 0.05);
                        // console.log("Pan: " + pan);
                    }
                    requestAnimationFrame(draw);
                    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
                    console.log("add remote track success");
                    if (remoteAudio)
                        remoteAudio.srcObject = dest.stream;
                    else {
                        console.log("remote track failed");
                    }
                };

            })
            .catch(error => {
                console.log(`getUserMedia error: ${error}`);
            });

    } catch (e) {
        console.log(e);
    }
    console.log("set new peerConnection");
    peerConnections[id] = peerConnection;
}
}



async function useQueuedCandidates (queue: { popped: boolean, queue: { candidate: RTCIceCandidate; sdpMid: string; sdpMLineIndex: number }[] } | undefined , peerConnection: RTCPeerConnection | undefined) {
    if (queue === undefined) {
        console.error("pop candidates from queue failed - queue not initialized");
        return;
    }
    if (peerConnection === undefined) {
        console.error("pop candidates from queue failed - peerConnection undefined");
        return;
    }
    for (const candidate of queue.queue) {
        if (peerConnection.connectionState == "connected"){
            console.error("pop candidates from queue ignored - peerConnection state is already connected");
            return;
        }
        console.log("popped an ICE candidate from queue");
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate.candidate));
    }
    queue.popped = true;
}
