
"use client";

import { useEffect, useState } from "react";

export default function FriendsList({
    onOpenConversation,
    currentUserId,
}) {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ============================================================
    // LOAD FRIENDS
    // ============================================================

    const loadFriends = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                "/api/friends",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                        "Failed to load friends"
                );
            }

            setFriends(data.data || []);
        } catch (error) {
            console.error(
                "❌ LOAD FRIENDS ERROR:",
                error
            );

            setError(
                error.message ||
                    "Failed to load friends"
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // LOAD ON MOUNT
    // ============================================================

    useEffect(() => {
        loadFriends();
    }, []);

    // ============================================================
    // OPEN CONVERSATION
    // ============================================================

    const handleOpenConversation = (
        friendItem
    ) => {
        if (!friendItem?.conversation?.id) {
            console.warn(
                "No conversation found for friend:",
                friendItem
            );

            return;
        }

        onOpenConversation?.({
            id: friendItem.conversation.id,
            type: "DIRECT",
            friend: friendItem.friend,
        });
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <div
                className="
                    flex
                    h-full
                    items-center
                    justify-center
                    bg-background
                    text-foreground
                    transition-colors
                    duration-200
                "
            >
                <div className="text-center">
                    {/* Loading spinner */}
                    <div
                        className="
                            mx-auto
                            h-7
                            w-7
                            animate-spin
                            rounded-full
                            border-2
                            border-border
                            border-t-green-500
                        "
                    />

                    <p
                        className="
                            mt-3
                            text-xs
                            text-muted
                        "
                    >
                        Loading friends...
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================
    // ERROR
    // ============================================================

    if (error) {
        return (
            <div
                className="
                    flex
                    h-full
                    items-center
                    justify-center
                    bg-background
                    px-6
                    text-foreground
                    transition-colors
                    duration-200
                "
            >
                <div className="text-center">
                    {/* Warning icon */}
                    <div
                        className="
                            mx-auto
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-full
                            bg-red-500/10
                            text-xl
                        "
                    >
                        ⚠️
                    </div>

                    <h3
                        className="
                            mt-3
                            text-sm
                            font-semibold
                            text-foreground
                        "
                    >
                        Failed to load friends
                    </h3>

                    <p
                        className="
                            mt-1
                            text-xs
                            text-muted
                        "
                    >
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={loadFriends}
                        className="
                            mt-4
                            rounded-lg
                            bg-green-500
                            px-4
                            py-2
                            text-xs
                            font-semibold
                            text-white
                            transition
                            hover:bg-green-600
                        "
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // EMPTY
    // ============================================================

    if (friends.length === 0) {
        return (
            <div
                className="
                    flex
                    h-full
                    items-center
                    justify-center
                    bg-background
                    px-6
                    text-foreground
                    transition-colors
                    duration-200
                "
            >
                <div className="text-center">
                    {/* Friends icon */}
                    <div
                        className="
                            mx-auto
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-full
                            bg-surface
                            text-2xl
                        "
                    >
                        👥
                    </div>

                    <h3
                        className="
                            mt-3
                            text-sm
                            font-semibold
                            text-foreground
                        "
                    >
                        No friends yet
                    </h3>

                    <p
                        className="
                            mt-1
                            text-xs
                            text-muted
                        "
                    >
                        Search for users and send them
                        a friend request.
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================
    // FRIEND LIST
    // ============================================================

    return (
        <div
            className="
                h-full
                overflow-y-auto
                bg-background
                text-foreground
                transition-colors
                duration-200
            "
        >
            {friends.map((item) => {
                const friend = item?.friend;

                if (!friend) {
                    return null;
                }

                const name =
                    friend.username ||
                    "Unknown User";

                const avatar =
                    friend.avatar;

                const online =
                    Boolean(friend.isOnline);

                const hasConversation =
                    Boolean(
                        item?.conversation?.id
                    );

                return (
                    <div
                        key={item.friendshipId}
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            border-b
                            border-border
                            px-4
                            py-3
                            transition-colors
                            duration-200
                            hover:bg-hover
                        "
                    >
                        {/* ============================================
                            AVATAR
                        ============================================ */}

                        <div className="relative shrink-0">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt={name}
                                    className="
                                        h-12
                                        w-12
                                        rounded-full
                                        object-cover
                                    "
                                />
                            ) : (
                                <div
                                    className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-[#6b7c85]
                                        text-lg
                                        font-semibold
                                        text-white
                                    "
                                >
                                    {name
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                            )}

                            {/* ONLINE INDICATOR */}

                            {online && (
                                <span
                                    className="
                                        absolute
                                        bottom-0
                                        right-0
                                        h-3.5
                                        w-3.5
                                        rounded-full
                                        border-2
                                        border-background
                                        bg-green-500
                                    "
                                    title="Online"
                                />
                            )}
                        </div>

                        {/* ============================================
                            USER INFORMATION
                        ============================================ */}

                        <div className="min-w-0 flex-1">
                            <h3
                                className="
                                    truncate
                                    text-sm
                                    font-semibold
                                    text-foreground
                                "
                            >
                                {name}
                            </h3>

                            <p
                                className={`
                                    mt-0.5
                                    text-xs
                                    ${
                                        online
                                            ? "text-green-500"
                                            : "text-muted"
                                    }
                                `}
                            >
                                {online
                                    ? "Online"
                                    : "Offline"}
                            </p>
                        </div>

                        {/* ============================================
                            MESSAGE BUTTON
                        ============================================ */}

                        {hasConversation ? (
                            <button
                                type="button"
                                onClick={() =>
                                    handleOpenConversation(
                                        item
                                    )
                                }
                                className="
                                    shrink-0
                                    rounded-lg
                                    bg-green-500
                                    px-3
                                    py-2
                                    text-xs
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-green-600
                                "
                            >
                                Message
                            </button>
                        ) : (
                            <span
                                className="
                                    shrink-0
                                    text-[11px]
                                    text-muted
                                "
                            >
                                No chat
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

