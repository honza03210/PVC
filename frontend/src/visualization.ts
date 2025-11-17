import {DragElement} from "./draggable";
import {UIManager} from "./ui-manager";
import {PlayerMovementInit} from "./player-char-movement";
import "aframe";

export function InitPlayerCharacter() {
    if (document.getElementById("aFrameScene")?.style.display == "none") {
        Init2DPlayerCharacter();
    } else {
        //AddCharacter("USER", "You", UIManager.UIManager.appUI);
    }
}

export function BindStreamAnimation(stream: MediaStream, audioCtx: AudioContext) {
    var microphone = audioCtx.createMediaStreamSource(stream);
    var analyser = audioCtx.createAnalyser();
    microphone.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    if (UIManager.appUI.localAudio) {
        UIManager.appUI.localAudio.muted = true;
    }
    let canvasCtx = UIManager.appUI.localVideo.getContext("2d")!;
    UIManager.appUI.localVideo.width = 200;
    UIManager.appUI.localVideo.height = 100;
    UIManager.appUI.localVideo.style.margin = "50px";
    const WIDTH = UIManager.appUI.localVideo.width;
    const HEIGHT = UIManager.appUI.localVideo.height;

    let backgroundColor = 'rgba(255, 255, 255, 0.1)'
    let strokeColor = 'rgba(255, 255, 255, 0.8)'
    let canvasTexture : null = null;
    function draw() {
        DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, backgroundColor, strokeColor, bufferLength, canvasTexture);
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}

export function DrawSoundVisualization(canvasCtx: CanvasRenderingContext2D, WIDTH: number, HEIGHT: number, analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>, remoteVideoColor: string, remoteVideoStroke: string, bufferLength: number, canvasTexture: any) {
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

    canvasCtx.lineTo(WIDTH, HEIGHT / 2);
    canvasCtx.stroke();
    if (canvasTexture !== null){
        canvasTexture.needsUpdate = true;
    }
}

export function Init2DPlayerCharacter(){
    let clientCharacterContainer = document.createElement("div");
    clientCharacterContainer.style.position = "absolute";
    clientCharacterContainer.style.top = "75%";
    clientCharacterContainer.style.left = "50%";
    clientCharacterContainer.id = "playerCharacter";

    let nameLabel = document.createElement("div");
    nameLabel.textContent = UIManager.appUI.nameInput.value;
    nameLabel.style.textAlign = "center";
    nameLabel.style.fontSize = "12px";
    nameLabel.style.color = "orange";
    nameLabel.style.fontWeight = "bold";
    clientCharacterContainer.appendChild(nameLabel);

    let clientCharacter = document.createElement("canvas");
    clientCharacter.id = "playerCharacterCanvas";
    clientCharacter.width = 30;
    clientCharacter.height = 30;
    clientCharacter.style.position = "absolute";
    clientCharacter.style.backgroundColor = "blue";
    clientCharacter.style.border = "3px solid orange";

    clientCharacterContainer.appendChild(clientCharacter);

    document.getElementById("container")!.appendChild(clientCharacterContainer);

    DragElement(clientCharacterContainer, UIManager.appUI);

    PlayerMovementInit();
}


export function AddCharacter(id: string, username: string) {
    console.log("Adding char for id: ", id);
    if (document.getElementById("aFrameScene")?.style.display != "none") {
        let playerBox = document.createElement("a-sphere");
        playerBox.setAttribute("id", "player-" + id);
        playerBox.setAttribute("position", {x: 0, y: Math.random() * 100 % 5, z: -2})
        playerBox.setAttribute('color', StringToColor(id));
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
        nameLabel.style.color = StringToColor(id);
        nameLabel.style.fontWeight = "bold";
        peerCharacterContainer.appendChild(nameLabel);

        let peerCharacter = document.createElement("canvas");
        peerCharacter.width = 30;
        peerCharacter.height = 30;
        peerCharacter.style.position = "absolute";
        peerCharacter.style.backgroundColor = StringToColor(id);

        peerCharacterContainer.appendChild(peerCharacter);
        document.body.appendChild(peerCharacterContainer);

        DragElement(peerCharacterContainer, UIManager.appUI);
    }
}


export function Init3D(wspositions: WebSocket | null) {
    let scene = document.getElementById("aFrameScene");
    if (scene) {
        scene.style.display = "block";
        scene.style.zIndex = "-1";
    }
    console.log("loaded 3D");
}

export function StringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = 128 + (hash & 0x7F);
    const g = 128 + ((hash >> 8) & 0x7F);
    const b = 128 + ((hash >> 16) & 0x7F);

    return `rgb(${r}, ${g}, ${b})`;
}
