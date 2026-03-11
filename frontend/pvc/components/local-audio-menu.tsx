'use client';
import VisualizationCanvas from "@/components/visualization-canvas.tsx";
import {useAppContext} from "@/components/app-context.tsx";
import {useAudioCtx} from "@/components/audio-ctx.tsx";
import PfpImage from "@/components/pfp-image.tsx";

export default function LocalAudioMenu() {
	const appCtx = useAppContext();
	const audioCtx = useAudioCtx();
    return (
        <div id="audio-menu" className="menu menu-padding center-div flex-column rounded">
			{appCtx.localStream && audioCtx && (<PfpImage/>)}
			<VisualizationCanvas stream={appCtx.localStream} audioCtx={audioCtx}></VisualizationCanvas>
		  	<audio id="localAudio" autoPlay muted></audio>
		</div>
    )
}