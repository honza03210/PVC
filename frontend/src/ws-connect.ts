/**
 * Connects to specified websocket, binds onopen, onmessage, onclose, onerror
 * @param address websocket to connect
 */
export function connectPositions(address: string) {
    let socket = new WebSocket(address);

    socket.onopen = () => {
        console.log("Connection opened");
    }

    // socket.onmessage = (event: { data: any; }) => {
    //     console.log("Received:", event.data);
    //     console.log(event.data);
    // }

    socket.onclose = () => {
        console.log("Connection closed");
        setTimeout(connectPositions, 5000);
    }

    socket.onerror = (error: any) => {
        console.error("WebSocket error:", error);
        socket.close();
    };
    return socket;
}