import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {connectPositions} from "./ws-connect";
import {BindStreamAnimation} from "./visualization";

UIManager.Initialize();
await navigator.mediaDevices
    .getUserMedia({
        audio: true,
    })
    .then(stream => {
        BindStreamAnimation(stream);
    });
let positionsSocket: WebSocket | null = null;
try {
    positionsSocket = connectPositions("ws://localhost:4242");
} catch (error) {
    console.error("Failed to connect to a websocket connection for the positions feed");
}

await Startup();

export async function Startup() {

    const peerConnections: { [key: string]: PeerConnection } = {};

    UIManager.EnableInitButton(peerConnections, positionsSocket);
    document.getElementById("initButton")?.click();
    UIManager.Enable3DInitButton(positionsSocket);
    UIManager.PrefillFieldsFromUrl();


}