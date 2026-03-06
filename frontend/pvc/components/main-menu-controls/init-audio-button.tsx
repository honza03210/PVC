import {BindStreamAnimation} from "@/services/visualization.ts";
import { useState } from "react";
import {AudioCtxProvider} from "@/components/audio-ctx.tsx";
import {useAppContext} from "@/components/app-context.tsx";
import {RoomJoin} from "@/services/p2p.ts";


export default function InitAudioButton() {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    const handleInitAudio = async () => {
        await navigator.mediaDevices
            .getUserMedia({
                audio: true,
            })
            .then(stream => {
                BindStreamAnimation(stream);
            });
        joinButton.style.display = "block";
        setVisible(false);
    }


    return <button id="initButton" className="menu-button hidden" onClick={handleInitAudio}>Initialize</button>
}

