import type {Server, Socket} from "socket.io";
import argon2id from "argon2";
import {RoomState} from "./state.js";
import {sendUserCredentials} from "./credentials.js";


/**
 * Emits the current room list to a single socket. With repeat=true, schedules itself to keep
 * the client's room listing fresh while connected.
 */
export function listRooms(state: RoomState, socket: Socket, repeat: boolean): void {
    try {
        socket.emit("listRooms", {
            roomsList: Object.entries(state.rooms).map(([roomID, users]) =>
                ({roomID, numberOfUsers: Object.keys(users).length}))
        });
        if (repeat && socket.connected) {
            setTimeout(() => { listRooms(state, socket, true); }, 5000);
        }
    } catch (err) {
        console.log("Error: ", err);
    }
}

/**
 * Emits userIDs of others connected to a room to the given socket. Loops while the user is in a room.
 */
export function listUserIDs(state: RoomState, socket: Socket, roomID: string): void {
    try {
        const room = state.rooms[roomID];
        if (!room || !socket.connected) return;
        socket.emit("listUsers", {selfID: socket.id, userIDs: Object.keys(room)});
        if (state.usernames[socket.id]) {
            setTimeout(() => { listUserIDs(state, socket, roomID); }, 10000);
        }
    } catch (err) {
        console.error("listUserIDs error:", err);
    }
}

export async function handleJoin(state: RoomState, socket: Socket, data: any): Promise<void> {
    if (!data) return;
    if (socket.rooms.size > 1) {
        socket.emit("error", {message: "You are already connected to a room"});
        return;
    }

    const roomId: string = data.roomId;
    // room exists -> try to join with received password
    if (state.rooms[roomId]) {
        if (!state.roomsPasswords[roomId]) {
            socket.emit("error", {message: "Room not found"});
            return;
        }
        if (!await argon2id.verify(state.roomsPasswords[roomId], data.password)) {
            socket.emit("error", {message: "Invalid password"});
            return;
        }
    // room doesn't exist -> it will be created and its password hash set by this first user's password
    } else {
        state.roomsPasswords[roomId] = await argon2id.hash(data.password);
    }
    socket.join(roomId);
    socket.data.roomId = roomId;

    // add the user to the room
    if (state.rooms[roomId]) {
        state.rooms[roomId][socket.id] = data.name;
    } else {
        state.rooms[roomId] = {};
        state.rooms[roomId][socket.id] = data.name;
    }

    state.usernames[socket.id] = data.name;
    socket.broadcast.to(socket.data.roomId).emit("PeerJoined", {
        id: socket.id,
        username: data.name,
        pfpUrl: data.pfpUrl ?? ""
    });
    socket.emit("roomConnected", {selfID: socket.id, roomID: roomId});
    await sendUserCredentials(socket, data.name);
    setTimeout(() => { listUserIDs(state, socket, socket.data.roomId); }, 5000);
}

export function handleOffer(state: RoomState, io: Server, socket: Socket, payload: {dest: string, sdp: any, pfpUrl: any}): void {
    if (!payload || !payload.dest || !payload.sdp) return;
    if (!state.inSameRoom(socket, payload.dest)) {
        return;
    }
    io.to(payload.dest).emit("getOffer", {
        id: socket.id,
        sdp: payload.sdp,
        username: state.usernames[socket.id],
        pfpUrl: payload.pfpUrl
    });
}

export function handleAnswerAck(state: RoomState, io: Server, socket: Socket, payload: {dest: string}): void {
    if (!payload || !payload.dest) return;
    if (!state.inSameRoom(socket, payload.dest)) return;
    io.to(payload.dest).emit("getAnswerAck", {id: socket.id});
}

export function handleAnswer(state: RoomState, io: Server, socket: Socket, payload: {dest: string, sdp: any}): void {
    if (!payload || !payload.dest || !payload.sdp) return;
    if (!state.inSameRoom(socket, payload.dest)) return;
    io.to(payload.dest).emit("getAnswer", {id: socket.id, sdp: payload.sdp});
}

export function handleCandidate(state: RoomState, io: Server, socket: Socket, payload: {dest: string, candidate: RTCIceCandidate}): void {
    if (!payload || !payload.dest || !payload.candidate) return;
    if (!state.inSameRoom(socket, payload.dest)) return;
    io.to(payload.dest).emit("getCandidate", {id: socket.id, candidate: payload});
}

export function handleRoomLeave(state: RoomState, socket: Socket): void {
    if (socket.data.roomId) {
        socket.leave(socket.data.roomId);
        state.handleUserRoomDisconnected(socket);
        socket.data.roomId = undefined;
    }
}
