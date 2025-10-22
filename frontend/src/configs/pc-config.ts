export const PCConfig = {
    iceServers: [
        // {
        //     urls: "stun:stun.relay.metered.ca:80",
        // },
        // {
        //     urls: "turn:global.relay.metered.ca:80",
        //     username: "8239e4b73bc5b996db912fe2",
        //     credential: "jHeMsGMK16dSePFF",
        // },
        { urls: "stun:stun2.l.google.com:5349" },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "8239e4b73bc5b996db912fe2",
            credential: "jHeMsGMK16dSePFF",
        },
        // {
        //     urls: "turn:global.relay.metered.ca:443",
        //     username: "8239e4b73bc5b996db912fe2",
        //     credential: "jHeMsGMK16dSePFF",
        // },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "8239e4b73bc5b996db912fe2",
            credential: "jHeMsGMK16dSePFF",
        },
    ]
};