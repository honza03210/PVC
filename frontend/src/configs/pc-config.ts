export const PCConfig = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:standard.relay.metered.ca:80",
            username: "bc9997c2871a647d2bf4ffc1",
            credential: "zfqpGjMnRwBcwNS1",
        },
        {
            urls: "turn:standard.relay.metered.ca:80?transport=tcp",
            username: "bc9997c2871a647d2bf4ffc1",
            credential: "zfqpGjMnRwBcwNS1",
        },
        {
            urls: "turn:standard.relay.metered.ca:443",
            username: "bc9997c2871a647d2bf4ffc1",
            credential: "zfqpGjMnRwBcwNS1",
        },
        {
            urls: "turns:standard.relay.metered.ca:443?transport=tcp",
            username: "bc9997c2871a647d2bf4ffc1",
            credential: "zfqpGjMnRwBcwNS1",
        },
    ],
};