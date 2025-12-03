
// https://getstream.io/resources/projects/webrtc/basics/signaling-server/

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { signalling } from "./signalling.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

app.get('/overlay/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/overlay.html'));
});
app.get('/game/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/game.html'));
});

app.use(express.static(path.join(__dirname, '../../frontend/dist')));

const server = app.listen(3001, "0.0.0.0", () => {
    console.log('server is running on http://localhost:3001')
})

signalling(server);


