// import {PeerConnection} from "@/services/peer-connection.ts";
// import {UIManager} from "@/services/ui-manager.ts";
// import {ClientPositions, Position} from "@/services/client-positions.ts";
// import {BindStreamAnimation} from "@/services/visualization.ts";
//
//
// /**
//  * Entry file for the overlay variant
//  */
// UIManager.Initialize();
// await navigator.mediaDevices
//     .getUserMedia({
//         audio: true,
//     })
//     .then(stream => {
//         BindStreamAnimation(stream);
//     });
// let clientPositions = new ClientPositions(window.parent);
//
// await Startup();
//
// async function Startup() {
//
//     const peerConnections: { [key: string]: PeerConnection } = {};
//     const peerPositions: { [key: string]: Position } = {};
//
//     UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
//     document.getElementById("initButton")?.click();
//     UIManager.PrefillFieldsFromUrl();
// }