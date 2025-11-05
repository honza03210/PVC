import {PCConfig} from "../configs/pc-config.js";
import {ServerConfig} from "../configs/server-config.js";
import {type AppUI} from "../interaces/app-ui.js";
import {DragElement} from "../draggable.js";
import {io, Socket} from "socket.io-client";
import {InitPC, CreateAnswer, CreateOffer, HandleNewReceivedStream, BindDataChannel, InitPlayerCharacter, useQueuedCandidates, SetPanNodeParams, CreateSampleSoundButton} from "../p2p.js"

export function roomJoin(peerConnections: {[key: string] : RTCPeerConnection}, appUI: AppUI, wsPositions: WebSocket) {
    console.log("roomJoin");

    InitPlayerCharacter(appUI);

    let IceCandidateQueue: {
        [key: string]: {
            popped: boolean,
            queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
        }
    } = {};

    const signallingSocket = io(ServerConfig.url, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
    });

    signallingSocket.onAny(async (ev, ...args) => {
        console.log("Event: ", ev, args);
        switch (ev.toString()) {
            case "connect":
                signallingSocket.emit("listRooms", {});
                console.log('Hello, successfully connected to the signaling server!');
                break;
            case "disconnect":
                console.log("disconnect:" + args[0]);
                break;
            case "error":
                console.log("Error: " + args[0].message);
                appUI.errorMsgLabel.innerHTML = "Error" + args[0].message;
                break;
            case "listRooms":
                appUI.roomList.innerHTML = "Rooms: \n" + args[0].roomsList;
                break;
            case "sharedWorkerMessage":
                console.log("SharedWorker says: " + args[0].message);
                break;
            case "getCandidate":
                if (!args[0].candidate.candidate) {
                    return;
                }
                if (IceCandidateQueue[args[0].id] && IceCandidateQueue[args[0].id]!.popped) {
                    console.log("getCandidate", args[0].candidate.candidate);
                    if (peerConnections[args[0].id]!.connectionState == "connected") {
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    if (args[0].candidate.candidate == "") return;
                    peerConnections[args[0].id]!.addIceCandidate(new RTCIceCandidate(args[0].candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                } else if (!IceCandidateQueue[args[0].id]) {
                    IceCandidateQueue[args[0].id] = {popped: false, queue: []};
                }
                IceCandidateQueue[args[0].id]!.queue.push(args[0].candidate);
                console.log("getCandidate -- pushed to queue: ", args[0].candidate);
                break;
            case "listUsers":
                console.log("listUsers: ", args[0]);
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                if (IceCandidateQueue[args[0].id] == undefined) {
                    IceCandidateQueue[args[0].id] = {popped: true, queue: []};
                    console.log("undefined queue");
                    return;
                }
                await useQueuedCandidates(peerConnections, IceCandidateQueue, args[0].id)
                IceCandidateQueue[args[0].id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + args[0].sdp);
                await InitPC(signallingSocket, args[0].id, peerConnections, appUI, wsPositions, false, args[0].username);
                await CreateAnswer(signallingSocket, peerConnections, peerConnections[args[0].id], args[0].sdp, args[0].id);
                break;
            case "getAnswer":
                console.log("get answer:" + args[0].sdp);
                if (!peerConnections[args[0].id]!.remoteDescription || !peerConnections[args[0].id]!.remoteDescription!.type) {
                    console.log("setting remote desc after getting an answer");
                    await peerConnections[args[0].id]!.setRemoteDescription(args[0].sdp);
                }
                console.log("answerAck sent")
                signallingSocket.emit("answerAck", {dest: args[0].id});
                if (!IceCandidateQueue[args[0].id]) {
                    console.log("NO QUEUE TO POP");
                    IceCandidateQueue[args[0].id] = {popped: true, queue: []};
                    return;
                }
                console.log("getAnswerAck");
                await useQueuedCandidates(peerConnections, IceCandidateQueue, args[0].id)
                break;
            case "PeerJoined":
                console.log("Peer joined: " + args[0].id);
                if (peerConnections[args[0].id]) {
                    console.log("peer already connected");
                    return;
                }

                await InitPC(signallingSocket, args[0].id, peerConnections, appUI, wsPositions, true, args[0].username);
                await CreateOffer(signallingSocket, args[0].id, peerConnections, peerConnections[args[0].id]);
                break;

        }
    });

    signallingSocket.emit("join", {
        roomId: appUI.roomIDInput.value,
        name: appUI.nameInput.value,
        password: appUI.passwordInput.value
    });

    console.log("join posted");
    const sampleSoundButton = CreateSampleSoundButton(appUI);
    document.getElementById("container")?.appendChild(sampleSoundButton);
}
