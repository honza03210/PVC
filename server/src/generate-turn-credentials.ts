import {SECRET_KEY} from "./turn-secret-key.js";
import {IceServers} from "./backup-ice-server-array.js";

export async function GenerateTurnCredentials(user: string): Promise<RTCIceServer[]>{
    try {
        let response = await fetch("https://mla2.metered.live/api/v1/turn/credentials?apiKey=56c193debb416385ade8d9a77e277ea33c0f");
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        console.log("TURN server credentials received:", response);
        console.log("This might not work, as there is no way for me to check without a paid subscription");
        return await response.json();

    } catch (error) {
        console.error(error);
        return IceServers;
    }
}
