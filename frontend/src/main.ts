import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {ClientPositions, Position} from "./client-positions";
import {BindStreamAnimation} from "./visualization";

UIManager.Initialize();
await navigator.mediaDevices
    .getUserMedia({
        audio: true,
    })
    .then(stream => {
        BindStreamAnimation(stream);
    });
const urlParams = new URLSearchParams(window.location.search);

let clientPositions = new ClientPositions(urlParams.get("websocket_address") ?? "ws://localhost:4242");

if (urlParams.get("user_token") != null && clientPositions.communicator instanceof WebSocket) {
    console.log("token sending", clientPositions.communicator);
    if (clientPositions.communicator.readyState === WebSocket.OPEN) {
        clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")}));
    } else {
        clientPositions.communicator.addEventListener("open", () => clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")})), { once: true });
    }

    console.log("token sent");
} else {
    console.log("token not sent");
}

await Startup();

async function Startup() {

    const peerConnections: { [key: string]: PeerConnection } = {};
    const peerPositions: { [key: string]: Position } = {};

    UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
    document.getElementById("initButton")?.click();
    UIManager.PrefillFieldsFromUrl();
}