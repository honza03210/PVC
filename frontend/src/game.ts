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
    let x = parseFloat(char.style.left.split("%")[0]) / 100 - 0.5;
    let z = parseFloat(char.style.top.split("%")[0]) / 100 - 0.5;
    return `2d;${x.toPrecision(3)};0;${z.toPrecision(3)};0;0`;
}

let once = true;
let lastPositionSent = "";
let iframe = document.getElementById("voice-chat-overlay") as HTMLIFrameElement;

window.addEventListener("message", async (event) => {
    let data = event.data.split(";");
    //console.log("message from iframe");

    // this will be handled and bound upon data channel creation with every peer
    if (data[0] == "GAME_EVENT") {

    } else if (data[0] == "SERVER_EVENT") {
        //console.log(data[1], data);
        switch (data[1]) {
            case "PLAYER_JOIN":
                let l = document.createElement("div");
                l.textContent = data;
                l.style.backgroundColor = "white";
                l.style.position = "absolute";
                l.style.width = '2vw';
                l.style.height = '2vw';
                l.classList.add(`user-${data[3]}`);
                document.body.appendChild(l);
                break;
            case "PLAYER_LEFT":
                for (const node of document.querySelectorAll(`.user-${data[2]}`)) {
                    node.remove()
                }
                break;
            case "POSITION":
                document.body.querySelectorAll(`.user-${data[2]}`).forEach((element: Element) => {
                    element.textContent = "";
                    if (element instanceof HTMLDivElement) {
                        element.style.left = (parseFloat(data[3]) + 0.5) * 100 + "%";
                        element.style.top = (parseFloat(data[5]) + 0.5) * 100 + "%";
                    }
                });
                break;
            default:
                console.log("Unknown event type from iframe: ", data);
                break;
        }
    }

})

let char = Create2DPlayerCharacter("You");
document.body.append(char);

setInterval(sendPosition, 10);
setInterval(() => iframe.contentWindow!.postMessage("SERVER_EVENT;SEND_PEER_POSITIONS;true", "*"), 5000);

