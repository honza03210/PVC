import {Socket} from "socket.io-client";
import {InitPC, PeerConnection} from "./peer-connection";
import {HandleUserDisconnect, useQueuedCandidates} from "./p2p";
import {UIManager} from "./ui-manager";

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

    BindEvents(IceCandidateQueue: {
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
                positionsSocket: WebSocket | null) {
        if ("onAny" in this.communicator){
            this.communicator.onAny(async (ev, ...args) => {
                await this.HandleSignallingEvent(ev.toString(), args[0], IceCandidateQueue, peerConnections, positionsSocket);
            })
        } else if ("addEventListener" in this.communicator){
            this.communicator.addEventListener("message", async (event) => {
                await this.HandleSignallingEvent(event.data.type, event.data, IceCandidateQueue, peerConnections, positionsSocket);
            });
        }
    }


    async HandleSignallingEvent(eventName: string,
                                eventData: any,
                                IceCandidateQueue: {
                                    [key: string]: {
                                        popped: boolean,
                                        queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
                                    }
                                },
                                peerConnections: {
                                        [key: string]: PeerConnection
                                    },
                                positionsSocket: WebSocket | null) {
        switch (eventName) {
            case "connect":
                console.log('Hello, successfully connected to the signaling server!');
                document.getElementById("rooms-refresh")?.addEventListener("click", () => {
                   this.Send({type: "listRooms", payload: {}});
                });
                this.Send({type: "listRooms", payload: {}});
                break;
            case "userDisconnected":
                this.Send({type: "listRooms", payload: {}});
                await HandleUserDisconnect(eventData.id, peerConnections);
                console.log("disconnect:" + eventData);
                break;
            case "error":
                console.log("Error: " + eventData.message);
                UIManager.appUI.errorMsgLabel.innerHTML = "Error" + eventData.message;
                break;
            case "listRooms":
                console.log("RoomsList: ", eventData);
                document.getElementById("rooms-list")?.replaceChildren(...eventData.roomsList.map(
                    (room: {roomID : string, numberOfUsers: number}) => {
                        let div = document.createElement("div");
                        div.innerText = `${room.roomID} : ${room.numberOfUsers} users connected`;
                        let button = document.createElement("button");
                        button.innerText = "Join room";
                        button.style.marginLeft = "1vw";
                        button.addEventListener("click", async () => {
                            window.open(window.location.origin + `/?username=${UIManager.appUI.nameInput.value}&room_id=${room.roomID}&autojoin="true"`, "_blank");
                        })
                        div.appendChild(button);
                        console.log("RoomReceived: ", button, eventData);
                        return div;
                }))
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
                this.Send({type: "listRooms", payload: {}});
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
                await InitPC(this, eventData.id, peerConnections, positionsSocket, false, eventData.username);
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
                this.Send({type: "listRooms", payload: {}});
                console.log("Peer joined: " + eventData.id);
                if (peerConnections[eventData.id]) {
                    console.log("peer already connected");
                    return;
                }

                await InitPC(this, eventData.id, peerConnections, positionsSocket, true, eventData.username);
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