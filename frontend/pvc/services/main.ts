import {PeerConnection} from "@/services/peer-connection.ts";
import {UIManager} from "@/services/ui-manager.ts";
import {ClientPositions, Position} from "@/services/client-positions.ts";
import {AppContext} from "next/app";
import {Signaling} from "@/services/signaling.ts";


/**
 * Entry file for the main voice chat client page
 * TODO: Cluttered mess -> Rewrite
 */

export async function main(peerConnections: { [p: string]: PeerConnection }, peerPositions: { [key: string]: Position }, signaling: Signaling, positions: ClientPositions): Promise<void> {

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
    }

    peerConnections = {};
    peerPositions = {};

    await UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
    //document.getElementById("initButton")?.click();
    UIManager.PrefillFieldsFromUrl();

}