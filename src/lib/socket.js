import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  withCredentials: true,
  autoConnect: false,
});

// ============================================================
// CONNECTION
// ============================================================

socket.on("connect", () => {
  console.log("🟢 Socket connected:", socket.id);
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
// The server sends the newly created/reused conversation.
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