// import { type AppUI } from "./interaces/app-ui.js";
// import { io } from "socket.io-client";
//
//
// export function BindSignallingSocket(appUI: AppUI) {
//
//     const SignallingSocket = io('http://localhost:3000', {
//         transports: ['websocket', 'polling'],
//         withCredentials: true,
//     });
//
//     console.log("BindSignallingSocket started");
//
//     SignallingSocket.on('connect', () => {
//         SignallingSocket.emit("listRooms");
//         console.log('Hello, successfully connected to the signaling server!');
//     });
//
//
//
//     SignallingSocket.on("disconnect", (data: string) => {
//         console.log("disconnect:" + data);
//     })
//
//     SignallingSocket.on("error", (data) => {
//         console.log("Error: " + data.message);
//         appUI.errorMsgLabel.innerHTML = "Error" + data.message;
//     });
//
//     SignallingSocket.on("listRooms", (data) => {
//         appUI.roomList.innerHTML = "Rooms: \n" + data.roomsList;
//     });
//
//     return SignallingSocket;
// }