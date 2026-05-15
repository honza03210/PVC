import type {Socket} from "socket.io";

export class RoomState {
    // socketID : username
    usernames: {[key: string]: string} = {};

    // roomID : { socketID : username }
    rooms: {[key: string]: {[id: string]: string}} = {};

    // roomID : argon2-hashed password
    roomsPasswords: {[key: string]: string} = {};

    inSameRoom(socket: Socket, destId: string): boolean {
        const roomId = socket.data.roomId;
        const room = this.rooms[roomId];
        const result = roomId !== undefined && room !== undefined && destId in room;
        if (!result) {
            console.log("[inSameRoom] FAIL", {
                senderId: socket.id,
                senderRoomId: roomId,
                destId,
                roomExists: room !== undefined,
                destInRoom: room !== undefined && destId in room,
                allRooms: Object.fromEntries(Object.entries(this.rooms).map(([rid, r]) => [rid, Object.keys(r)])),
            });
        }
        return result;
    }

    /**
     * Cleans up state when a user leaves or disconnects, broadcasts to remaining peers.
     */
    handleUserRoomDisconnected(socket: Socket): void {
        delete this.usernames[socket.id];

        if (socket.data.roomId === undefined) {
            console.error("User not present in any room");
            return;
        }
        console.log("user left roomId: " + socket.data.roomId);
        const room = this.rooms[socket.data.roomId];
        if (room) {
            delete this.rooms[socket.data.roomId]![socket.id];
            if (Object.keys(this.rooms[socket.data.roomId]!).length === 0) {
                delete this.rooms[socket.data.roomId];
                delete this.roomsPasswords[socket.data.roomId];
                console.log(socket.data.roomId + "deleted");
                return;
            }
        }
        if (typeof room === "undefined") {
            return;
        }
        console.log("userDisconnected broadcast");
        socket.broadcast.to(socket.data.roomId).emit("userDisconnected", {id: socket.id});
        console.log(`[${socket.data.roomId}]: ${socket.id} exit`);
    }
}