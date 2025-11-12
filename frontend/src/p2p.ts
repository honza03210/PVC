import {type AppUI} from "./interaces/app-ui.js";
import {DragElement} from "./draggable.js";
import {AddSamplePlayer} from "./add-sample-player.js";
import {io, Socket} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";
import {Init2DPlayerCharacter} from "./player-char-movement.js";
import {PeerConnection} from "./peer-connection.js";
import {Signalling} from "./signalling";
import 'aframe';
import {THREE} from "aframe";

export function SignallingSend(signalling: Socket | MessagePort, message: any){
    if ("emit" in signalling) {
        signalling.emit(message.type, message.payload);
    } else if ("postMessage" in signalling) {
        signalling.postMessage({message: message.payload, type: message.type});
    } else {
        console.error("signalling object can't emit or postMessage");
    }
}

function InitPlayerCharacter(appUI: AppUI){
    if (document.getElementById("aFrameScene")?.style.display == "none") {
        Init2DPlayerCharacter(appUI);
    } else {
        //AddCharacter("USER", "You", appUI);
    }
}



export function RoomJoin(isMobile: boolean, peerConnections: {[key: string] : PeerConnection}, appUI: AppUI, wsPositions: WebSocket) {
    console.log("roomJoin");

    InitPlayerCharacter(appUI);

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    let comm;

    if (isMobile) {
        comm = io(ServerConfig.url, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

    } else {
        const worker = new SharedWorker(new URL('/src/shared-signalling-worker.ts', import.meta.url), {type: "module"});
        console.log("worker " + worker);
        comm = worker.port;

        comm.start();
        console.log("port " + comm + " ; ");
    }
    let signalling: Signalling = new Signalling(comm);

    signalling.BindEvents(appUI, IceCandidateQueue, peerConnections, wsPositions);

    signalling.Send({
        payload: {
            roomId: appUI.roomIDInput.value != "" ? appUI.roomIDInput.value : `room-${Math.random().toString(36).substring(2, 10)}`,
            name: appUI.nameInput.value != "" ? appUI.nameInput.value : `user-${Math.random().toString(36).substring(2, 10)}`,
            password: appUI.passwordInput.value
        }, type: "join"
    });
    console.log("join posted");
    const sampleSoundButton = CreateSampleSoundButton(appUI);
    document.getElementById("main-menu")?.appendChild(sampleSoundButton);
}

export function CreateSampleSoundButton(appUI: AppUI) {
    let sampleSoundButton = document.createElement("button");
    sampleSoundButton.innerText = "Add a sample VC member";
    sampleSoundButton.classList.add("menu-button");
    sampleSoundButton.style.fontSize = "32";

    sampleSoundButton.addEventListener('click', async e => {
        await AddSamplePlayer("0", appUI, "Sample");
        sampleSoundButton.remove();
    });
    return sampleSoundButton;
}

export function AddCharacter(id: string, username: string, appUI: AppUI){
    console.log("Adding char for id: ", id);
    if (document.getElementById("aFrameScene")?.style.display != "none") {
        let playerBox = document.createElement("a-box");
        playerBox.setAttribute("id", "player-" + id);
        playerBox.setAttribute("position", {x: 0, y: Math.random() * 100 % 5, z: -2})
        playerBox.setAttribute('color', stringToColor(id));
        let scene = document.getElementById("aFrameScene");
        scene?.append(playerBox);
    } else {
        let peerCharacterContainer = document.createElement("div");
        peerCharacterContainer.style.position = "absolute";
        peerCharacterContainer.style.zIndex = "2";
        peerCharacterContainer.style.top = "50%";
        peerCharacterContainer.style.left = "50%";
        peerCharacterContainer.id = "remotePlayerCharacter-" + id;

        let nameLabel = document.createElement("div");
        nameLabel.textContent = username;
        console.log("USERNAMMEEE: " + username);
        nameLabel.style.textAlign = "center";
        nameLabel.style.fontSize = "12px";
        nameLabel.style.color = stringToColor(id);
        nameLabel.style.fontWeight = "bold";
        peerCharacterContainer.appendChild(nameLabel);

        let peerCharacter = document.createElement("canvas");
        peerCharacter.width = 30;
        peerCharacter.height = 30;
        peerCharacter.style.position = "absolute";
        peerCharacter.style.backgroundColor = stringToColor(id);

        peerCharacterContainer.appendChild(peerCharacter);
        document.body.appendChild(peerCharacterContainer);

        DragElement(peerCharacterContainer, appUI);
    }
}

export function Init3D(appUI: AppUI, wspositions: any) {
    let scene = document.getElementById("aFrameScene");
    if (scene) {
        scene.style.display = "block";
        scene.style.zIndex = "-1";
    }
    console.log("loaded 3D");
}

export async function InitPC(signalling: Signalling, id : string, peerConnections: {[key: string] : PeerConnection}, appUI: AppUI, wsPositions: WebSocket, offer: boolean, username: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection: PeerConnection = new PeerConnection({...signalling.IceServers, iceTransportPolicy: "all"});

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
        remoteVideo.width = 200;
        remoteVideo.height = 100;
        remoteVideo.style.margin = "50px";

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

        AddCharacter(id, username, appUI);

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
                signalling.Send({payload: {dest: id, candidate: {candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                    usernameFragment: (e.candidate as any).usernameFragment,}}, type: "candidate"})
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

function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = 128 + (hash & 0x7F);
    const g = 128 + ((hash >> 8) & 0x7F);
    const b = 128 + ((hash >> 16) & 0x7F);

    return `rgb(${r}, ${g}, ${b})`;
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
        panNode.maxDistance = appUI.distanceFalloff.valueAsNumber * 10;
    });

    microphone.connect(panNode);
    panNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    let remoteVideoColor: string = "rgba(141,141,141, 0.05)";
    let remoteVideoStroke: string = stringToColor(id);

    let muted = false;

    remoteVideo.onclick = () => {
        if (muted) {
            console.log("unmuted");
            remoteVideoColor = "rgba(141,141,141, 0.05)";
            muted = false;
            analyser.connect(audioCtx.destination);
        } else {
            console.log("muted");
            remoteVideoColor = "rgba(255,0,0,0.28)";
            muted = true;
            analyser.disconnect(audioCtx.destination);
        }
    }

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let canvasCtx = remoteVideo.getContext("2d")!;
    const canvasTexture = new AFRAME.THREE.CanvasTexture(remoteVideo);
    const WIDTH = remoteVideo.width;
    const HEIGHT = remoteVideo.height;
    function draw() {
        canvasCtx.clearRect(-1, -1, WIDTH + 2, HEIGHT + 2);
        analyser.getByteTimeDomainData(dataArray);
        // Fill solid color
        canvasCtx.fillStyle = remoteVideoColor;
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        // Begin the path
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = remoteVideoStroke;
        canvasCtx.beginPath();
        // Draw each point in the waveform
        const sliceWidth = WIDTH / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]! / 128.0;
            const y = v * (HEIGHT / 2);

            if (i === 0) {
                canvasCtx.moveTo(Math.min(Math.max(x, 0), WIDTH - 1), Math.min(Math.max(y, 0), HEIGHT - 1));
            } else {
                canvasCtx.lineTo(Math.min(Math.max(x, 0), WIDTH - 1), Math.min(Math.max(y, 0), HEIGHT - 1));
            }

            x += sliceWidth;
        }

        // Finish the line
        canvasCtx.lineTo(WIDTH, HEIGHT / 2);
        canvasCtx.stroke();
        canvasTexture.needsUpdate = true;
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
    requestAnimationFrame(draw);
    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));

    const boxEl = document.getElementById('player-' + id);
    // @ts-ignore
    boxEl!.getObject3D('mesh').material.map = canvasTexture;
    // @ts-ignore
    boxEl!.getObject3D('mesh').material.needsUpdate = true;
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

