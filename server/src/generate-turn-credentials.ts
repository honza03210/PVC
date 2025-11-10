import {SECRET_KEY} from "./turn-secret-key.js";

export async function GenerateTurnCredentials(): Promise<Response> {
    return await fetch(`https://mla2.metered.live/api/v1/turn/credential?secretKey=${SECRET_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "expiryInSeconds": 14400,
            "label": "user-1"
        }),
    })
}
