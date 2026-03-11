'use client';
import InitAudioButton from "@/components/main-menu-controls/init-audio-button";
import JoinRoomButton from "@/components/main-menu-controls/join-room-button";
import LeaveRoomButton from "@/components/main-menu-controls/leave-room-button";
import UsernameInput from "@/components/main-menu-controls/username-input";
import RoomIdInput from "@/components/main-menu-controls/room-id-input";
import PasswordInput from "@/components/main-menu-controls/password-input";
import {useAppContext} from "@/components/app-context.tsx";
import {useState} from "react";
import {useAudioCtx} from "@/components/audio-ctx.tsx";

export default function MainMenu() {
    const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
    const [connectedToRoom, setConnectedToRoom] = useState<boolean>(false);
    const [connectingToRoom, setConnectingToRoom] = useState<boolean>(false);

    const urlParams = new URLSearchParams(window.location.search);
    let audioCtx = useAudioCtx();
    const appCtx = useAppContext();

    const [usernameInput, setUsernameInput] = useState<string>(urlParams.get("username") ?? "");
    const [roomId, setRoomId] = useState<string>(urlParams.get("room_id") ?? "");
    const [password, setPassword] = useState<string>(urlParams.get("password-INSECURE") ?? "");
    const [pfpUrl, setPfpUrl] = useState<string>(urlParams.get("pfp_url") ?? "");
    return (
        <div>
            <UsernameInput value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}></UsernameInput>
            <RoomIdInput value={roomId} onChange={(e) => setRoomId(e.target.value)}></RoomIdInput>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}></PasswordInput>
            {!audioInitialized && (<InitAudioButton onClick={async () => {
                appCtx.setLocalStream(await navigator.mediaDevices.getUserMedia({audio: true}));
                setAudioInitialized(true);
                console.log("localStream bound", audioInitialized, appCtx.localStream);
                }
            }></InitAudioButton>)}
            {audioInitialized && !connectingToRoom && !connectedToRoom && (<JoinRoomButton onClick={ async () => {
                setConnectingToRoom(true);
                console.log("Join clicked");
                // RoomJoin(appCtx.signalling!, appCtx.peerConnections, appCtx.peerPositions!, appCtx.positionsSocket!);
                console.log("roomJoin");

                let IceCandidateQueue: {
                    [key: string]: {
                        popped: boolean,
                        queue: { candidate: RTCIceCandidate, sdpMid: string, sdpMLineIndex: number }[]
                    }
                } = {};

                appCtx.signalling!.BindEvents(IceCandidateQueue, appCtx.peerConnections, appCtx.peerPositions, appCtx.positionsSocket!);

                appCtx.signalling!.Send({
                    payload: {
                        roomId: roomId,
                        name: usernameInput != "" ? usernameInput : `user-${Math.random().toString(36).substring(2, 10)}`,
                        password: password,
                        pfpUrl: pfpUrl
                    }, type: "join"
                });

                console.log("join posted");
            }
            }></JoinRoomButton>)}
            {connectedToRoom && (<LeaveRoomButton></LeaveRoomButton>)}
        </div>
    )
}