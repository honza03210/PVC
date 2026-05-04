import {Signaling} from "./signaling";
import {HandleNewReceivedStream} from "./p2p";
import {UIManager} from "./ui-manager";
import {ClientPositions, Position} from "./client-positions";
import * as jdenticon from "jdenticon";
import {BindLatencyChannel, BindPositionsChannel} from "./data-channels";
import {StatSample} from "./statSample";

/**
 * Class taking care of the connection between the peers - used to abstract Offer/Answer exchange
 */
export class PeerConnection extends RTCPeerConnection {
    async CreateOffer(signalling: Signaling, destID: string) {
        console.log("create offer");
        this
            .createOffer({offerToReceiveAudio: true, offerToReceiveVideo: false})
            .then(async sdp => {
                await this.setLocalDescription(sdp);
                signalling.Send({type: "offer", payload: {dest: destID, sdp: sdp, pfpUrl: UIManager.pfpUrl}});
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
                    offerToReceiveVideo: false,
                    offerToReceiveAudio: true,
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
 * @param pfpUrl
 * @constructor
 */
export async function InitPeerConnection(signaling: Signaling, id: string, peerConnections: {
    [p: string]: PeerConnection
}, peerPositions: {[p: string]: Position}, clientPositions: ClientPositions, offer: boolean, username: string, pfpUrl: string) {
    if (id in peerConnections) {
        console.log("id already in peer connections")
        return;
    }

    console.log("PeerConn init with ", signaling.IceServers);
    let peerConnection: PeerConnection = new PeerConnection({iceServers: signaling.IceServers, iceTransportPolicy: "all"});
    clientPositions.SendServerEvent(`PLAYER_JOIN;${username};${id}`);
    console.log("render videos");
    try {
        // Getting the local audio stream
        // TODO: get it just once and then reuse it
        const stream = await navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 2,
                    sampleRate: 48000,
                    sampleSize: 16,
                }
            })
        const audioContext = UIManager.appUI.audioCtx!;
//         const source = audioContext.createMediaStreamSource(stream);
//
// // 1. High-pass filter (remove low-frequency rumble)
//         const highpass = audioContext.createBiquadFilter();
//         highpass.type = "highpass";
//         highpass.frequency.value = 80; // Hz
//
// // 2. Low-pass filter (remove high-frequency noise)
//         const lowpass = audioContext.createBiquadFilter();
//         lowpass.type = "lowpass";
//         lowpass.frequency.value = 12000; // Hz
//
// // 3. Noise gate (simple noise reduction)
//         const gate = audioContext.createDynamicsCompressor();
//         gate.threshold.value = -50;
//         gate.knee.value = 40;
//         gate.ratio.value = 12;
//         gate.attack.value = 0;
//         gate.release.value = 0.25;
//
// // 4. Compressor (smooth volume)
//         const compressor = audioContext.createDynamicsCompressor();
//         compressor.threshold.value = -24;
//         compressor.knee.value = 30;
//         compressor.ratio.value = 3;
//         compressor.attack.value = 0.003;
//         compressor.release.value = 0.25;
//
// // 5. Gain (final volume control)
//         const gain = audioContext.createGain();
//         gain.gain.value = 1.2;
//
// // 6. Destination (output stream)
//         const destination = audioContext.createMediaStreamDestination();
//
// // 🔗 Connect everything
//         source.connect(highpass);
//         highpass.connect(lowpass);
//         lowpass.connect(gate);
//         gate.connect(compressor);
//         compressor.connect(gain);
//         gain.connect(destination);

        // TODO: abstract this into another functions
        const peerContainer = document.createElement("div");
        peerContainer.style.position = "relative";
        peerContainer.id = "peerContainer-" + id;
        const peerVisualizationContainer = document.createElement("div");
        peerVisualizationContainer.style.position = "relative";
        const remoteVideo = document.createElement("canvas");
        remoteVideo.width = 128;
        remoteVideo.height = 128;
        remoteVideo.style.display = "block";
        // remoteVideo.style.margin = "50px";

        const remoteAudio: HTMLAudioElement = document.createElement("audio");

        remoteVideo.id = "remoteVideo-" + id;
        remoteVideo.classList.add("roomBound");
        remoteAudio.id = "remoteAudio-" + id;

        remoteAudio.autoplay = true;
        remoteAudio.muted = false;
        remoteAudio.classList.add("roomBound");

        let pfp: HTMLImageElement | SVGSVGElement;
        console.log("pfp url: ", pfpUrl);
        if (pfpUrl != "" && pfpUrl != undefined) {
            pfp = document.createElement("img");
            pfp.classList.add("pfp");
            pfp.height = 64;
            pfp.width = 64;
            pfp.src = pfpUrl;
        } else {
            pfp = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg"
            );

            pfp.classList.add("pfp");
            pfp.setAttribute("width", "70");
            pfp.setAttribute("height", "70");

            pfp.style.borderRadius = "50%";
            pfp.style.overflow = "hidden";
        }

        const latency = document.createElement("div");
        latency.id = "latency-" + id;
        latency.innerText = username;
        latency.style.textAlign = "center";
        latency.classList.add("latency");


        if (UIManager.appUI.videoContainer) {
            peerVisualizationContainer.append(remoteAudio, remoteVideo);
            if (pfpUrl == "" || pfpUrl == undefined) jdenticon.update(pfp, username);
            peerVisualizationContainer.append(pfp);
            peerContainer.append(peerVisualizationContainer);
            peerContainer.append(latency);
            UIManager.appUI.videoContainer.appendChild(peerContainer);
        }

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        // Positions data stream init.
        if (offer) {
            console.log("creating data channel");
            let pingChannel = peerConnection.createDataChannel("latency", {ordered: true});
            BindLatencyChannel(pingChannel, id);
            let dc = peerConnection.createDataChannel("positions", {ordered: true});
            BindPositionsChannel(dc, id, clientPositions, peerPositions);
        } else {
            peerConnection.ondatachannel = (e) => {
                console.log("got data channel");
                if (e.channel.label == "latency"){
                    let pingChannel = e.channel;
                    BindLatencyChannel(pingChannel, id);
                } else if (e.channel.label == "positions"){
                    let dc = e.channel;
                    BindPositionsChannel(dc, id, clientPositions, peerPositions);
                }
            };
        }

        peerConnection.onicecandidate = e => {
            console.log("onicecandidate");
            if (e.candidate === null) return;
            console.log("candidate: " + e.candidate);
            signaling.Send({
                payload: {
                    dest: id, candidate: e.candidate
                }, type: "candidate"
            })
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log(e);
        };


        peerConnection.ontrack = async ev => {
            HandleNewReceivedStream(ev.streams[0], remoteAudio, remoteVideo, id, clientPositions, peerPositions);
        };
        // directly from https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats
        setInterval(async () => {
            const stats = await peerConnection.getStats();

            let sample: StatSample = {
                timestamp: Date.now(),
            };

            stats.forEach(report => {
                if (report.type === "inbound-rtp" && report.kind === "audio") {
                    sample.packetsLost = report.packetsLost;
                    sample.packetsReceived = report.packetsReceived;
                    sample.jitter = report.jitter;
                }
                if (report.type === "outbound-rtp" && report.kind === "audio") {
                    sample.packetsSent = report.packetsSent;
                    sample.bytesSent = report.bytesSent;
                }
                if (report.type === "candidate-pair" && report.state === "succeeded") {
                    sample.rtt = report.currentRoundTripTime;
                    sample.availableOutgoingBitrate = report.availableOutgoingBitrate;
                }
            });

            if (!signaling.peerStats![id]){
                signaling.peerStats![id] = [];
            }
            signaling.peerStats![id].push(sample);
            // peerConnection.getStats(null).then((stats) => {
            //     let statsOutput = "";
            //
            //     stats.forEach((report) => {
            //         statsOutput +=
            //             `<h2>Report: ${report.type}</h2>\n<strong>ID:</strong> ${report.id}<br>\n` +
            //             `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
            //
            //         // Now the statistics for this report; we intentionally drop the ones we
            //         // sorted to the top above
            //
            //         Object.keys(report).forEach((statName) => {
            //             if (
            //                 statName !== "id" &&
            //                 statName !== "timestamp" &&
            //                 statName !== "type"
            //             ) {
            //                 statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
            //             }
            //         });
            //     });
            //
            //     document.querySelector("#latency-" + id)!.innerHTML = statsOutput;
            // });
        }, 1000);
    } catch (e) {
        console.log(e);
    }
    console.log("set new peerConnection");
    peerConnections[id] = peerConnection;
}
