import {useAppContext} from "@/components/app-context.tsx";
import {RoomJoin} from "@/services/p2p.ts";
import {ButtonHTMLAttributes, useState} from "react";


export default function JoinRoomButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button id="joinRoomButton" className="menu-button" {...props}>Join</button>
}

