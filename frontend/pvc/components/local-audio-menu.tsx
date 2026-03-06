export default function LocalAudioMenu() {
    return (
        <div id="audio-menu" className="menu menu-padding center-div flex-column rounded">
		  <canvas id="localVideo"></canvas>
		  <audio id="localAudio" autoPlay muted></audio>
		</div>
    )
}