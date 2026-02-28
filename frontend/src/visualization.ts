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
    UIManager.appUI.localVideo.width = 128;
    UIManager.appUI.localVideo.height = 128;
    // UIManager.appUI.localVideo.style.margin = "50px";
    UIManager.appUI.localVideo.style.borderRadius = "50%";
    UIManager.appUI.audioMenu.style.display = "block";
    const WIDTH = UIManager.appUI.localVideo.width;
    const HEIGHT = UIManager.appUI.localVideo.height;

    let backgroundColor = 'rgba(255, 255, 255, 0.1)'
    let strokeColor = 'rgba(255, 255, 255, 0.8)'

    function draw() {
        DrawSoundVisualization(canvasCtx, WIDTH, HEIGHT, analyser, dataArray, backgroundColor, strokeColor, bufferLength, null);
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

// (not anymore) code from https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
// with minor changes
export function DrawSoundVisualization(canvasCtx: CanvasRenderingContext2D, WIDTH: number, HEIGHT: number, analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>, remoteVideoColor: string, remoteVideoStroke: string, bufferLength: number, name: string | null) : boolean{
    if (!CanvasRenderingContext2D) {
        return false;
    }
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, WIDTH, WIDTH);
    let color = StringToColor(name??"o");
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const baseRadius = HEIGHT / 3;
    const barCount = dataArray.length;

    for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        let cos = Math.cos(angle);
        if (name && cos > Math.PI / 4 && cos < Math.PI * 3 / 4) continue;
        const value = 0.1 + convolutionAverageAroundIndex(dataArray, i, 1);

        const barHeight = value * 32;

        const innerX = cx + baseRadius * Math.cos(angle);
        const innerY = cy + baseRadius * Math.sin(angle);

        const outerX = cx + (baseRadius + barHeight) * Math.cos(angle);
        const outerY = cy + (baseRadius + barHeight) * Math.sin(angle);

        canvasCtx.beginPath();
        canvasCtx.moveTo(innerX, innerY);
        canvasCtx.lineTo(outerX, outerY);
        canvasCtx.strokeStyle = color;
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    }

    if (name) {
        canvasCtx.fillStyle = color;
        canvasCtx.font = "bold 20px sans-serif";
        canvasCtx.textAlign = "left";
        canvasCtx.textBaseline = "middle";

        canvasCtx.fillText(name.slice(0, 10), cx - 20, cy);
    }
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

export function convolutionAverageAroundIndex(data: Uint8Array<ArrayBuffer>, index: number, halfSize: number) {
    let sum = data[index];
    for (let i = 1; i <= halfSize; i++) {
        sum += data[(index + i + data.length) % data.length] + data[(index - i + data.length) % data.length];
    }
    return sum / (255 * (2 * halfSize + 1));
}