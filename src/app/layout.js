import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/ThemeProvider";
import Providers from "@/components/Providers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "ChatHub",
    description:
        "Connect, chat, and communicate with ChatHub.",

    icons: {
        icon: "/chathub-icon.png",
        shortcut: "/chathub-icon.png",
        apple: "/chathub-icon.png",
    },
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <ThemeProvider>
                    <Providers>
                        {children}
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}