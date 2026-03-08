'use client';
import LocalAudioMenu from "@/components/local-audio-menu";
import MainMenu from "@/components/main-menu";
import PeersContainer from "@/components/peers-container";

export default function MainMenuPanel() {
    return (
        <div id="main-menu" className="menu menu-padding center-div flex-column">
            <LocalAudioMenu />
            <MainMenu />
            <PeersContainer />
        </div>
    )
}