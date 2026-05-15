import type {Socket} from "socket.io";
import {IceServers} from "../backup-ice-server-array.js";


/**
 * In the best case generates TURN credentials for the given user - if not possible will use hardcoded
 * server-array backup (metered.ca doesn't support dynamic generation for free tier).
 */
export async function sendUserCredentials(socket: Socket, _user: string): Promise<void> {
    socket.emit("userCredentials", {selfID: socket.id, credentials: IceServers});
    return;

    // This may be used for dynamic credential generation in the future if the TURN server supports it
    // let response = await GenerateTurnCredentials(_user);
    // if (response != null){
    //     console.log("user credentials response: ", response);
    //     socket.emit("userCredentials", { selfID: socket.id, credentials: response });
    // } else {
    //     console.log("GenerateTurnCredentials returned null", response);
    //     if (!socket.connected) return;
    //     setTimeout(() => {
    //         console.log("failed to fetch user credentials");
    //         sendUserCredentials(socket, _user);
    //     }, 100000);
    // }
}
