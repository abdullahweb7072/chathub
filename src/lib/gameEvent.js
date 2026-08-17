// ============================================================
// GAME SOCKET EVENTS
// ============================================================

export function getGameRoom(gameId) {
    return `game:${gameId}`;
}

export function getConversationRoom(conversationId) {
    return `conversation:${conversationId}`;
}

export function emitGameEvent(
    io,
    conversationId,
    event,
    game
) {
    if (!io) {
        console.warn(
            "⚠️ Socket.IO instance is not available for game event:",
            event
        );

        return;
    }

    io
        .to(getConversationRoom(conversationId))
        .emit(event, game);
}