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
    // Modify these values to get real player positions
    let x = 12;
    let z = 32;
    return `2d;${x.toPrecision(3)};0;${z.toPrecision(3)};0;0`;
}

let lastPositionSent = "";
let iframe = document.getElementById("voice-chat-overlay") as HTMLIFrameElement;
setInterval(sendPosition , 10);

