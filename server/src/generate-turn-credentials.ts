import {SECRET_KEY} from "./turn-secret-key.js";
import {IceServers} from "./backup-ice-server-array.js";


/**
 * There should be a dynamic IceServer array generation, but the free metered.ca tier doesn't allow that.
 * It's not a security issue for the users though, the only problem is that anyone can use up the TURN server quota
 * @param user
 * @constructor
 */
export async function GenerateTurnCredentials(user: string): Promise<RTCIceServer[]>{
    try {
        let response = await fetch(`https://mla2.metered.live/api/v1/turn/credentials?apiKey=${SECRET_KEY}`);
        if (!response.ok) {
            console.log("Network response was not ok - server credentials not generated - sending the backup", IceServers);
            return IceServers;
        }

        console.log("TURN server credentials received:", response);
        console.log("This might not work, as there is no way for me to check without a paid subscription");
        return await response.json();

    } catch (error) {
        console.error(error);
        console.log("TURN server credentials not generated - sending the backup", IceServers);
        return IceServers;
    }
}
