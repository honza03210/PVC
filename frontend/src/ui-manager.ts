import type {AppUI} from "./interaces/app-ui";
import {PeerConnection} from "./peer-connection";
import {RoomJoin} from "./p2p";
import {AddSamplePlayer} from "./add-sample-player";
import {Init3D} from "./visualization";

export class UIManager {
    static appUI: AppUI;
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

    static PrefillFieldsFromUrl(joinButton: HTMLButtonElement) {
        const urlParams = new URLSearchParams(window.location.search);
        UIManager.appUI.nameInput.value = urlParams.get("username") ?? "";
        UIManager.appUI.roomIDInput.value = urlParams.get("room_id") ?? "";
        if (urlParams.get("autojoin")) {
            joinButton.click();
        }
    }

    static CreateJoinButton(peerConnections: {
        [key: string]: PeerConnection
    }, positionsSocket: WebSocket | null): HTMLButtonElement {
        let joinButton = document.createElement("button");
        joinButton.innerText = "Join"
        joinButton.classList.add("menu-button");
        joinButton.style.fontSize = "32";
        let supportsSharedWorkers: boolean
        try {
            new SharedWorker(
                URL.createObjectURL(new Blob([""], {type: "text/javascript"}))
            );
            supportsSharedWorkers = true;
        } catch (e) {
            supportsSharedWorkers = false;
        }

        joinButton.addEventListener('click', e => {
            let passwordDialogue = document.getElementById("passwordDialogue")! as HTMLDialogElement;
            // passwordDialogue.showModal();
            joinButton.remove();
            console.log("Join initiated - Shared worker: " + supportsSharedWorkers);
            RoomJoin(supportsSharedWorkers, peerConnections, positionsSocket)
        });
        return joinButton;
    }

    static Create3DInitButton(positionsSocket: WebSocket | null) {
        let button = document.createElement("button");
        button.type = "button";
        button.classList.add("menu-button");
        button.innerText = "Go 3D";
        button.addEventListener("click", () => Init3D(positionsSocket));
        return button;
    }

    static CreateSampleSoundButton() {
        let sampleSoundButton = document.createElement("button");
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
