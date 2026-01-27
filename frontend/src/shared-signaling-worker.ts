/// <reference lib="webworker" />
import {io} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";

/**
 * Shared worker running on another thread used to offload network communication from the main JavaScript thread
 * @param event
 */
(self as unknown as SharedWorkerGlobalScope).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];

    const signallingSocket = io(ServerConfig.url, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
    });

    console.log("[SharedWorker] New tab connected");

    port!.onmessage = (msgEvent) => {
        signallingSocket.emit(msgEvent.data.type, msgEvent.data.message);
    };

    const events: string[] = ["connect", "disconnect", "error", "listRooms", "getCandidate", "listUsers", "getAnswerAck", "getOffer", "getAnswer", "PeerJoined",];

    events.forEach((eventName) => {
        signallingSocket.on(eventName, (data: any) => {
            port!.postMessage(Object.assign(data, {type: eventName})); // ads event type to the payload
        });
    });

    port!.start();
    port!.postMessage({type: "sharedWorkerMessage", message: "Connected: " + signallingSocket.connected});
};
