import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import {AppProvider} from "@/components/app-context.tsx";
import {AudioCtxProvider} from "@/components/audio-ctx.tsx";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "PVC",
    description: "Proximity Voice Chat",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AppProvider>
                    <AudioCtxProvider>
                        {children}
                    </AudioCtxProvider>
                </AppProvider>
            </body>
        </html>
    );
}
