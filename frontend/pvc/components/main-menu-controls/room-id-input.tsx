import {InputHTMLAttributes} from "react";

export default function RoomIdInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor="roomID">Room Name</label>
            <input type="text" id="roomID" {...props} />
        </div>
    )
}