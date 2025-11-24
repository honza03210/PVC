export class Position {
    Positions: {x: number, y: number, z: number} = {x: 0, y: 0, z: 0};
    Rotation: {vertical: number, horizontal: number} = {vertical: 0, horizontal: 0};
    PositionFormat: string | null = null;
    RawPositions: string = "";
}

/**
 * Connects to specified websocket, binds onopen, onmessage, onclose, onerror
 * @param address websocket to connect
 */
export class ClientPositions extends Position{
    socket: WebSocket | null = null;
    constructor(address: string) {
        super();
        this.socket = new WebSocket(address);

        this.socket.addEventListener("open", () => {
            console.log("Connection opened");
        });

        this.socket.addEventListener("message", (event: { data: string; }) => {
            console.log("Received:", event.data);
            let data = event.data.split(";");
            this.RawPositions = data.slice(1, data.length).join(";");
            try {
                this.PositionFormat = data[0];
                this.Positions.x = parseFloat(data[1]);
                this.Positions.y = parseFloat(data[2]);
                this.Positions.z = parseFloat(data[3]);
                this.Rotation.horizontal = parseFloat(data[4]);
                this.Rotation.vertical = parseFloat(data[5]);
            } catch (e) {
                // The websocket doesn't need to send all positions (2d games, games with no rotation,...)
                // console.error(e);
            }
        });

        this.socket.addEventListener("close", () => {
            console.log("Connection closed");
            this.PositionFormat = null;
        });

        this.socket.addEventListener("error", (error: any) => {
            console.error("WebSocket error:", error);
            this.socket?.close();
        });
    }
}