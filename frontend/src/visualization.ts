import {UIManager} from "./ui-manager";


/**
 * Binds the sound visualization for the local user
 * @param stream
 * @constructor
 */
export function BindStreamAnimation(stream: MediaStream) {
    let audioCtx = UIManager.appUI.audioCtx;
    let microphone = audioCtx!.createMediaStreamSource(stream);
    let analyser = audioCtx!.createAnalyser();
    microphone.connect(analyser);

    // Audio visualization from https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
    // TODO: create a custom one
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    if (UIManager.appUI.localAudio) {
        UIManager.appUI.localAudio.muted = true;
    }
    let canvasCtx = UIManager.appUI.localVideo.getContext("2d")!;
    UIManager.appUI.localVideo.width = 256;
    UIManager.appUI.localVideo.height = 128;
    UIManager.appUI.localVideo.style.margin = "50px";
    const WIDTH = UIManager.appUI.localVideo.width;
    const HEIGHT = UIManager.appUI.localVideo.height;

    let backgroundColor = 'rgba(255, 255, 255, 0.1)'
    let strokeColor = 'rgba(255, 255, 255, 0.8)'

    function draw() {
        DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, backgroundColor, strokeColor, bufferLength);
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}


/**
 *
 * @param canvasCtx
 * @param WIDTH
 * @param HEIGHT
 * @param analyser
 * @param dataArray
 * @param remoteVideoColor
 * @param remoteVideoStroke
 * @param bufferLength
 * @constructor
 */

// code from https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
// with minor changes
// TODO: Create a custom one
export function DrawSoundVisualization(canvasCtx: CanvasRenderingContext2D, WIDTH: number, HEIGHT: number, analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>, remoteVideoColor: string, remoteVideoStroke: string, bufferLength: number) : boolean{
    if (!CanvasRenderingContext2D) {
        return false;
    }
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
    return true;
}

/**
 * takes a string, creates a simple hash and deterministically returns "rgb(x, y, z)" for the select string
 * @param str
 * @constructor
 */
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
