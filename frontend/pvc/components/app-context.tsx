'use client';
import {PeerConnection} from "@/services/peer-connection.ts";
import {Position} from "@/services/client-positions.ts";
import {Signaling} from "@/services/signaling.ts";
import {ClientPositions} from "@/services/client-positions.ts";
import React, {useCallback, useContext, useRef, useState} from "react";


interface AppContextType {
    peerConnections: { [id: string]: PeerConnection };
    peerPositions: { [id: string]: Position };
    localStream: MediaStream | null;
    setLocalStream: (stream: MediaStream | null) => void;
    username: string;
    setUsername: (username: string) => void;
    roomId: string;
    setRoomId: (roomId: string) => void;
    pfpUrl: string;
    setPfpUrl: (pfpUrl: string) => void;
    signalling: Signaling | null;
    positionsSocket: ClientPositions | null;
}

const AppContext = React.createContext<AppContextType | null>(null);

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext must be used inside AppContextProvider");
    return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [peerConnections, setPeerConnections] = useState({});
    const [peerPositions, setPeerPositions] = useState({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("");
    const [pfpUrl, setPfpUrl] = useState("");
    const signallingRef = useRef<Signaling | null>(null);
    const positionsSocketRef = useRef<ClientPositions | null>(null);

    return (
        <AppContext.Provider value={{
            peerConnections,
            peerPositions,
            localStream,
            setLocalStream,
            username,
            setUsername,
            roomId,
            setRoomId,
            pfpUrl,
            setPfpUrl,
            signalling: signallingRef.current,
            positionsSocket: positionsSocketRef.current,

        }}>
            {children}
        </AppContext.Provider>
    );
}