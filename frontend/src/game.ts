import {Create2DPlayerCharacter} from "./player-char-movement";

async function loop() {
        let position = getPlayerPosition();
        if (position == lastPositionSent) {
            return;
        }
        lastPositionSent = position;
        consoleElem!.textContent += position + "\n";
        consoleElem!.scrollTop = consoleElem!.scrollHeight;
        iframe.contentWindow!.postMessage(position, "*");
}

let consoleElem = document.getElementById("console");
let lastPositionSent = "";
let iframe = document.getElementById("voice-chat-overlay") as HTMLIFrameElement;
let char = Create2DPlayerCharacter("You");
setInterval(loop, 100);
document.body.append(char);

function getPlayerPosition(): string {
    let z = parseFloat(char.style.top.split("%")[0]) / 100 - 0.5;
    let x = parseFloat(char.style.left.split("%")[0]) / 100 - 0.5;
    return `2d;${x.toPrecision(3)};${z.toPrecision(3)};0;0;0`;
}

