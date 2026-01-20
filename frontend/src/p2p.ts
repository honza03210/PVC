import {PeerConnection} from "./peer-connection.js";
import {Signalling} from "./signalling";
import {UIManager} from "./ui-manager";
import {DrawSoundVisualization, StringToColor} from "./visualization";
import {ClientPositions, Position} from "./client-positions";

export function RoomJoin(signalling: Signalling, peerConnections: {
    [p: string]: PeerConnection
}, peerPositions: {[p: string]: Position}, positionsSocket: ClientPositions) {
    console.log("roomJoin");

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    signalling.BindEvents(IceCandidateQueue, peerConnections, peerPositions, positionsSocket);

    signalling.Send({
        payload: {
            roomId: UIManager.appUI.roomIDInput.value,
            name: UIManager.appUI.nameInput.value != "" ? UIManager.appUI.nameInput.value : `user-${Math.random().toString(36).substring(2, 10)}`,
            password: UIManager.appUI.passwordInput.value
        }, type: "join"
    });

    console.log("join posted");
}

export function HandleNewReceivedStream(stream: MediaStream, remoteAudio: HTMLAudioElement, remoteVideo: HTMLCanvasElement, id: string, clientPositions: ClientPositions, peerPositions: {[p: string]: Position}) {
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
        console.log("changed distance to:", panNode.refDistance, panNode.maxDistance);
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
    const WIDTH = remoteVideo.width;
    const HEIGHT = remoteVideo.height;
    function draw() {
        if (DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, remoteVideoColor, remoteVideoStroke, bufferLength)){
            requestAnimationFrame(draw);
        }
    }

    setInterval(UpdatePannerNodeFromPositions, 50, panNode, clientPositions, peerPositions, id)
    requestAnimationFrame(draw);
}

export function UpdatePannerNodeFromPositions(panner: PannerNode, clientPositions: ClientPositions, peerPositions: {[p: string]: Position}, id: string) {

    if (!peerPositions[id]){
        return;
    }
    // there could be some interpolation at the cost of latency
    panner.positionX.value = (peerPositions[id].x - clientPositions.x);
    panner.positionY.value = (peerPositions[id].y - clientPositions.y);
    panner.positionZ.value = (peerPositions[id].z - clientPositions.z);
    // panner.positionX.value = (!Number.isNaN(peerPositions[id].x - clientPositions.x)) ? (peerPositions[id].x - clientPositions.x) : 0;
    // panner.positionY.value = (!Number.isNaN(peerPositions[id].y - clientPositions.y)) ? (peerPositions[id].y - clientPositions.y) : 0;
    // panner.positionZ.value = (!Number.isNaN(peerPositions[id].z - clientPositions.z)) ? (peerPositions[id].z - clientPositions.z) : 0;
    panner.orientationX.value = (!Number.isNaN(clientPositions.heading.x)) ? clientPositions.heading.x : 0;
    panner.orientationY.value = (!Number.isNaN(clientPositions.heading.y)) ? clientPositions.heading.y : 0;
    panner.orientationZ.value = (!Number.isNaN(clientPositions.heading.z)) ? clientPositions.heading.z : 0;
    console.log(panner);

}

export function SetPanNodeParams(panNode: PannerNode) {
    panNode.panningModel = "HRTF";
    panNode.distanceModel = "linear";
    panNode.refDistance = 1;
    panNode.maxDistance = 10;
    panNode.rolloffFactor = 1;
    panNode.coneInnerAngle = 360;
    panNode.coneOuterAngle = 360;
    panNode.coneOuterGain = 1;
}

export async function HandleUserDisconnect(userID: string, peerConnections: {[key: string] : PeerConnection}, clientPositions: ClientPositions | null) {
    document.getElementById("remoteVideo-" + userID)?.remove();
    document.getElementById("remoteAudio-" + userID)?.remove();
    peerConnections[userID].close();
    clientPositions?.SendServerEvent(`PLAYER_LEFT;${userID}`);
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
