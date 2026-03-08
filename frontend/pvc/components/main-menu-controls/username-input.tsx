import {InputHTMLAttributes} from "react";

export default function UsernameInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor="name">Username</label>
            <input type="text" id="name" {...props} />
        </div>
    )
}