export const PCConfig = {
    iceServers: [
        // {
        //     urls: "stun:stun.relay.metered.ca:80",
        // },
        // {
        //     urls: "turn:standard.relay.metered.ca:80",
        //     username: "894edd5b6adf9a3102935f64",
        //     credential: "6ZSXB3HxCMFXRfFX",
        // },
        {
            urls: "turn:standard.relay.metered.ca:80?transport=tcp",
            username: "894edd5b6adf9a3102935f64",
            credential: "6ZSXB3HxCMFXRfFX",
        },
        // {
        //     urls: "turn:standard.relay.metered.ca:443",
        //     username: "894edd5b6adf9a3102935f64",
        //     credential: "6ZSXB3HxCMFXRfFX",
        // },
        {
            urls: "turns:standard.relay.metered.ca:443?transport=tcp",
            username: "894edd5b6adf9a3102935f64",
            credential: "6ZSXB3HxCMFXRfFX",
        },
    ],
};