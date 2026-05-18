import {Server} from "socket.io";
import {allowedOrigins} from "../allowed-origins.js";
import {RoomState} from "./state.js";
import {
    handleAnswer,
    handleAnswerAck,
    handleCandidate,
    handleJoin,
    handleOffer,
    handleRoomLeave,
    listRooms,
} from "./handlers.js";

/**
 * Binds all the needed events for basic signaling.
 */
export function signaling(server: any) {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.engine.on("connection_error", (err) => {
        console.error("socket io engine error", {
            code: err.code,
            message: err.message,
            context: err.context,
        });
    });

    const state = new RoomState();

    io.on("connection", socket => {
        socket.emit("connected");
        listRooms(state, socket, true);
        socket.on("listRooms", () => {
            listRooms(state, socket, false);
        });

        socket.on("join", data => handleJoin(state, socket, data));
        socket.on("offer", payload => handleOffer(state, io, socket, payload));
        socket.on("answerAck", payload => handleAnswerAck(state, io, socket, payload));
        socket.on("answer", payload => handleAnswer(state, io, socket, payload));
        socket.on("candidate", payload => handleCandidate(state, io, socket, payload));
        socket.on("roomLeave", () => handleRoomLeave(state, socket));
        socket.on("disconnect", () => state.handleUserRoomDisconnected(socket));
    });
}
