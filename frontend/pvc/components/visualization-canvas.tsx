'use client';
import { useEffect, useRef } from "react";
import {convolutionAverageAroundIndex} from "@/services/visualization.ts";

type Props = {
    stream: MediaStream | null;
    audioCtx: AudioContext | null;
    size?: number;
};

export default function VisualizationCanvas({ stream, audioCtx, size = 128 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !stream || !audioCtx) {
            console.log("canvas not loaded - no sources", canvasRef.current, stream, audioCtx);
            return;
        }
        const canvas = canvasRef.current;
        console.log("VisualizationCanvas canvas", canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = size;
        canvas.height = size;

        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId: number;

        function draw() {
            analyser.getByteTimeDomainData(dataArray);
            ctx!.clearRect(0, 0, size, size);

            const cx = size / 2;
            const cy = size / 2;
            const baseRadius = size / 3;

            for (let i = 0; i < bufferLength; i++) {
                const angle = -(i / bufferLength) * Math.PI * 2 - Math.PI / 2;
                const value = 0.1 + 10 * Math.abs(0.5 - convolutionAverageAroundIndex(dataArray, i, 6));
                const barHeight = value * 32;

                const innerX = cx + baseRadius * Math.cos(angle);
                const innerY = cy + baseRadius * Math.sin(angle);

                const outerX = cx + (baseRadius + barHeight) * Math.cos(angle);
                const outerY = cy + (baseRadius + barHeight) * Math.sin(angle);

                ctx!.beginPath();
                ctx!.moveTo(innerX, innerY);
                ctx!.lineTo(outerX, outerY);
                ctx!.strokeStyle = "rgba(255,255,255,0.8)";
                ctx!.lineWidth = 2;
                ctx!.stroke();
            }

            animationId = requestAnimationFrame(draw);

        }

        animationId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationId);
            analyser.disconnect();
            source.disconnect();
        };
    }, [stream, audioCtx, size]);

    return <canvas ref={canvasRef} style={{ borderRadius: "50%" }} />;
}

