import {Socket} from "socket.io-client";
import {SignallingSend} from "./p2p";

export class PeerConnection extends RTCPeerConnection {
    async CreateOffer(signalling: Socket | MessagePort, destID: string) {
        console.log("create offer");
        this
            .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true})
            .then(async sdp => {
                await this.setLocalDescription(sdp);
                SignallingSend(signalling, {type: "offer", payload: {dest: destID, sdp: sdp}})
            })
            .catch(error => {
                console.log(error);
            });
    }

    async CreateAnswer(signalling: Socket | MessagePort, sdp: string | RTCSessionDescription, destID: string) {
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
                    SignallingSend(signalling, {type: "answer", payload: {dest: destID, sdp: sdp1}})
                })
                .catch(error => {
                    console.log(error);
                });
        });
    }
}