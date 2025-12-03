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
let clientPositions = new ClientPositions("ws://localhost:4242");

await Startup();

export async function Startup() {

    const peerConnections: { [key: string]: PeerConnection } = {};
    const peerPositions: { [key: string]: Position } = {};

    UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
    document.getElementById("initButton")?.click();
    UIManager.PrefillFieldsFromUrl();
}