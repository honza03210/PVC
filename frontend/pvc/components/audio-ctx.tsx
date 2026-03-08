'use client';
import {createContext, useContext, useState, ReactNode, useEffect} from "react";

const AudioCtxContext = createContext<AudioContext | null>(null);

export function AudioCtxProvider({ children }: { children: ReactNode }) {
    const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

    useEffect(() => {
        const ctx = new AudioContext();
        setAudioCtx(ctx);

        return () => {
            ctx.close();
        };
    }, []);

    return (
        <AudioCtxContext.Provider value={audioCtx}>
            {children}
        </AudioCtxContext.Provider>
    );
}

export function useAudioCtx() {
    return useContext(AudioCtxContext);
}