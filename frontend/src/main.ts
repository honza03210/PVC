import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {ClientPositions} from "./client-positions";
import {BindStreamAnimation} from "./visualization";

UIManager.Initialize();
await navigator.mediaDevices
    .getUserMedia({
        audio: true,
    })
    .then(stream => {
        BindStreamAnimation(stream);
    });
let positionsSocket = new ClientPositions("ws://localhost:4242");

await Startup();

export async function Startup() {

    const peerConnections: { [key: string]: PeerConnection } = {};

    UIManager.EnableInitButton(peerConnections, positionsSocket);
    document.getElementById("initButton")?.click();
    UIManager.Enable3DInitButton(positionsSocket);
    UIManager.PrefillFieldsFromUrl();
}