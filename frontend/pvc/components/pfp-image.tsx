import {ImgHTMLAttributes} from "react";
import {useAppContext} from "@/components/app-context.tsx";


export default function PfpImage(props: ImgHTMLAttributes<HTMLImageElement>) {
    return <img className="pfp" height="64" width="64" src="https://mc-heads.net/avatar/Honza0321/32" {...props} alt={"pfp"}/>
}