import {DragElement} from "./draggable";
import type {AppUI} from "./interaces/app-ui";
import {CreateSampleSoundButton, SetPanNodeParams} from "./p2p";

export async function AddSamplePlayer(id: string, appUI: AppUI, username: string) {

    const audioCtx = appUI.audioCtx;

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
    sampleVideo.width = 256;
    sampleVideo.height = 128;
    sampleVideo.style.margin = "50px";
    let sampleVideoColor: string = "rgba(141,141,141, 0.05)"
    sampleVideo.id = "sampleVideo-" + id;

    if (appUI.videoContainer) {
        appUI.videoContainer.appendChild(sampleVideo);
    }

    let sampleCharacterContainer = document.createElement("div");
    sampleCharacterContainer.style.position = "absolute";
    sampleCharacterContainer.style.top = "50%";
    sampleCharacterContainer.style.left = "50%";
    sampleCharacterContainer.id = "remotePlayerCharacter-" + id;

    let nameLabel = document.createElement("div");
    nameLabel.textContent = username;
    console.log("USERNAMMEEE: " + username);
    nameLabel.style.textAlign = "center";
    nameLabel.style.fontSize = "12px";
    nameLabel.style.color = "rgb(255,113,0)";
    nameLabel.style.fontWeight = "bold";
    sampleCharacterContainer.appendChild(nameLabel);

    let peerCharacter = document.createElement("canvas");
    peerCharacter.width = 30;
    peerCharacter.height = 30;
    peerCharacter.style.position = "absolute";
    peerCharacter.style.backgroundColor = "rgb(255,113,0)";

    sampleCharacterContainer.appendChild(peerCharacter);
    document.body.appendChild(sampleCharacterContainer);

    DragElement(sampleCharacterContainer, appUI);

    let analyser = audioCtx.createAnalyser();
    let panNode = audioCtx.createPanner();
    SetPanNodeParams(panNode);


    appUI.distanceFalloff.addEventListener("change", () => {
        panNode.refDistance = appUI.distanceFalloff.valueAsNumber;
        panNode.maxDistance = appUI.distanceFalloff.valueAsNumber
    });

    sourceNode.connect(panNode);


    panNode.connect(analyser);
    // const dest = audioCtx.createMediaStreamDestination();
    // console.log("AAAAAAAAAAAAAAAAAAAAAAAA", dest)
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
    cancelButton.classList.add("menu-button");
    cancelButton.textContent = "Cancel the Sample";
    cancelButton.addEventListener("click", async () => {
        sourceNode.stop();
        sampleCharacterContainer.remove();
        sampleVideo.remove();
        cancelButton.remove();
        document.getElementById("main-menu")!.appendChild(CreateSampleSoundButton(appUI));
    });

    document.getElementById("main-menu")!.appendChild(cancelButton);

    // analyser.connect(dest);

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let canvasCtx = sampleVideo.getContext("2d")!;
    const WIDTH = sampleVideo.width;
    const HEIGHT = sampleVideo.height;

    function draw() {
        canvasCtx.clearRect(-1, -1, WIDTH + 2, HEIGHT + 2);
        analyser.getByteTimeDomainData(dataArray);
        // Fill solid color
        canvasCtx.fillStyle = sampleVideoColor;
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        // Begin the path
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(255,113,0)";
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