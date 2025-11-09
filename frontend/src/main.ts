import {roomJoin} from "./p2p.js";
import {type AppUI} from "./interaces/app-ui.js";
import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {DragElement} from "./draggable";

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
    await startup()
})

async function startup() {
    let uiManager = new UIManager();

    uiManager.PrefillFieldsFromUrl();

    // let wsPositions : WebSocket = connectPositions("ws://localhost:4242");
    let wsPositions: any;

    const peerConnections: { [key: string]: PeerConnection } = {}

    document.getElementById("main-menu")!.appendChild(createAudioInitButton(uiManager.appUI, peerConnections, wsPositions));
}



function createAudioInitButton(appUI: AppUI, peerConnections: { [key: string]: PeerConnection }, wsPositions: any): HTMLButtonElement {
    let audioButton = document.createElement("button");
    audioButton.innerText = "Initialize audio";

    audioButton.addEventListener("click", async () => {
        audioButton.remove();

        let audioCtx = appUI.audioCtx;

        document.addEventListener("click", async () => {
            if (audioCtx.state === "suspended") {
                await audioCtx.resume();
                console.log("AudioContext resumed");
            }
        });

        await navigator.mediaDevices
            .getUserMedia({
                audio: true,
            })
            .then(stream => {
                var microphone = audioCtx.createMediaStreamSource(stream);
                var analyser = audioCtx.createAnalyser();
                microphone.connect(analyser);
                analyser.fftSize = 512;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                requestAnimationFrame(draw);
                if (appUI.localAudio) {
                    appUI.localAudio.muted = true;
                }
                let canvasCtx = appUI.localVideo.getContext("2d")!;
                const WIDTH = 200;
                const HEIGHT = 100;

                function draw() {
                    requestAnimationFrame(draw);
                    canvasCtx.clearRect(-1, -1, WIDTH + 2, HEIGHT + 2);
                    analyser.getByteTimeDomainData(dataArray);
                    // Fill solid color
                    // canvasCtx.fillStyle = "rgba(0 0 0 0.1)";
                    //
                    // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                    // Begin the path
                    canvasCtx.lineWidth = 2;
                    canvasCtx.strokeStyle = "rgb(200 200 200)";
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
                }
            });

        const joinButton = createJoinButton(appUI, peerConnections, wsPositions);

        document.getElementById("main-menu")!.appendChild(joinButton);
    })
    return audioButton;
}

function createJoinButton(appUI: AppUI, peerConnections: { [key: string]: PeerConnection }, wsPositions:any): HTMLButtonElement {
    let joinButton = document.createElement("button");
    joinButton.innerText = "Join"
    joinButton.style.fontSize = "32";
    let supportsSharedWorkers: boolean
    try {
        new SharedWorker(
            URL.createObjectURL(new Blob([""], { type: "text/javascript" }))
        );
        supportsSharedWorkers = true;
    } catch (e) {
        supportsSharedWorkers = false;
    }

    joinButton.addEventListener('click', e => {
        joinButton.remove();
        console.log("Join initiated - Shared worker: " + supportsSharedWorkers);
        roomJoin(supportsSharedWorkers, peerConnections, appUI, wsPositions)
    });
    return joinButton;
}



