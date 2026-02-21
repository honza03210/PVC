import {Signaling} from "./signaling";
import {HandleNewReceivedStream} from "./p2p";
import {UIManager} from "./ui-manager";
import {ClientPositions, Position} from "./client-positions";

/**
 * Class taking care of the connection between the peers - used to abstract Offer/Answer exchange
 */
export class PeerConnection extends RTCPeerConnection {
    async CreateOffer(signalling: Signaling, destID: string) {
        console.log("create offer");
        this
            .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true})
            .then(async sdp => {
                await this.setLocalDescription(sdp);
                signalling.Send({type: "offer", payload: {dest: destID, sdp: sdp}})
            })
            .catch(error => {
                console.log(error);
            });
    }

    async CreateAnswer(signaling: Signaling, sdp: string | RTCSessionDescription, destID: string) {
        console.log("create answer");
        this.setRemoteDescription(<RTCSessionDescriptionInit>sdp).then(() => {
            console.log("answer set remote description success");
            this
                .createAnswer({
                    offerToReceiveVideo: true,
                    offerToReceiveAudio: true,
                    offerToReceivePositions: true,
                })
                .then(async sdp1 => {
                    await this.setLocalDescription(sdp1);
                    signaling.Send({type: "answer", payload: {dest: destID, sdp: sdp1}})
                })
                .catch(error => {
                    console.log(error);
                });
        });
    }
}

/**
 * Handles the init. of the PeerConnection - Getting audio, setting up the visualization, binding ICE exchange events and data streams
 * @param signaling
 * @param id
 * @param peerConnections
 * @param peerPositions
 * @param clientPositions
 * @param offer
 * @param username
 * @constructor
 */
export async function InitPeerConnection(signaling: Signaling, id: string, peerConnections: {
    [p: string]: PeerConnection
}, peerPositions: {[p: string]: Position}, clientPositions: ClientPositions, offer: boolean, username: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection: PeerConnection = new PeerConnection({...signaling.IceServers, iceTransportPolicy: "all"});
    clientPositions.SendServerEvent(`PLAYER_JOIN;${username};${id}`);
    console.log("render videos");
    try {
        // Getting the local audio stream
        // TODO: get it just once and then reuse it
        const stream = await navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                }
            })
        // TODO: abstract this into another functions
        const remoteVideo = document.createElement("canvas");
        remoteVideo.width = 256;
        remoteVideo.height = 128;
        remoteVideo.style.margin = "50px";

        const remoteAudio: HTMLAudioElement = document.createElement("audio");

        remoteVideo.id = "remoteVideo-" + id;
        remoteVideo.classList.add("roomBound");
        remoteAudio.id = "remoteAudio-" + id;

        remoteAudio.autoplay = true;
        remoteAudio.muted = false;
        remoteAudio.classList.add("roomBound");

        if (UIManager.appUI.videoContainer) {
            UIManager.appUI.videoContainer.appendChild(remoteAudio);
            UIManager.appUI.videoContainer.appendChild(remoteVideo);
        }

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        // Positions data stream init.
        if (offer) {
            console.log("creating data channel");
            let dc = peerConnection.createDataChannel("positions", {ordered: true});
            BindDataChannel(dc, id, clientPositions, peerPositions);
        } else {
            peerConnection.ondatachannel = (e) => {
                console.log("got data channel");
                let dc = e.channel;
                BindDataChannel(dc, id, clientPositions, peerPositions);
            };
        }

        peerConnection.onicecandidate = e => {
            console.log("onicecandidate");
            //if (e.candidate) {
            console.log("candidate: " + e.candidate);
            signaling.Send({
                payload: {
                    dest: id, candidate: e.candidate
                }, type: "candidate"
            })
            //} else {
            //    console.log("no candidate")
            //}
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log(e);
        };


        peerConnection.ontrack = async ev => {
            HandleNewReceivedStream(ev.streams[0], remoteAudio, remoteVideo, id, clientPositions, peerPositions);
        };
    } catch (e) {
        console.log(e);
    }
    console.log("set new peerConnection");
    peerConnections[id] = peerConnection;
}

/**
 * Binding positions data stream to actual position objects to read from
 * @param dc
 * @param id
 * @param clientPositions
 * @param peerPositions
 * @constructor
 */
export function BindDataChannel(dc: RTCDataChannel, id: string, clientPositions : ClientPositions, peerPositions: {[p: string]: Position}) {
    if (clientPositions.communicator) {
        clientPositions.communicator!.addEventListener("message", (event: any) => {
            if (!event.data) {
                return;
            }
            console.log("Received:", event.data);
            let data = event.data.split(";");
            if (data[0] == "GAME_EVENT" && dc.readyState == "open") {
                console.log("Sent GAME_EVENT message: ", event.data);
                dc.send(event.data);
                return;
            }
        });
    }
    dc.onopen = () => {
        console.log("DataChannel open");
        peerPositions[id] = new Position();
        console.log("peerPositions:", id, peerPositions[id]);
        let lastPosition = "";
        function sendPos() {
            setTimeout(() => {
                if (lastPosition != clientPositions.RawPositions){
                    dc.send(clientPositions.PositionFormat + ";" + clientPositions.RawPositions);
                    lastPosition = clientPositions.RawPositions;
                }

                sendPos()
            }, 10)
        }
        sendPos();
    };
    dc.onmessage = (event: { data: string }) => {
        // TODO: decompose
        if (UIManager.appUI.manualPositions.checked) return;
        let data = event.data.split(";");
        let format = data[0];
        if (format == "GAME_EVENT" && clientPositions.communicator) {
            console.log("Received GAME_EVENT message: ", event.data);
            clientPositions.Send(event.data);
            return;
        }
        peerPositions[id].PositionFormat = format;
        peerPositions[id].RawPositions = data.slice(1).join(";");
        try {
            peerPositions[id].x = parseFloat(data[1]);
            peerPositions[id].y = parseFloat(data[2]);
            peerPositions[id].z = parseFloat(data[3]);
            if (Number.isNaN(peerPositions[id].x)) peerPositions[id].x = 0;
            if (Number.isNaN(peerPositions[id].y)) peerPositions[id].y = 0;
            if (Number.isNaN(peerPositions[id].z)) peerPositions[id].z = 0;


            peerPositions[id].pitch = parseFloat(data[4]);
            peerPositions[id].yaw = parseFloat(data[5]);
            if (Number.isNaN(peerPositions[id].pitch)) peerPositions[id].pitch = 0;
            if (Number.isNaN(peerPositions[id].yaw)) peerPositions[id].yaw = 0;
        } catch (e) {
            // not all positions sent
            console.error(e);
        }
        if (clientPositions.sendPeerPositionsBack) {
            clientPositions.SendServerEvent(`POSITION;${id};${peerPositions[id].RawPositions}`);
        }
        console.log("Position object of the peer: ", peerPositions[id]);
        console.log("Received positions from ", id, format, data);
        // if (format == "2DDemo" || format == "3DDemo") {
        //     let positionData : string = data.slice(1).join(";");
        //     console.log("setting position in 2D");
        //     let char = document.getElementById("remotePlayerCharacter-" + id);
        //     let dataParsed = Object.fromEntries(new URLSearchParams(positionData));
        //     char!.style.top = dataParsed.y!;
        //     char!.style.left = dataParsed.x!;
        // } else {
        //     console.log(`Received position in format: ${format}, data: ${data.slice(1).join(";")}`);
        // }
    }
}