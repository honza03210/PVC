export interface AppUI {
    localVisualization: HTMLCanvasElement;
    localAudio: HTMLAudioElement;
    audioMenu: HTMLDivElement;
    nameInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    roomIDInput: HTMLInputElement;
    roomList: HTMLDivElement;
    errorMsgLabel: HTMLDivElement;
    peerContainer: HTMLDivElement;
    audioCtx: AudioContext | undefined;
    localAudioStream: MediaStream | undefined;

}
