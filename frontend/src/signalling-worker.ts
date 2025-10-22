/// <reference lib="webworker" />
import { io, Socket } from "socket.io-client";

// // Cast self to SharedWorkerGlobalScope
// const workerSelf = self as unknown as SharedWorkerGlobalScope;
//
// const portToSocket: {[key: string]: {port : MessagePort, signallingSocket: any}} = {};

// console.log("workerSelf", workerSelf);

console.log("lol");

(self as unknown as SharedWorkerGlobalScope).onconnect = (event: MessageEvent) => {
    const port = event.ports[0];

    const signallingSocket = io("http://localhost:3001", {
        transports: ['websocket', 'polling'],
        withCredentials: true,
    });

    // portToSocket[event.origin] = {port: port!, signallingSocket: signallingSocket};

    console.log("[SharedWorker] New tab connected");

    port!.onmessage = (msgEvent) => {
        signallingSocket.emit(msgEvent.data.type, msgEvent.data.message);
    };

    const events: string[] = ["connect", "disconnect", "error", "listRooms", "getCandidate", "listUsers", "getAnswerAck", "getOffer", "getAnswer", "PeerJoined", ];

    events.forEach((eventName) => {
        signallingSocket.on(eventName, (data: any) => {
            port!.postMessage({
                type: eventName,   // the event name
                message: data      // the payload
            });
        });
    });

    port!.start();

    port!.postMessage({ type: "sharedWorkerMessage", message: "Connected: " + signallingSocket.connected });
    port!.postMessage({ type: "sharedWorkerMessage", message: "Hello from SharedWorker!" });
};
//
// let socket: Socket | null = null;
// const ports: MessagePort[] = [];
//
// self.onconnect = (event: MessageEvent) => {
//     const port = event.ports[0];
//     ports.push(port);
//
//     console.log("[SharedWorker] New tab connected");
//
//     // Lazy-init socket
//     if (!socket) {
//         console.log("[SharedWorker] Connecting Socket.IO...");
//         socket = io("https://your-signal-server.example.com");
//
//         socket.on("connect", () => {
//             console.log("[SharedWorker] Socket connected:", socket?.id);
//             broadcast({ type: "socket_connected", id: socket?.id });
//         });
//
//         socket.onAny((event, data) => {
//             console.log(`[SharedWorker] Event: ${event}`, data);
//             broadcast({ type: "socket_event", event, data });
//         });
//
//         socket.on("disconnect", () => {
//             broadcast({ type: "socket_disconnected" });
//         });
//     }
//
//     // Listen for messages from this tab
//     port.onmessage = e => {
//         const msg = e.data;
//         if (!socket) return;
//
//         switch (msg.type) {
//             case "emit":
//                 socket.emit(msg.event, msg.data);
//                 break;
//             default:
//                 console.warn("[SharedWorker] Unknown message:", msg);
//         }
//     };
//
//     port.start(); // required for Firefox
// };
//
// function broadcast(message: any) {
//     ports.forEach(p => p.postMessage(message));
// }
