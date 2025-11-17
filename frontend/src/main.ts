import {PeerConnection} from "./peer-connection.js";
import {UIManager} from "./ui-manager";
import {connectPositions} from "./ws-connect";
import {BindStreamAnimation, DrawSoundVisualization} from "./visualization";

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
    UIManager.Initialize();
    await startup();
})

async function startup() {
    let positionsSocket: WebSocket | null = null;
    try {
        positionsSocket = connectPositions("ws://localhost:4242");
    } catch (error) {
        console.error("Failed to connect to a websocket connection for the positions feed");
    }

    const peerConnections: { [key: string]: PeerConnection } = {};

    let audioCtx = UIManager.appUI.audioCtx;

    await navigator.mediaDevices
        .getUserMedia({
            audio: true,
        })
        .then(stream => {
            BindStreamAnimation(stream, audioCtx);
        });

    const joinButton = UIManager.CreateJoinButton(peerConnections, positionsSocket);
    const init3DButton = UIManager.Create3DInitButton(positionsSocket);
    //document.getElementById("main-menu")!.append(init3DButton);

    document.getElementById("main-menu")!.append(init3DButton, joinButton);

    UIManager.PrefillFieldsFromUrl(joinButton);
    //document.getElementById("main-menu")!.appendChild(createAudioInitButton(uiManager.appUI, peerConnections, positionsSocket));
}



