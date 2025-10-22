import { Server } from "socket.io";
import argon2id from "argon2";

// TODO - server typing
export function signalling(server : any) {
    const io = new Server(server, {
        cors: {
            origin: ["https://jaguar-magnetic-deer.ngrok-free.app"], // your ngrok domain
            methods: ["GET", "POST"],
            credentials: true // allow cookies/auth headers if needed
        },
    });

    // roomID[socketID : username]
    let rooms : {[key: string]: { [id: string] : string }} = {};

    // argon2 hashed
    let roomsPasswords: {[key: string]: string} = {};

    io.on("connection", socket => {
        console.log("new socket connected: " + socket.id);
        socket.on("listRooms", (data) => {
            console.log("listRooms: " +  Object.keys(rooms).join("\r\n") + "listRooms END");
            socket.emit("listRooms", { roomsList: Object.keys(rooms).join("\r\n") });
        });

        // socket.on("ready", async data => {
        //     console.log(socket.id + " ready")
        //     const users = Object.values(rooms[socket.data.roomId]!);
        //     socket.broadcast.to(socket.data.roomId).emit("PeerReady", { id: socket.id });
        // });
        socket.on("join", async data => {
            console.log("got join from " + socket.id);
            if (socket.rooms.size > 1) {
                console.log([socket.rooms.values()]);
                socket.emit("error", {message: "You are already connected to a room"} );
                return
            }

            const roomId: string = data.roomId
            // room exists -> try to join with received password
            if (rooms[roomId]) {
                // if for some reason no room password hash is stored
                if (!roomsPasswords[roomId]) {
                    socket.emit("error", {message: "Room not found"} );
                    return;
                }
                if (!await argon2id.verify(roomsPasswords[roomId], data.password)){
                    socket.emit("error", {message: "Invalid password"} );
                    return
                }
            // room doesn't exist -> it will be created and its password hash set by this first users used password
            } else {
                roomsPasswords[roomId] = await argon2id.hash(data.password);
            }
            socket.join(roomId);
            socket.data.roomId = roomId;
            console.log("joined room: " + roomId);

            // add the user to the room
            if (rooms[roomId]) {
                rooms[roomId][socket.id] = data.name;
            } else {
                rooms[roomId] = {};
                rooms[roomId][socket.id] = data.name;
            }

            // const users = Object.values(rooms[roomId]);
            // socket.broadcast.to(socket.data.roomId).emit("room_users", { id: socket.id, users: users.join(", ")});
            console.log("[joined] room:" + roomId + " name: " + data.name);
            socket.broadcast.to(socket.data.roomId).emit("PeerJoined", { id: socket.id });
            setTimeout(() =>{ listUserIDs(socket, socket.data.roomId) }, 5000)

        });

        socket.on("offer", (payload: {dest: string, sdp: any}) => {
            io.to(payload.dest).emit("getOffer", {id: socket.id, sdp: payload.sdp});
            console.log("offer from " + socket.id + " to " + payload.dest);
        });
        socket.on("answerAck", (payload: {dest: string}) => {
            io.to(payload.dest).emit("getAnswerAck", {id: socket.id});
            console.log("answer ack from " + socket.id + " to " + payload.dest);
        });

        socket.on("answer", (payload: {dest: string, sdp: any}) => {
            io.to(payload.dest).emit("getAnswer", {id: socket.id, sdp: payload.sdp});
            console.log("answer from " + socket.id + " to " + payload.dest);
        });

        socket.on("candidate", (payload:  { dest: string, candidate: RTCIceCandidate }) => {
            io.to(payload.dest).emit("getCandidate", {id: socket.id, candidate: payload});
            console.log("candidate from " + socket.id + payload.candidate);
        });
        socket.on("disconnect", () => {
            if (socket.data.roomId === undefined) {
                console.error("User not present in any room");
                return;
            }
            console.log("user left roomId: " + socket.data.roomId);
            let room = rooms[socket.data.roomId];
            if (room) {
                delete rooms[socket.data.roomId]![socket.id];
                // TODO - this doesn't delete empty rooms
                if (Object.keys(rooms[socket.data.roomId]!).length === 0) {
                    delete rooms[socket.data.roomId];
                    console.log(socket.data.roomId + "deleted");
                    return;
                }
            }
            if (typeof room === "undefined") {
                return;
            }
            socket.broadcast.to(Object.keys(rooms[socket.data.roomId]!)).emit("user_exit", {id: socket.id});
            console.log(`[${socket.data.roomId}]: ${socket.id} exit`);
        });
    });

    function listUserIDs(socket: any, roomID: string) {
        try {
            socket.emit("listUsers", { selfID:socket.id, userIDs: Object.keys(rooms[roomID]!)});
            setTimeout(() => {
                listUserIDs(socket, roomID)
            }, 5000);
        } catch(err) {
        }
    }
}

// function getRoom(socket: any){
//     let rooms = [...socket.rooms].filter(r => r != socket.id);
//     console.log(rooms.join(";") + "rooms of the " + socket.id);
//     if (rooms.length == 0) {
//         return undefined;
//     }
//     return rooms[0];
// }
