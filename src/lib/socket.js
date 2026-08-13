"use client";

import { io } from "socket.io-client";

// ============================================================
// SOCKET URL
// ============================================================
//
// Local:
// NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
//
// Render:
// NEXT_PUBLIC_SOCKET_URL=https://your-chathub-service.onrender.com
//
// If the environment variable is missing, localhost is used.
//

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000");

// ============================================================
// SOCKET INSTANCE
// ============================================================

export const socket = io(SOCKET_URL, {
    withCredentials: true,

    // Keep your existing behavior.
    // ChatLayout / another component can call socket.connect()
    // when the user is authenticated.
    autoConnect: false,
});

// ============================================================
// CONNECTION
// ============================================================

socket.on("connect", () => {
    console.log(
        "🟢 Socket connected:",
        socket.id
    );

    console.log(
        "🔌 Socket URL:",
        SOCKET_URL
    );
});

socket.on("disconnect", (reason) => {
    console.log(
        "🔴 Socket disconnected:",
        reason
    );
});

socket.on("connect_error", (error) => {
    console.error(
        "❌ Socket connection error:",
        error.message
    );
});

// ============================================================
// FRIEND REQUEST ACCEPTED
// ============================================================
//
// This event is emitted when a friend request is accepted.
//
// The server sends:
// - friendRequest
// - conversation
//
// Components can also listen to this event themselves.
// This listener is mainly useful for debugging.
//

socket.on(
    "friend_request_accepted",
    ({
        friendRequest,
        conversation,
    }) => {
        console.log(
            "🤝 Friend request accepted"
        );

        console.log(
            "Friend request:",
            friendRequest
        );

        console.log(
            "Conversation:",
            conversation
        );
    }
);