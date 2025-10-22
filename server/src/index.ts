
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
app.use(express.static(path.join(__dirname, '../../public')));


const server = app.listen(3000, "0.0.0.0", () => {
    console.log('server is running on http://localhost:3000')
})

signalling(server);


