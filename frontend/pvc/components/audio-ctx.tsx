import { createContext, useContext, useState, ReactNode } from "react";

const AudioCtxContext = createContext<AudioContext | null>(null);

export function AudioCtxProvider({ children }: { children: ReactNode }) {
    const [audioCtx] = useState(() => new AudioContext());

    return (
        <AudioCtxContext.Provider value={audioCtx}>
            {children}
        </AudioCtxContext.Provider>
    );
}

export function useAudioCtx() {
    const ctx = useContext(AudioCtxContext);
    if (!ctx) throw new Error("AudioCtxProvider error");
    return ctx;
}