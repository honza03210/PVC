/// <reference lib="webworker" />
import {io} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";


// // Cast self to SharedWorkerGlobalScope
// const workerSelf = self as unknown as SharedWorkerGlobalScope;
//
// const portToSocket: {[key: string]: {port : MessagePort, signallingSocket: any}} = {};

// console.log("workerSelf", workerSelf);

console.log("lol");

(self as unknown as SharedWorkerGlobalScope).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];

    const signallingSocket = io(ServerConfig.url, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
    });

    // portToSocket[event.origin] = {port: port!, signallingSocket: signallingSocket};

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
    port!.postMessage({type: "sharedWorkerMessage", message: "Hello from SharedWorker!"});
};
