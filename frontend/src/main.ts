import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {ClientPositions, Position} from "./client-positions";
import * as jdenticon from "jdenticon"
import {Signaling} from "./signaling";
import {BindStreamAnimation} from "./visualization";

/**
 * Entry file for the main voice chat client page
 * TODO: Cluttered mess -> Rewrite
 */


UIManager.Initialize();

const urlParams = new URLSearchParams(window.location.search);

let clientPositions = new ClientPositions(urlParams.get("websocket_address") ?? "ws://localhost:4242");

if (urlParams.get("user_token") != null && clientPositions.communicator instanceof WebSocket) {
    console.log("token sending", clientPositions.communicator);
    if (clientPositions.communicator.readyState === WebSocket.OPEN) {
        clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")}));
    } else {
        clientPositions.communicator.addEventListener("open", () => clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")})), {once: true});
    }

    console.log("token sent");
} else {
    console.log("token not sent");
}

if (urlParams.get("pfp_url") != null) {
    UIManager.pfpUrl = urlParams.get("pfp_url")!;
    const pfp = document.createElement("img");
    pfp.classList.add("pfp");
    pfp.height = 64;
    pfp.width = 64;
    pfp.src = UIManager.pfpUrl;
    UIManager.appUI.audioMenu.append(pfp);
} else {
    const pfp: SVGSVGElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    pfp.classList.add("pfp");
    pfp.setAttribute("width", "70");
    pfp.setAttribute("height", "70");

    pfp.style.borderRadius = "50%";
    pfp.style.overflow = "hidden";

    UIManager.appUI.audioMenu.append(pfp);

    jdenticon.update(pfp, UIManager.appUI.nameInput.value);

    UIManager.appUI.nameInput.onchange = (e) => {
        jdenticon.update(pfp, UIManager.appUI.nameInput.value);
    }
}

let peerConnections = {};
let peerPositions = {};

await UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
UIManager.PrefillFieldsFromUrl();