export async function HandleUserDisconnect(userID: string, peerConnections: {[key: string] : PeerConnection}){
    document.getElementById("remotePlayerCharacter-" + userID)?.remove();
    document.getElementById("remoteVideo-" + userID)?.remove();
    document.getElementById("remoteAudio-" + userID)?.remove();
    peerConnections[userID].close();
    delete peerConnections[userID];
}

export function BindDataChannel(appUI: AppUI, dc: RTCDataChannel, id: string) {
    dc.onopen = () => {
        function sendPos() {
            setTimeout(()=>{
                if (document.getElementById("aFrameScene")?.style.display == "none") {
                    let char = document.getElementById("playerCharacter");
                    dc.send(new URLSearchParams({top: char!.style.top, left: char!.style.left}).toString());
                } else {
                    const playerPosition: any = document.querySelector('[camera]')!.getAttribute("position");
                    console.log("Sent 3D object position", `${playerPosition!.x} ${playerPosition!.y} ${playerPosition!.z}`);
                    dc.send(`${playerPosition!.x} ${playerPosition!.y} ${playerPosition!.z}`);
                }
                sendPos()
            }, 10)
        }
        sendPos();
    };
    dc.onmessage = (event: { data: any }) => {
        if (appUI.manualPositions.checked) return;
        if (document.getElementById("aFrameScene")?.style.display == "none") {
            let char = document.getElementById("remotePlayerCharacter-" + id);
            let data = Object.fromEntries(new URLSearchParams(event.data));
            char!.style.top = data.top!;
            char!.style.left = data.left!;
        } else {
            let char : any = document.getElementById("player-" + id);
            console.log("Got 3D object position", event.data);
            char.setAttribute("position", event.data);
        }
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
