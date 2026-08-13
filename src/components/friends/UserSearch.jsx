"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function UserSearch({
    onRequestSent,
    onUserSelect,
    onClose,
}) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // ============================================================
    // UI CONFIG
    // ============================================================

    const UI = {
        searchDelay: 300,
        avatarSize: 48,
    };

    // ============================================================
    // SEARCH USERS
    // ============================================================

    useEffect(() => {
        const value = query.trim();

        setError("");
        setMessage("");

        if (!value) {
            setUsers([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
                setLoading(true);

                const response = await fetch(
                    `/api/users/search?username=${encodeURIComponent(
                        value
                    )}`,
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );

                const contentType =
                    response.headers.get("content-type") || "";

                let data;

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {
                    data = await response.json();
                } else {
                    const text = await response.text();

                    console.error(
                        "❌ USER SEARCH NON-JSON:",
                        text
                    );

                    throw new Error(
                        `Invalid server response (${response.status}).`
                    );
                }

                console.log(
                    "🔎 USER SEARCH:",
                    value,
                    data
                );

                if (!response.ok || !data?.success) {
                    throw new Error(
                        data?.message ||
                            "Failed to search users."
                    );
                }

                const results = Array.isArray(
                    data.users
                )
                    ? data.users
                    : [];

                const normalizedUsers = results
                    .filter(Boolean)
                    .map((user) => ({
                        ...user,
                        id: Number(user.id),
                        username:
                            user.username || "",
                        avatar:
                            user.avatar || null,
                        bio: user.bio || "",
                        isOnline: Boolean(
                            user.isOnline
                        ),
                    }))
                    .filter(
                        (user) =>
                            user.id &&
                            user.username
                    );

                setUsers(normalizedUsers);
            } catch (error) {
                if (
                    error?.name ===
                    "AbortError"
                ) {
                    return;
                }

                console.error(
                    "❌ USER SEARCH ERROR:",
                    error
                );

                setUsers([]);

                setError(
                    error?.message ||
                        "Failed to search users."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setLoading(false);
                }
            }
        }, UI.searchDelay);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [query]);

    // ============================================================
    // SEND FRIEND REQUEST
    // ============================================================

    const sendFriendRequest = async (user) => {
        if (
            sendingId !== null ||
            !user?.id
        ) {
            return;
        }

        setSendingId(user.id);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                "/api/friends/request",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Accept:
                            "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        receiverId: Number(
                            user.id
                        ),
                    }),
                }
            );

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            let data;

            if (
                contentType.includes(
                    "application/json"
                )
            ) {
                data =
                    await response.json();
            } else {
                throw new Error(
                    `Invalid server response (${response.status}).`
                );
            }

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                        data?.error ||
                        "Failed to send friend request."
                );
            }

            setUsers((previous) =>
                previous.filter(
                    (item) =>
                        Number(item.id) !==
                        Number(user.id)
                )
            );

            setMessage(
                `Friend request sent to ${user.username}.`
            );

            onRequestSent?.(user);
        } catch (error) {
            console.error(
                "❌ SEND FRIEND REQUEST ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to send friend request."
            );
        } finally {
            setSendingId(null);
        }
    };

    // ============================================================
    // CLEAR SEARCH
    // ============================================================

    const clearSearch = () => {
        setQuery("");
        setUsers([]);
        setError("");
        setMessage("");
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className="
                w-full
                min-w-0
                rounded-2xl
                p-0
            "
            style={{
                backgroundColor:
                    "var(--surface)",
                color:
                    "var(--text-primary)",
                opacity: 1,
                isolation: "isolate",
            }}
        >
            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="mb-4 flex items-center justify-between">
                <div className="min-w-0">
                    <h2
                        className="text-lg font-semibold"
                        style={{
                            color:
                                "var(--text-primary)",
                        }}
                    >
                        New Chat
                    </h2>

                    <p
                        className="mt-1 text-sm"
                        style={{
                            color:
                                "var(--text-secondary)",
                        }}
                    >
                        Search for a user by username.
                    </p>
                </div>

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            transition
                            hover:opacity-80
                            active:scale-95
                        "
                        style={{
                            color:
                                "var(--text-muted)",
                            backgroundColor:
                                "var(--surface-tertiary)",
                            opacity: 1,
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ==================================================
                SEARCH INPUT
            ================================================== */}

            <div className="relative">
                <svg
                    className="
                        pointer-events-none
                        absolute
                        left-4
                        top-1/2
                        h-5
                        w-5
                        -translate-y-1/2
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{
                        color:
                            "var(--text-muted)",
                    }}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                    />
                </svg>

                <input
                    type="text"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value
                        )
                    }
                    autoFocus
                    placeholder="Search username..."
                    className="
                        w-full
                        rounded-2xl
                        border
                        py-3.5
                        pl-12
                        pr-12
                        text-sm
                        outline-none
                        transition
                    "
                    style={{
                        backgroundColor:
                            "var(--surface-secondary)",
                        borderColor:
                            "var(--border)",
                        color:
                            "var(--text-primary)",
                        opacity: 1,
                    }}
                />

                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="
                            absolute
                            right-3
                            top-1/2
                            flex
                            h-8
                            w-8
                            -translate-y-1/2
                            items-center
                            justify-center
                            rounded-full
                            transition
                            hover:opacity-80
                            active:scale-95
                        "
                        style={{
                            color:
                                "var(--text-muted)",
                            backgroundColor:
                                "var(--surface-tertiary)",
                            opacity: 1,
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div
                    className="
                        mt-3
                        rounded-xl
                        border
                        px-4
                        py-3
                        text-sm
                    "
                    style={{
                        borderColor:
                            "var(--danger)",
                        backgroundColor:
                            "var(--surface-secondary)",
                        color:
                            "var(--danger)",
                        opacity: 1,
                    }}
                >
                    {error}
                </div>
            )}

            {/* ==================================================
                SUCCESS
            ================================================== */}

            {message && (
                <div
                    className="
                        mt-3
                        rounded-xl
                        border
                        px-4
                        py-3
                        text-sm
                    "
                    style={{
                        borderColor:
                            "var(--success)",
                        backgroundColor:
                            "var(--surface-secondary)",
                        color:
                            "var(--success)",
                        opacity: 1,
                    }}
                >
                    {message}
                </div>
            )}

            {/* ==================================================
                LOADING
            ================================================== */}

            {loading && (
                <div
                    className="
                        mt-5
                        flex
                        items-center
                        justify-center
                        rounded-2xl
                        border
                        py-6
                    "
                    style={{
                        backgroundColor:
                            "var(--surface-secondary)",
                        borderColor:
                            "var(--border)",
                        opacity: 1,
                    }}
                >
                    <div
                        className="
                            h-6
                            w-6
                            animate-spin
                            rounded-full
                            border-2
                        "
                        style={{
                            borderColor:
                                "var(--border-light)",
                            borderTopColor:
                                "var(--accent)",
                        }}
                    />

                    <span
                        className="ml-3 text-sm"
                        style={{
                            color:
                                "var(--text-secondary)",
                        }}
                    >
                        Searching users...
                    </span>
                </div>
            )}

            {/* ==================================================
                RESULTS
            ================================================== */}

            {!loading &&
                users.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="
                                    flex
                                    items-center
                                    gap-4
                                    rounded-2xl
                                    border
                                    p-4
                                "
                                style={{
                                    backgroundColor:
                                        "var(--surface-secondary)",
                                    borderColor:
                                        "var(--border)",
                                    opacity: 1,
                                }}
                            >
                                {/* AVATAR */}

                                {user.avatar ? (
                                    <Image
                                        src={
                                            user.avatar
                                        }
                                        alt={
                                            user.username
                                        }
                                        width={
                                            UI.avatarSize
                                        }
                                        height={
                                            UI.avatarSize
                                        }
                                        unoptimized
                                        className="
                                            h-12
                                            w-12
                                            shrink-0
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
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-full
                                            font-semibold
                                            text-white
                                        "
                                        style={{
                                            backgroundColor:
                                                "var(--accent)",
                                        }}
                                    >
                                        {user.username
                                            ?.charAt(
                                                0
                                            )
                                            ?.toUpperCase() ||
                                            "U"}
                                    </div>
                                )}

                                {/* USER INFO */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        onUserSelect?.(
                                            user
                                        )
                                    }
                                    className="
                                        min-w-0
                                        flex-1
                                        text-left
                                        outline-none
                                    "
                                >
                                    <p
                                        className="
                                            truncate
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                "var(--text-primary)",
                                        }}
                                    >
                                        {
                                            user.username
                                        }
                                    </p>

                                    {user.bio && (
                                        <p
                                            className="
                                                truncate
                                                text-sm
                                            "
                                            style={{
                                                color:
                                                    "var(--text-secondary)",
                                            }}
                                        >
                                            {
                                                user.bio
                                            }
                                        </p>
                                    )}

                                    {/* ONLINE STATUS */}

                                    <div
                                        className="
                                            mt-1
                                            flex
                                            items-center
                                            gap-2
                                            text-xs
                                        "
                                    >
                                        <span
                                            className="
                                                h-2
                                                w-2
                                                shrink-0
                                                rounded-full
                                            "
                                            style={{
                                                backgroundColor:
                                                    user.isOnline
                                                        ? "var(--success)"
                                                        : "var(--text-muted)",
                                            }}
                                        />

                                        <span
                                            style={{
                                                color:
                                                    "var(--text-secondary)",
                                            }}
                                        >
                                            {user.isOnline
                                                ? "Online"
                                                : "Offline"}
                                        </span>
                                    </div>
                                </button>

                                {/* ADD FRIEND */}

                                <button
                                    type="button"
                                    disabled={
                                        sendingId !==
                                        null
                                    }
                                    onClick={() =>
                                        sendFriendRequest(
                                            user
                                        )
                                    }
                                    className="
                                        shrink-0
                                        rounded-xl
                                        px-4
                                        py-2
                                        text-sm
                                        font-medium
                                        text-white
                                        transition
                                        hover:opacity-90
                                        active:scale-95
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                    style={{
                                        backgroundColor:
                                            "var(--accent)",
                                    }}
                                >
                                    {sendingId ===
                                    user.id
                                        ? "Sending..."
                                        : "Add Friend"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            {/* ==================================================
                NO RESULTS
            ================================================== */}

            {!loading &&
                query.trim() &&
                users.length === 0 &&
                !error && (
                    <div
                        className="
                            mt-6
                            rounded-2xl
                            border
                            border-dashed
                            p-8
                            text-center
                        "
                        style={{
                            backgroundColor:
                                "var(--surface-secondary)",
                            borderColor:
                                "var(--border-light)",
                            opacity: 1,
                        }}
                    >
                        <div className="mb-2 text-3xl">
                            🔍
                        </div>

                        <p
                            className="font-medium"
                            style={{
                                color:
                                    "var(--text-primary)",
                            }}
                        >
                            No users found
                        </p>

                        <p
                            className="mt-1 text-sm"
                            style={{
                                color:
                                    "var(--text-secondary)",
                            }}
                        >
                            Try checking the username
                            spelling.
                        </p>
                    </div>
                )}

            {/* ==================================================
                EMPTY SEARCH
            ================================================== */}

            {!query.trim() && !loading && (
                <div
                    className="
                        mt-6
                        rounded-2xl
                        border
                        border-dashed
                        p-8
                        text-center
                    "
                    style={{
                        backgroundColor:
                            "var(--surface-secondary)",
                        borderColor:
                            "var(--border-light)",
                        opacity: 1,
                    }}
                >
                    <div className="mb-2 text-3xl">
                        👤
                    </div>

                    <p
                        className="font-medium"
                        style={{
                            color:
                                "var(--text-primary)",
                        }}
                    >
                        Search for a user
                    </p>

                    <p
                        className="mt-1 text-sm"
                        style={{
                            color:
                                "var(--text-secondary)",
                        }}
                    >
                        Enter a username to find people.
                    </p>
                </div>
            )}
        </div>
    );
}