import {BindStreamAnimation} from "@/services/visualization.ts";
import {ButtonHTMLAttributes, useState} from "react";
import {AudioCtxProvider} from "@/components/audio-ctx.tsx";
import {useAppContext} from "@/components/app-context.tsx";
import {RoomJoin} from "@/services/p2p.ts";


export default function InitAudioButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button id="initButton" className="menu-button" {...props}>
        Initialize
    </button>
}

