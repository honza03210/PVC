import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {connectPositions} from "./ws-connect";

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
    UIManager.Initialize();
    await startup();
})

async function startup() {
    let positionsSocket: WebSocket | null = null;
    try {
        positionsSocket = connectPositions("ws://localhost:4242");
    } catch (error) {
        console.error("Failed to connect to a websocket connection for the positions feed");
    }

    const peerConnections: { [key: string]: PeerConnection } = {};

    let audioCtx = UIManager.appUI.audioCtx;

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
            if (UIManager.appUI.localAudio) {
                UIManager.appUI.localAudio.muted = true;
            }
            let canvasCtx = UIManager.appUI.localVideo.getContext("2d")!;
            UIManager.appUI.localVideo.width = 200;
            UIManager.appUI.localVideo.height = 100;
            UIManager.appUI.localVideo.style.margin = "50px";
            const WIDTH = UIManager.appUI.localVideo.width;
            const HEIGHT = UIManager.appUI.localVideo.height;

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

    const joinButton = UIManager.CreateJoinButton(peerConnections, positionsSocket);
    const init3DButton = UIManager.Create3DInitButton(positionsSocket);
    //document.getElementById("main-menu")!.append(init3DButton);

    document.getElementById("main-menu")!.append(init3DButton, joinButton);

    UIManager.PrefillFieldsFromUrl(joinButton);
    //document.getElementById("main-menu")!.appendChild(createAudioInitButton(uiManager.appUI, peerConnections, positionsSocket));
}



