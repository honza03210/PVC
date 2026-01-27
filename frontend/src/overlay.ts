import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {ClientPositions, Position} from "./client-positions";
import {BindStreamAnimation} from "./visualization";


/**
 * Entry file for the overlay variant
 */
UIManager.Initialize();
await navigator.mediaDevices
    .getUserMedia({
        audio: true,
    })
    .then(stream => {
        BindStreamAnimation(stream);
    });
let clientPositions = new ClientPositions(window.parent);

await Startup();

async function Startup() {

    const peerConnections: { [key: string]: PeerConnection } = {};
    const peerPositions: { [key: string]: Position } = {};

    UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
    document.getElementById("initButton")?.click();
    UIManager.PrefillFieldsFromUrl();
}