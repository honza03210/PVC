import {io} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";
import {PeerConnection} from "./peer-connection.js";
import {Signalling} from "./signalling";
import {UIManager} from "./ui-manager";
import 'aframe';
import {DrawSoundVisualization, InitPlayerCharacter, StringToColor} from "./visualization";
import {ClientPositions, Position} from "./client-positions";

export function RoomJoin(signalling: Signalling, peerConnections: {
    [p: string]: PeerConnection
}, peerPositions: {[p: string]: Position}, positionsSocket: ClientPositions) {
    console.log("roomJoin");

    InitPlayerCharacter();

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    signalling.BindEvents(IceCandidateQueue, peerConnections, peerPositions, positionsSocket);

    signalling.Send({
        payload: {
            roomId: UIManager.appUI.roomIDInput.value != "" ? UIManager.appUI.roomIDInput.value : `room-${Math.random().toString(36).substring(2, 10)}`,
            name: UIManager.appUI.nameInput.value != "" ? UIManager.appUI.nameInput.value : `user-${Math.random().toString(36).substring(2, 10)}`,
            password: UIManager.appUI.passwordInput.value
        }, type: "join"
    });
    console.log("join posted");
    const sampleSoundButton = UIManager.CreateSampleSoundButton();
    document.getElementById("main-menu")?.appendChild(sampleSoundButton);
}

export function HandleNewReceivedStream(stream: MediaStream, remoteAudio: HTMLAudioElement, remoteVideo: HTMLCanvasElement, id: string, clientPositions: ClientPositions, peerPosition: Position) {
    if (remoteAudio) {
        remoteAudio.muted = true;
        remoteAudio.srcObject = stream;
    }
    let audioCtx = UIManager.appUI.audioCtx;
    let microphone = audioCtx.createMediaStreamSource(stream);
    let analyser = audioCtx.createAnalyser();
    let panNode = audioCtx.createPanner();

    SetPanNodeParams(panNode);

    UIManager.appUI.distanceFalloff.addEventListener("change", () => {
        panNode.refDistance = UIManager.appUI.distanceFalloff.valueAsNumber;
        panNode.maxDistance = UIManager.appUI.distanceFalloff.valueAsNumber * 10;
    });

    microphone.connect(panNode);
    panNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    let remoteVideoColor: string = "rgba(141,141,141, 0.05)";
    let remoteVideoStroke: string = StringToColor(id);

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
        if (DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, remoteVideoColor, remoteVideoStroke, bufferLength, canvasTexture)){
            requestAnimationFrame(draw);
        }
    }
    function updateAudioPosition(delta: DOMHighResTimeStamp, panner: PannerNode, id: string) {
        if (UpdatePannerNodeFromHtml(delta, panNode, id, clientPositions, peerPosition)) {
            requestAnimationFrame((time) => updateAudioPosition(time, panNode, id))
        }
    }
    requestAnimationFrame(draw);
    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));


    const boxEl = document.getElementById('player-' + id);
    if (boxEl !== null) {
        // @ts-ignore
        boxEl!.getObject3D('mesh').material.map = canvasTexture;
        // @ts-ignore
        boxEl!.getObject3D('mesh').material.needsUpdate = true;
    }
}

export function UpdatePannerNodeFromHtml(delta : DOMHighResTimeStamp, panner : PannerNode, id: string, clientPosition : ClientPositions, peerPosition: Position) : boolean{
    // TODO: Move all of this logic into the client and peer Positions - no need to have an intermediary in HTML elements
    // ******************
    if (UIManager.Is3DOn()) {
        console.log()
    } else {
        let remoteChar = document.getElementById("remotePlayerCharacter-" + id);
        let localChar = document.getElementById("playerCharacter");
        if (!localChar || !remoteChar) {
            console.log("no peer char or local char");
            return false;
        }
        let lCPositions = {
            x: parseFloat(localChar.style.left) / 100 * window.innerWidth,
            y: parseFloat(localChar.style.top) / 100 * window.innerHeight
        };
        let rCPositions = {
            x: parseFloat(remoteChar.style.left) / 100 * window.innerWidth,
            y: parseFloat(remoteChar.style.top) / 100 * window.innerHeight
        };

        panner.positionX.value = (rCPositions.x - lCPositions.x) / 100;
        panner.positionZ.value = (rCPositions.y - lCPositions.y) / 100;

        console.log("x: " + (rCPositions.x - lCPositions.x) / 100 + " y: " + (rCPositions.y - lCPositions.y) / 100);
    }
    // ********************
    return true;
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
