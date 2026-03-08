'use client';
import MainMenuPanel from "@/components/main-menu-panel";
import RoomsListMenu from "@/components/rooms-list-menu";
import {AppProvider, useAppContext} from "@/components/app-context.tsx";
import { useEffect } from "react";
import {AudioCtxProvider, useAudioCtx} from "@/components/audio-ctx.tsx";
import {BindStreamAnimation} from "@/services/visualization.ts";
import {io} from "socket.io-client";
import {ServerConfig} from "@/services/configs/server-config.ts";
import {Signaling} from "@/services/signaling.ts";
import {ClientPositions} from "@/services/client-positions.ts";

/**
 * Entry file for the main voice chat client page
 * TODO: Cluttered mess -> Rewrite
 */

export async function main(): Promise<void> {
    // const ctx = useAppContext();
    // //
    // //
    // // UIManager.Initialize();
    // //
    // // const urlParams = new URLSearchParams(window.location.search);
    // //
    // // let clientPositions = new ClientPositions(urlParams.get("websocket_address") ?? "ws://localhost:4242");
    // //
    // // if (urlParams.get("user_token") != null && clientPositions.communicator instanceof WebSocket) {
    // //     console.log("token sending", clientPositions.communicator);
    // //     if (clientPositions.communicator.readyState === WebSocket.OPEN) {
    // //         clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")}));
    // //     } else {
    // //         clientPositions.communicator.addEventListener("open", () => clientPositions.Send(JSON.stringify({token: urlParams.get("user_token")})), {once: true});
    // //     }
    // //
    // //     console.log("token sent");
    // // } else {
    // //     console.log("token not sent");
    // // }
    // //
    // // if (urlParams.get("pfp_url") != null) {
    // //     UIManager.pfpUrl = urlParams.get("pfp_url")!;
    // //     const pfp = document.createElement("img");
    // //     pfp.classList.add("pfp");
    // //     pfp.height = 64;
    // //     pfp.width = 64;
    // //     pfp.src = UIManager.pfpUrl;
    // //     UIManager.appUI.audioMenu.append(pfp);
    // // }
    // //
    // ctx.positionsSocket = clientPositions;
    // ctx.peerPositions = {};
    // ctx.peerConnections = {};
    // //
    // // await UIManager.EnableInitButton(peerConnections, peerPositions, clientPositions);
    // // UIManager.appUI.nameInput.value = urlParams.get("username") ?? "";
    // // UIManager.appUI.roomIDInput.value = urlParams.get("room_id") ?? "";
    // // UIManager.appUI.passwordInput.value = urlParams.get("password-INSECURE") ?? "";
}

export default function Home() {
    const app = useAppContext();
    const audioCtx = useAudioCtx()
    useEffect(() => {
        async function init() {
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

            let comm = io(ServerConfig.url, {
                transports: ['websocket', 'polling'],
                withCredentials: true,
            });

            let signalling: Signaling = new Signaling(comm);
            signalling.Send({type: "listRooms", payload: {}});
            signalling.BindEvents({}, app.peerConnections, {}, app.positionsSocket!);
            app.signalling = signalling;
            console.log("signalling bound", signalling);
        }

        init();
    }, [app]);
    return (
      <div id="container">
        <table id="main-menu-table">
          <tbody>
          <tr>
            <td>
              <RoomsListMenu />
            </td>
            <td>
              <MainMenuPanel />
            </td>
            <td>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    );
}
