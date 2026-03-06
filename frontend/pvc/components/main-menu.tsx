import InitAudioButton from "@/components/main-menu-controls/init-audio-button";
import JoinRoomButton from "@/components/main-menu-controls/join-room-button";
import LeaveRoomButton from "@/components/main-menu-controls/leave-room-button";
import UsernameInput from "@/components/main-menu-controls/username-input";
import RoomIdInput from "@/components/main-menu-controls/room-id-input";
import PasswordInput from "@/components/main-menu-controls/password-input";

export default function MainMenu() {
    return (
        <div>
            {UsernameInput()}
            {RoomIdInput()}
            {PasswordInput()}
            {InitAudioButton()}
            {JoinRoomButton()}
            {LeaveRoomButton()}
        </div>
    )
}