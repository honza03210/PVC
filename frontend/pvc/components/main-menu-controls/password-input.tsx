import {InputHTMLAttributes} from "react";

export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" {...props} />
        </div>
    )
}