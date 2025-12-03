import type {AppUI} from "./interaces/app-ui";
import {PeerConnection} from "./peer-connection";
import {RoomJoin} from "./p2p";
import {AddSamplePlayer} from "./add-sample-player";
import {io} from "socket.io-client";
import {ServerConfig} from "./configs/server-config";
import {Signalling} from "./signalling";
import {Startup} from "./main";
import {ClientPositions, Position} from "./client-positions";

export class UIManager {
    static appUI: AppUI;
    static inRoom: boolean = false;
    static buttonsBound = false;
    static Is3DOn(){
        return document.getElementById("aFrameScene")?.style.display !== "none";
    }

    static Initialize() {
        UIManager.appUI = {
            localVideo: document.getElementById('localVideo') as HTMLCanvasElement,
            localAudio: document.getElementById('localAudio') as HTMLAudioElement,
            nameInput: document.getElementById('name') as HTMLInputElement,
            passwordInput: document.getElementById("password") as HTMLInputElement,
            roomIDInput: document.getElementById("roomID") as HTMLInputElement,
            roomList: document.getElementById("roomList") as HTMLDivElement,
            errorMsgLabel: document.getElementById("errorMsg") as HTMLDivElement,
            videoContainer: document.getElementById("videoContainer") as HTMLDivElement,
            manualPositions: document.getElementById("manualPositions") as HTMLInputElement,
            distanceFalloff: document.getElementById("distanceFalloff") as HTMLInputElement,
            audioCtx: new AudioContext(),
        }
    }

    static PrefillFieldsFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        UIManager.appUI.nameInput.value = urlParams.get("username") ?? "";
        UIManager.appUI.roomIDInput.value = urlParams.get("room_id") ?? "";
        if (urlParams.get("autojoin") && !this.buttonsBound) {
            document.getElementById("joinRoomButton")?.click();
        }
    }

    static EnableInitButton(peerConnections: { [p: string]: PeerConnection }, peerPositions: {[p: string]: Position}, positionsSocket: ClientPositions) {
        // let initButton = document.createElement("button");
        // initButton.innerText = "Initialize"
        // initButton.classList.add("menu-button");
        // initButton.style.fontSize = "32";

        let initButton = document.getElementById("initButton") as HTMLButtonElement;

        let supportsSharedWorkers: boolean
        try {
            new SharedWorker(
                URL.createObjectURL(new Blob([""], {type: "text/javascript"}))
            );
            supportsSharedWorkers = true;
        } catch (e) {
            supportsSharedWorkers = false;
        }
        console.log("Shared worker: ", supportsSharedWorkers);


        let comm;

        if (supportsSharedWorkers) {
            comm = io(ServerConfig.url, {
                transports: ['websocket', 'polling'],
                withCredentials: true,
            });
        } else {
            const worker = new SharedWorker(new URL('/src/shared-signalling-worker.ts', import.meta.url), {type: "module"});
            console.log("worker " + worker);
            comm = worker.port;

            comm.start();
            console.log("port " + comm + " ; ");
        }
        let signalling: Signalling = new Signalling(comm);
        signalling.Send({type: "listRooms", payload: {}});
        signalling.BindEvents({}, peerConnections, {}, positionsSocket);

        if (!this.buttonsBound) {
            initButton.addEventListener('click', e => {
                this.EnableJoinButton(peerConnections, peerPositions, positionsSocket, signalling);
                initButton.style.display = "none";
            })
        }
        initButton.style.display = "block";
    }

    static EnableJoinButton(peerConnections: { [p: string]: PeerConnection }, peerPositions: {[p: string]: Position}, positionsSocket: ClientPositions,
                            signalling: Signalling) {
        let joinButton = document.getElementById("joinRoomButton") as HTMLButtonElement;

        if (!this.buttonsBound) {
            console.log("join button bound");
            joinButton.addEventListener('click', e => {
                let passwordDialogue = document.getElementById("passwordDialogue")! as HTMLDialogElement;
                // passwordDialogue.showModal();
                joinButton.style.display = "none";
                document.getElementById("3DInitButton")!.style.display = "none";
                RoomJoin(signalling, peerConnections, peerPositions, positionsSocket);
            });
        }
        joinButton.style.display = "block";
    }

    static EnableDisconnectButton(signalling: Signalling){
        let disconnectButton = document.getElementById("leaveRoomButton") as HTMLButtonElement;

        if (!this.buttonsBound) {
            disconnectButton.addEventListener('click', async e => {
                this.buttonsBound = true;
                //signalling.Close();
                document.querySelectorAll(".roomBound").forEach((elem) => {elem.remove()})
                signalling.Send({type: "roomLeave"});
                this.CleanButtonsForStartup();
                await Startup();
            })
        }
        disconnectButton.style.display = "block";
    }


    static CleanButtonsForStartup(){
        document.getElementById("leaveRoomButton")!.style.display = "none";
        document.getElementById("sampleSoundButton")!.remove();
    }


    static CreateSampleSoundButton() {
        let sampleSoundButton = document.createElement("button");
        sampleSoundButton.id = "sampleSoundButton";
        sampleSoundButton.innerText = "Add a sample VC member";
        sampleSoundButton.classList.add("menu-button");
        sampleSoundButton.style.fontSize = "32";

        sampleSoundButton.addEventListener('click', async e => {
            await AddSamplePlayer("0", "Sample");
            sampleSoundButton.remove();
        });
        return sampleSoundButton;
    }

    static ShowPasswordDialogue() {
        let popUp = document.createElement("div");
        let passwordField = document.createElement("input");
        passwordField.setAttribute("type", "text");
        popUp.append(passwordField);
        document.body.append()
    }
}
