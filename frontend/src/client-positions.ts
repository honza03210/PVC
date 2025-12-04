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
export class ClientPositions extends Position {
    communicator: WebSocket | Window | null = null;
    parentWindow: Window | null = null;
    constructor(communicator: string | Window) {
        super();
        if (typeof communicator === "string") {
            this.communicator = new WebSocket(communicator);
        } else {
            this.communicator = window;
            this.parentWindow = communicator;
        }
        this.BindWebSocketMessages();
    }

    Send(data: any) {
        if (!this.communicator){
            return;
        }

        if (this.communicator instanceof WebSocket) {
            this.communicator.send(JSON.stringify(data))
        } else if (this.communicator instanceof Window) {
            this.parentWindow!.postMessage(data);
        }
    }


    BindWebSocketMessages() {
        console.log("BindWebSocketMessages", this.communicator);
        if (!this.communicator) {
            return;
        }
        this.communicator.addEventListener("open", () => {
            console.log("Connection opened");
        });

        this.communicator.addEventListener("message", (event: any) => {
            if (!event.data) {
                return;
            }
            console.log("Received:", event.data);
            let data = event.data.split(";");

            if (data[0] == "GAME_EVENT") return;

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

        this.communicator.addEventListener("close", () => {
            console.log("Connection closed");
            this.PositionFormat = null;
        });

        this.communicator.addEventListener("error", (error: any) => {
            console.error("WebSocket error:", error);
            this.communicator?.close();
        });
        console.log("EndBindWebSocketMessages");
    }
}