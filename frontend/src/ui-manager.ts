import type {AppUI} from "./interaces/app-ui";
import {PeerConnection} from "./peer-connection";
import {AddSamplePlayer} from "./add-sample-player";

export class UIManager {
    appUI: AppUI = {
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

    PrefillFieldsFromUrl(joinButton: HTMLButtonElement){
        const urlParams = new URLSearchParams(window.location.search);
        this.appUI.nameInput.value = urlParams.get("username") ?? "";
        this.appUI.roomIDInput.value = urlParams.get("room_id") ?? "";
        if (urlParams.get("autojoin")) {
            joinButton.click();
        }
    }
    CreateAudioInitButton(peerConnections: { [key: string]: PeerConnection }, callback: () => Promise<void>, wsPositions: WebSocket){
         let audioButton = document.createElement("button");
        audioButton.innerText = "Initialize audio";

        audioButton.addEventListener("click", callback);
        document.body.appendChild(audioButton);
    }
    CreateSampleSoundButton(appUI: AppUI) {
        let sampleSoundButton = document.createElement("button");
        sampleSoundButton.innerText = "Add a sample VC member";
        sampleSoundButton.style.fontSize = "32";

        sampleSoundButton.addEventListener('click', async e => {
            await AddSamplePlayer("0", appUI, "Sample");
            sampleSoundButton.remove();
        });
        return sampleSoundButton;
    }

    CreateJoinButton(peerConnections: { [key: string]: PeerConnection }, wsPositions: WebSocket){

    }

}
