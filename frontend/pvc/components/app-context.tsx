import {PeerConnection} from "@/services/peer-connection.ts";
import {Position} from "@/services/client-positions.ts";
import {Signaling} from "@/services/signaling.ts";
import {ClientPositions} from "@/services/client-positions.ts";
import React, {useContext, useRef, useState} from "react";


interface AppContextType {
    peerConnections: { [id: string]: PeerConnection };
    peerPositions: { [id: string]: Position };
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
    const signallingRef = useRef<Signaling | null>(null);
    const positionsSocketRef = useRef<ClientPositions | null>(null);

    return (
        <AppContext.Provider value={{
            peerConnections,
            peerPositions,
            signalling: signallingRef.current,
            positionsSocket: positionsSocketRef.current
        }}>
            {children}
        </AppContext.Provider>
    );
}