import {Signalling} from "./signalling";
import {HandleNewReceivedStream} from "./p2p";
import {UIManager} from "./ui-manager";
import {AddCharacter} from "./visualization";
import {ClientPositions} from "./client-positions";

export class PeerConnection extends RTCPeerConnection {
    async CreateOffer(signalling: Signalling, destID: string) {
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

    async CreateAnswer(signalling: Signalling, sdp: string | RTCSessionDescription, destID: string) {
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
                    signalling.Send({type: "answer", payload: {dest: destID, sdp: sdp1}})
                })
                .catch(error => {
                    console.log(error);
                });
        });
    }
}

export async function InitPC(signalling: Signalling, id: string, peerConnections: {
    [p: string]: PeerConnection
}, positionsSocket: ClientPositions, offer: boolean, username: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    let peerConnection: PeerConnection = new PeerConnection({...signalling.IceServers, iceTransportPolicy: "all"});

    console.log("render videos");
    try {
        const stream = await navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000,
                },
            })
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

        AddCharacter(id, username);

        if (offer) {
            let dc = peerConnection.createDataChannel("positions", {ordered: true});
            BindDataChannel(dc, id, positionsSocket);
        } else {
            peerConnection.ondatachannel = (e) => {
                let dc = e.channel;
                BindDataChannel(dc, id, positionsSocket);
            };
        }

        peerConnection.onicecandidate = e => {
            console.log("onicecandidate");
            if (e.candidate) {
                console.log("candidate: " + e.candidate);
                signalling.Send({
                    payload: {
                        dest: id, candidate: {
                            candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid,
                            sdpMLineIndex: e.candidate.sdpMLineIndex,
                            usernameFragment: (e.candidate as any).usernameFragment,
                        }
                    }, type: "candidate"
                })
            } else {
                console.log("no candidate")
            }
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log(e);
        };


        peerConnection.ontrack = async ev => {
            HandleNewReceivedStream(ev.streams[0], remoteAudio, remoteVideo, id);
        };
    } catch (e) {
        console.log(e);
    }
    console.log("set new peerConnection");
    peerConnections[id] = peerConnection;
}

export function BindDataChannel(dc: RTCDataChannel, id: string, clientPositions : ClientPositions) {
    dc.onopen = () => {
        function sendPos() {
            setTimeout(() => {
                if (clientPositions.PositionFormat !== null){
                    dc.send(clientPositions.RawPositions);
                }
                else if (document.getElementById("aFrameScene")?.style.display == "none") {
                    let char = document.getElementById("playerCharacter");
                    dc.send("2DDemo;" + new URLSearchParams({x: char!.style.left, y: char!.style.top}).toString());
                } else {
                    const playerPosition: any = document.querySelector('[camera]')!.getAttribute("position");
                    console.log("Sent 3D object position", `${playerPosition!.x} ${playerPosition!.y} ${playerPosition!.z}`);
                    dc.send(`3DDemo;${playerPosition!.x} ${playerPosition!.y} ${playerPosition!.z}`);
                }
                sendPos()
            }, 10)
        }
        sendPos();
    };
    dc.onmessage = (event: { data: string }) => {
        if (UIManager.appUI.manualPositions.checked) return;
        let data = event.data.split(";");
        let format = data[0];
        if (format == "2DDemo" || format == "3DDemo") {
            if (document.getElementById("aFrameScene")?.style.display == "none") {
                let char = document.getElementById("remotePlayerCharacter-" + id);
                let data = Object.fromEntries(new URLSearchParams(event.data));
                char!.style.top = data.top!;
                char!.style.left = data.left!;
            } else {
                let char: any = document.getElementById("player-" + id);
                console.log("Got 3D object position", event.data);
                char.setAttribute("position", event.data);
            }
        } else {
            console.log(`Received position in format: ${format}, data: ${data.slice(1, data.length).join(";")}`);
        }
    }
}