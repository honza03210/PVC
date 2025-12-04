import {Create2DPlayerCharacter} from "./player-char-movement";

/**
 * Sends the current player position to the voice chat iframe if it differs from the last sent
 */
async function sendPosition() {
        let position = getPlayerPosition();
        if (position == lastPositionSent) {
            return;
        }
        lastPositionSent = position;
        iframe.contentWindow!.postMessage(position, "*");
}

/**
 * Gets the players position in the "format;x;y;z;pitch;yaw" format
 */
function getPlayerPosition(): string {
    let z = parseFloat(char.style.top.split("%")[0]) / 100 - 0.5;
    let x = parseFloat(char.style.left.split("%")[0]) / 100 - 0.5;
    return `2d;${x.toPrecision(3)};${z.toPrecision(3)};0;0;0`;
}


let lastPositionSent = "";
let iframe = document.getElementById("voice-chat-overlay") as HTMLIFrameElement;
let char = Create2DPlayerCharacter("You");
document.body.append(char);

setInterval(sendPosition, 100);


