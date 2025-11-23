import {Socket} from "socket.io-client";
import {InitPC, PeerConnection} from "./peer-connection";
import {HandleUserDisconnect, useQueuedCandidates} from "./p2p";
import {UIManager} from "./ui-manager";
import {ClientPositions} from "./client-positions";

export class Signalling{
    IceServers: RTCIceServer[];
    communicator: Socket | MessagePort;
    IceCandidateQueue: {
        [p: string]: {
            popped: boolean
            queue: {
                candidate: RTCIceCandidate
                sdpMid: string
                sdpMLineIndex: number
            }[]
        }
    } | null = null;
    peerConnections: {[key: string] : PeerConnection} | null = null;
    positionsSocket: ClientPositions | null = null;


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
                   [p: string]: { popped: boolean; queue: { candidate: RTCIceCandidate; sdpMid: string; sdpMLineIndex: number }[] }
               },
               peerConnections: { [p: string]: PeerConnection },
               positionsSocket: ClientPositions) {
        this.IceCandidateQueue = IceCandidateQueue;
        this.positionsSocket = positionsSocket;
        this.peerConnections = peerConnections;

        if ("onAny" in this.communicator){
            this.communicator.offAny();
            this.communicator.onAny(async (ev, ...args) => {
                await this.HandleSignallingEvent(ev.toString(), args[0]);
            })
        } else if ("addEventListener" in this.communicator){
            this.communicator.removeEventListener("message", this.onMessageHandler);
            this.communicator.addEventListener("message", this.onMessageHandler);
        }
    }

    private onMessageHandler = async (event : any) => {
        await this.HandleSignallingEvent(event.data.type, event.data);
    }

    Close(){
        this.communicator.close();
        console.log("signalling closed");
    }


    async HandleSignallingEvent(eventName: string,
                                eventData: any) {
        if (this.peerConnections == null || this.IceCandidateQueue == null) {
            console.error("Skipping signalling event handling: ", this.peerConnections, this.IceCandidateQueue);
            return;
        }
        console.log("EventName: ", eventName);
        switch (eventName) {
            case "connected":
                console.log('Hello, successfully connected to the signaling server!');
                document.getElementById("rooms-refresh")?.addEventListener("click", () => {
                   this.Send({type: "listRooms", payload: {}});
                   console.log("listRooms sent");
                });
                this.Send({type: "listRooms", payload: {}});
                break;
            case "roomConnected":
                UIManager.inRoom = true;
                UIManager.EnableDisconnectButton(this);
                console.log("Successfully connected to room " + eventData.roomID)
                break;
            case "userDisconnected":
                this.Send({type: "listRooms", payload: {}});
                await HandleUserDisconnect(eventData.id, this.peerConnections);
                console.log("disconnect:" + eventData);
                break;
            case "error":
                console.log("Error: " + eventData.message);
                UIManager.appUI.errorMsgLabel.innerHTML = "Error" + eventData.message;
                break;
            case "listRooms":
                console.log("listRooms: ", eventData);
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
                if (this.IceCandidateQueue[eventData.id] && this.IceCandidateQueue[eventData.id]!.popped) {
                    console.log("getCandidate", eventData.candidate.candidate);
                    if (this.peerConnections[eventData.id]!.connectionState == "connected") {
                        console.log("getCandidate ignored - connected");
                        return;
                    }
                    if (eventData.candidate.candidate == "") return;
                    this.peerConnections[eventData.id]!.addIceCandidate(new RTCIceCandidate(eventData.candidate.candidate)).then(() => {
                        console.log("candidate add success");
                    });
                    return;
                } else if (!this.IceCandidateQueue[eventData.id]) {
                    this.IceCandidateQueue[eventData.id] = {popped: false, queue: []};
                }
                this.IceCandidateQueue[eventData.id]!.queue.push(eventData.candidate);
                console.log("getCandidate -- pushed to queue: ", eventData.candidate);
                break;
            case "listUsers":
                console.log("listUsers: ", eventData);
                break;
            case "getAnswerAck":
                console.log("getAnswerAck");
                if (this.IceCandidateQueue[eventData.id] == undefined) {
                    this.IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    console.log("undefined queue");
                    return;
                }
                await useQueuedCandidates(this.peerConnections, this.IceCandidateQueue, eventData.id)
                this.IceCandidateQueue[eventData.id]!.popped = true;
                break;
            case "getOffer":
                console.log("get offer:" + eventData.sdp);
                await InitPC(this, eventData.id, this.peerConnections, this.positionsSocket!, false, eventData.username);
                await this.peerConnections[eventData.id].CreateAnswer(this, eventData.sdp, eventData.id);
                break;
            case "getAnswer":
                console.log("get answer:" + eventData.sdp);
                if (!this.peerConnections[eventData.id]!.remoteDescription || !this.peerConnections[eventData.id]!.remoteDescription!.type) {
                    console.log("setting remote desc after getting an answer");
                    await this.peerConnections[eventData.id]!.setRemoteDescription(eventData.sdp);
                }
                console.log("answerAck sent")
                this.Send({payload: {dest: eventData.id}, type: "answerAck"});
                if (!this.IceCandidateQueue[eventData.id]) {
                    console.log("NO QUEUE TO POP");
                    this.IceCandidateQueue[eventData.id] = {popped: true, queue: []};
                    return;
                }
                console.log("getAnswerAck");
                await useQueuedCandidates(this.peerConnections, this.IceCandidateQueue, eventData.id)
                break;
            case "PeerJoined":
                this.Send({type: "listRooms", payload: {}});
                console.log("Peer joined: " + eventData.id);
                if (this.peerConnections[eventData.id]) {
                    console.log("peer already connected");
                    return;
                }

                await InitPC(this, eventData.id, this.peerConnections, this.positionsSocket!, true, eventData.username);
                await this.peerConnections[eventData.id].CreateOffer(this, eventData.id);
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