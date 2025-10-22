import { connectPositions } from "./ws-connect.js";
import {roomJoin} from "./p2p.js";
import { type AppUI } from "./interaces/app-ui.js";
// import {BindSignallingSocket} from "./bind-signalling.js";
// import {sign} from "node:crypto";

document.addEventListener("DOMContentLoaded", () : void => {startup()})

async function startup() {
    let urlParams : URLSearchParams = new URLSearchParams(window.location.search);

    console.log(urlParams.get("username") + " is trying to connect to room associated with server " + urlParams.get("server_id"));

    // let wsPositions : WebSocket = connectPositions("ws://localhost:4242");
    let wsPositions: any;

    const appUI : AppUI = {
        localVideo: document.getElementById('localVideo') as HTMLCanvasElement,
        localAudio: document.getElementById('localAudio') as HTMLAudioElement,
        nameInput: document.getElementById('name') as HTMLInputElement,
        passwordInput: document.getElementById("password") as HTMLInputElement,
        roomIDInput: document.getElementById("roomID") as HTMLInputElement,
        roomList: document.getElementById("roomList") as HTMLDivElement,
        errorMsgLabel: document.getElementById("errorMsg") as HTMLDivElement,
        videoContainer: document.getElementById("videoContainer") as HTMLDivElement,
    }
    const PeerConnections: {[key: string] : RTCPeerConnection} = {}

    let joined = false;

    const audioButton = document.createElement("button");

    audioButton.addEventListener("click", async () => {

        let audioCtx = new AudioContext()

        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

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
                    console.log("client audio viz drawBegin")
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
                }
            });

        //const SignallingSocket = BindSignallingSocket(appUI);
        // @ts-ignore
        document.querySelector('#join').addEventListener('click', e => {
            if (!joined) {
                joined = true;
                roomJoin(PeerConnections, appUI, wsPositions)
            }
        });
    })
    document.body.appendChild(audioButton);
}






