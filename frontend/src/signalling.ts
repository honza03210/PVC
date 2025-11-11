import {Socket} from "socket.io-client";
import {AppUI} from "./interaces/app-ui";
import {PeerConnection} from "./peer-connection";
import { InitPC, useQueuedCandidates} from "./p2p";
import { HandleUserDisconnect } from "./p2p";

export class Signalling{
    IceServers: RTCIceServer[];
    communicator: Socket | MessagePort;

    constructor(communicator: Socket | MessagePort) {
        this.communicator = communicator;
        this.IceServers = [];
    }

    Send(message: any){
        if ("emit" in this.communicator) {
            this.communicator.emit(message.type, message.payload);
        } else if ("postMessage" in this.communicator) {
            this.communicator.postMessage({message: message.payload, type: message.type});
        } else {
            console.error("signalling object can't emit or postMessage");
        }
    }

    BindEvents( appUI: AppUI,
                IceCandidateQueue: {
                    [p: string]: {
                        popped: boolean
                        queue: {
                            candidate: RTCIceCandidate
                            sdpMid: string
                            sdpMLineIndex: number
                        }[]
                    }
                },
                peerConnections: {[key: string] : PeerConnection},
                wsPositions: WebSocket){
        if ("onAny" in this.communicator){
            this.communicator.onAny(async (ev, ...args) => {
                await this.HandleSignallingEvent(ev.toString(), args[0], appUI, IceCandidateQueue, peerConnections, wsPositions);
            })
        } else if ("addEventListener" in this.communicator){
            this.communicator.addEventListener("message", async (event) => {
                await this.HandleSignallingEvent(event.data.type, event.data, appUI, IceCandidateQueue, peerConnections, wsPositions);
            });
        }
    }


    async HandleSignallingEvent(eventName: string, eventData: any, appUI: AppUI, IceCandidateQueue: { [key: string]: { popped: boolean, queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]}}, peerConnections: { [key: string]: PeerConnection }, wsPositions: WebSocket) {
        switch (eventName) {
            case "connect":
                this.Send({type: "listRooms", payload: {}});
                console.log('Hello, successfully connected to the signaling server!');
                break;
            case "userDisconnected":
                await HandleUserDisconnect(eventData.id, peerConnections);
                console.log("disconnect:" + eventData);
                break;
            case "error":
                console.log("Error: " + eventData.message);
                appUI.errorMsgLabel.innerHTML = "Error" + eventData.message;
                break;
            case "listRooms":
                appUI.roomList.innerHTML = "Rooms: \n" + eventData.roomsList;
                break;
            case "sharedWorkerMessage":
                console.log("SharedWorker says: " + eventData.message);
                break;
            case "getCandidate":
                if (!eventData.candidate.candidate) {
                    return;
                }
                if (IceCandidateQueue[eventData.id] && IceCandidateQueue[eventData.id]!.popped) {
                    console.log("getCandidate", eventData.candidate.candidate);
                    if (peerConnections[eventData.id]!.connectionState == "connected") {
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    if (eventData.candidate.candidate == "") return;
                    peerConnections[eventData.id]!.addIceCandidate(new RTCIceCandidate(eventData.candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                } else if (!IceCandidateQueue[eventData.id]) {
                    IceCandidateQueue[eventData.id] = {popped: false, queue: []};
                }
                IceCandidateQueue[eventData.id]!.queue.push(eventData.candidate);
                console.log("getCandidate -- pushed to queue: ", eventData.candidate);
                break;
            case "listUsers":
                console.log("listUsers: ", eventData);
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                if (IceCandidateQueue[eventData.id] == undefined) {
                    IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    console.log("undefined queue");
                    return;
                }
                await useQueuedCandidates(peerConnections, IceCandidateQueue, eventData.id)
                IceCandidateQueue[eventData.id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + eventData.sdp);
                await InitPC(this, eventData.id, peerConnections, appUI, wsPositions, false, eventData.username);
                await peerConnections[eventData.id].CreateAnswer(this, eventData.sdp, eventData.id);
                break;
            case "getAnswer":
                console.log("get answer:" + eventData.sdp);
                if (!peerConnections[eventData.id]!.remoteDescription || !peerConnections[eventData.id]!.remoteDescription!.type) {
                    console.log("setting remote desc after getting an answer");
                    await peerConnections[eventData.id]!.setRemoteDescription(eventData.sdp);
                }
                console.log("answerAck sent")
                this.Send({payload: {dest: eventData.id}, type: "answerAck"});
                if (!IceCandidateQueue[eventData.id]) {
                    console.log("NO QUEUE TO POP");
                    IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    return;
                }
                console.log("getAnswerAck");
                await useQueuedCandidates(peerConnections, IceCandidateQueue, eventData.id)
                break;
            case "PeerJoined":
                console.log("Peer joined: " + eventData.id);
                if (peerConnections[eventData.id]) {
                    console.log("peer already connected");
                    return;
                }

                await InitPC(this, eventData.id, peerConnections, appUI, wsPositions, true, eventData.username);
                await peerConnections[eventData.id].CreateOffer(this, eventData.id);
                break;
            case "userCredentials":
                console.log("userCredentials received: ", eventData);
                this.IceServers = eventData.credentials;
                break;
            default:
                console.log("Undefined message received: ", eventName, eventData);
                break;
        }
    }
}