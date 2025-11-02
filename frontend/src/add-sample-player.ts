import {DragElement} from "./draggable";
import type {AppUI} from "./interaces/app-ui";

export async function AddSamplePlayer(id : string, appUI: AppUI, username: string) {

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
    nameLabel.style.color = "green";
    nameLabel.style.fontWeight = "bold";
    sampleCharacterContainer.appendChild(nameLabel);

    let peerCharacter = document.createElement("canvas");
    peerCharacter.width = 30;
    peerCharacter.height = 30;
    peerCharacter.style.position = "absolute";
    peerCharacter.style.backgroundColor = "green";

    sampleCharacterContainer.appendChild(peerCharacter);
    document.body.appendChild(sampleCharacterContainer);

    DragElement(sampleCharacterContainer, appUI);

        let analyser = audioCtx.createAnalyser();
        let panNode = audioCtx.createPanner();
        panNode.panningModel = "equalpower";
        panNode.distanceModel = "linear";
        panNode.refDistance = 5;
        panNode.maxDistance = 500;
        panNode.rolloffFactor = 1;
        panNode.coneInnerAngle = 360;
        panNode.coneOuterAngle = 360;
        panNode.coneOuterGain = 1;


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
                muted = false;
                analyser.connect(audioCtx.destination);
            } else {
                console.log("muted");
                muted = true;
                analyser.disconnect(audioCtx.destination);
            }
        }
        // analyser.connect(dest);

        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let canvasCtx = sampleVideo.getContext("2d")!;
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