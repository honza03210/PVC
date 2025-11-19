import {DragElement} from "./draggable";
import type {AppUI} from "./interaces/app-ui";
import {SetPanNodeParams, UpdatePannerNodeFromHtml} from "./p2p";
import {UIManager} from "./ui-manager";
import {DrawSoundVisualization} from "./visualization";

export async function AddSamplePlayer(id: string, username: string) {

    const audioCtx = UIManager.appUI.audioCtx;

    // Load the MP3
    const response = await fetch('/assets/low-quality-guitar-sample.mp3');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Create a buffer source
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;
    sourceNode.start();

    const sampleVideo = document.createElement("canvas");
    sampleVideo.classList.add("roomBound");
    sampleVideo.width = 256;
    sampleVideo.height = 128;
    sampleVideo.style.margin = "50px";
    let sampleVideoColor: string = "rgba(141,141,141, 0.05)"
    sampleVideo.id = "sampleVideo-" + id;

    if (UIManager.appUI.videoContainer) {
        UIManager.appUI.videoContainer.appendChild(sampleVideo);
    }

    let strokeColor = "rgb(255,113,0)";

    let sampleCharacterContainer = document.createElement("div");
    sampleCharacterContainer.style.position = "absolute";
    sampleCharacterContainer.style.top = "50%";
    sampleCharacterContainer.style.left = "50%";
    sampleCharacterContainer.id = "remotePlayerCharacter-" + id;
    sampleCharacterContainer.classList.add("roomBound");

    let nameLabel = document.createElement("div");
    nameLabel.textContent = username;
    console.log("Username: " + username);
    nameLabel.style.textAlign = "center";
    nameLabel.style.fontSize = "12px";
    nameLabel.style.color = strokeColor;
    nameLabel.style.fontWeight = "bold";
    sampleCharacterContainer.appendChild(nameLabel);

    let peerCharacter = document.createElement("canvas");
    peerCharacter.width = 30;
    peerCharacter.height = 30;
    peerCharacter.style.position = "absolute";
    peerCharacter.style.backgroundColor = strokeColor;

    sampleCharacterContainer.appendChild(peerCharacter);
    document.body.appendChild(sampleCharacterContainer);

    DragElement(sampleCharacterContainer, UIManager.appUI);

    let analyser = audioCtx.createAnalyser();
    let panNode = audioCtx.createPanner();
    SetPanNodeParams(panNode);


    UIManager.appUI.distanceFalloff.addEventListener("change", () => {
        panNode.refDistance = UIManager.appUI.distanceFalloff.valueAsNumber;
        panNode.maxDistance = UIManager.appUI.distanceFalloff.valueAsNumber
    });

    sourceNode.connect(panNode);


    panNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    let muted = false;
    sampleVideo.onclick = () => {
        if (muted) {
            console.log("unmuted");
            sampleVideoColor = "rgba(141,141,141, 0.05)"
            muted = false;
            analyser.connect(audioCtx.destination);
        } else {
            console.log("muted");
            sampleVideoColor = "rgba(255,0,0,0.28)"
            muted = true;
            analyser.disconnect(audioCtx.destination);
        }
    }

    let cancelButton = document.createElement("button");
    cancelButton.classList.add("menu-button", "roomBound");
    cancelButton.textContent = "Cancel the Sample";
    cancelButton.addEventListener("click", async () => {
        sourceNode.stop();
        sampleCharacterContainer.remove();
        sampleVideo.remove();
        cancelButton.remove();
        document.getElementById("main-menu")!.appendChild(UIManager.CreateSampleSoundButton());
    });

    document.getElementById("main-menu")!.appendChild(cancelButton);

    // analyser.connect(dest);

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let canvasCtx = sampleVideo.getContext("2d")!;
    const WIDTH = sampleVideo.width;
    const HEIGHT = sampleVideo.height;

    let canvasTexture: null = null;
    function draw() {
        DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, sampleVideoColor, strokeColor, bufferLength, canvasTexture);
        requestAnimationFrame(draw);
    }

    function updateAudioPosition(delta: DOMHighResTimeStamp, panner: PannerNode, id: string) {
        UpdatePannerNodeFromHtml(delta, panner, id);
        requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));
    }

    requestAnimationFrame((time) => draw());
    requestAnimationFrame((time) => updateAudioPosition(time, panNode, id));

}