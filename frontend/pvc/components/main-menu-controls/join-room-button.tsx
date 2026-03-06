export default function JoinRoomButton() {

    const handleJoinRoomButtonClick = () => {
        joinButton.style.display = "none";
        document.getElementById("3DInitButton")!.style.display = "none";
        let appCtx = useAppContext();
        RoomJoin(appCtx.signalling!, appCtx.peerConnections, appCtx.peerPositions!, appCtx.positionsSocket!);
    }
    return <button id="joinRoomButton" className="menu-button hidden">Join</button>
}

