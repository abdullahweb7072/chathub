"use client";

import {
    useEffect,
    useState,
} from "react";

export default function NewChatModal({
    open,
    onClose,
}) {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sendingRequest, setSendingRequest] =
        useState(null);

    // ============================================================
    // RESET
    // ============================================================

    useEffect(() => {
        if (!open) {
            setSearch("");
            setUsers([]);
            setError("");
            setLoading(false);
            setSendingRequest(null);
        }
    }, [open]);

    // ============================================================
    // SEARCH USERS
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        const value = search.trim();

        if (!value) {
            setUsers([]);
            setError("");
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
                setLoading(true);
                setError("");

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
                    response.headers.get(
                        "content-type"
                    ) || "";

                if (
                    !contentType.includes(
                        "application/json"
                    )
                ) {
                    throw new Error(
                        "Server returned an invalid response."
                    );
                }

                const data =
                    await response.json();

                console.log(
                    "🔎 USER SEARCH RESPONSE:",
                    data
                );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Failed to search users."
                    );
                }

                setUsers(
                    Array.isArray(data.users)
                        ? data.users
                        : []
                );
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

                setError(
                    error?.message ||
                        "Failed to search users."
                );

                setUsers([]);
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setLoading(false);
                }
            }
        }, 350);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [search, open]);

    // ============================================================
    // SEND FRIEND REQUEST
    // ============================================================

    const handleSendRequest = async (
        user
    ) => {
        const userId = user?.id;

        if (!userId) {
            return;
        }

        try {
            setSendingRequest(userId);
            setError("");

            const response =
                await fetch(
                    "/api/friends/request",
                    {
                        method: "POST",
                        credentials:
                            "include",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json",
                        },
                        body: JSON.stringify({
                            receiverId:
                                Number(
                                    userId
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
                    "Server returned an invalid response."
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

            setUsers(
                (previous) =>
                    previous.map(
                        (item) =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                userId
                            )
                                ? {
                                      ...item,
                                      requestSent:
                                          true,
                                  }
                                : item
                    )
            );
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
            setSendingRequest(null);
        }
    };

    // ============================================================
    // ESC KEY
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (
            event
        ) => {
            if (
                event.key ===
                "Escape"
            ) {
                onClose?.();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [open, onClose]);

    // ============================================================
    // NOT OPEN
    // ============================================================

    if (!open) {
        return null;
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className="
                fixed
                inset-0
                z-[100]
                flex
                items-start
                justify-center
                bg-black/60
                px-4
                pt-20
            "
            style={{
                opacity: 1,
            }}
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose?.();
                }
            }}
        >
            {/* ==================================================
                MODAL
            ================================================== */}

            <div
                className="
                    w-full
                    max-w-lg
                    overflow-hidden
                    rounded-2xl
                    border
                    shadow-2xl
                "
                style={{
                    /*
                     * HARD-CODED SOLID BACKGROUND
                     *
                     * Light theme:
                     * #ffffff
                     *
                     * Dark theme:
                     * #0f172a
                     */
                    backgroundColor:
                        "var(--surface)",

                    borderColor:
                        "var(--border)",

                    color:
                        "var(--text-primary)",

                    opacity: 1,

                    /*
                     * Prevent any transparency/compositing
                     * from affecting the modal.
                     */
                    isolation: "isolate",
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-chat-title"
            >
                {/* ==================================================
                    HEADER
                ================================================== */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        px-5
                        py-4
                    "
                    style={{
                        backgroundColor:
                            "var(--surface)",

                        borderColor:
                            "var(--border)",
                    }}
                >
                    <div className="min-w-0">
                        <h2
                            id="new-chat-title"
                            className="
                                text-lg
                                font-semibold
                            "
                            style={{
                                color:
                                    "var(--text-primary)",
                            }}
                        >
                            New Chat
                        </h2>

                        <p
                            className="
                                mt-0.5
                                text-xs
                            "
                            style={{
                                color:
                                    "var(--text-secondary)",
                            }}
                        >
                            Find someone to
                            connect with
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-lg
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
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* ==================================================
                    SEARCH
                ================================================== */}

                <div
                    className="
                        border-b
                        p-4
                    "
                    style={{
                        backgroundColor:
                            "var(--surface)",

                        borderColor:
                            "var(--border)",
                    }}
                >
                    <div
                        className="
                            flex
                            items-center
                            rounded-xl
                            px-3
                        "
                        style={{
                            backgroundColor:
                                "var(--surface-secondary)",

                            border:
                                "1px solid var(--border)",
                        }}
                    >
                        <span
                            className="
                                mr-2
                                shrink-0
                            "
                            style={{
                                color:
                                    "var(--text-muted)",
                            }}
                        >
                            🔍
                        </span>

                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Search username..."
                            className="
                                h-11
                                flex-1
                                bg-transparent
                                text-sm
                                outline-none
                            "
                            style={{
                                color:
                                    "var(--text-primary)",
                            }}
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearch(
                                        ""
                                    )
                                }
                                className="
                                    flex
                                    h-7
                                    w-7
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    transition
                                    hover:opacity-80
                                "
                                style={{
                                    color:
                                        "var(--text-muted)",

                                    backgroundColor:
                                        "var(--surface-tertiary)",
                                }}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div
                        className="
                            mx-4
                            mt-3
                            rounded-xl
                            border
                            px-3
                            py-2
                            text-sm
                        "
                        style={{
                            borderColor:
                                "rgba(239, 68, 68, 0.35)",

                            backgroundColor:
                                "rgba(239, 68, 68, 0.10)",

                            color:
                                "var(--danger)",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ==================================================
                    RESULTS
                ================================================== */}

                <div
                    className="
                        max-h-[420px]
                        overflow-y-auto
                        p-2
                    "
                    style={{
                        backgroundColor:
                            "var(--surface)",
                    }}
                >
                    {/* EMPTY SEARCH */}

                    {!search.trim() ? (
                        <div
                            className="
                                px-5
                                py-12
                                text-center
                            "
                        >
                            <div className="mb-3 text-4xl">
                                👤
                            </div>

                            <p
                                className="
                                    text-sm
                                    font-medium
                                "
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                Search for a user
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                "
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Enter a username
                                to find people
                                on ChatHub.
                            </p>
                        </div>

                    /* LOADING */

                    ) : loading ? (
                        <div
                            className="
                                flex
                                items-center
                                justify-center
                                py-12
                            "
                        >
                            <div
                                className="
                                    h-7
                                    w-7
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
                        </div>

                    /* NO RESULTS */

                    ) : users.length === 0 ? (
                        <div
                            className="
                                px-5
                                py-12
                                text-center
                            "
                        >
                            <div className="mb-3 text-4xl">
                                🔎
                            </div>

                            <p
                                className="
                                    text-sm
                                    font-medium
                                "
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                No users found
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                "
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Try another
                                username.
                            </p>
                        </div>

                    /* RESULTS */

                    ) : (
                        <div className="space-y-1">
                            {users.map(
                                (user) => (
                                    <UserResult
                                        key={
                                            user.id
                                        }
                                        user={
                                            user
                                        }
                                        sending={
                                            Number(
                                                sendingRequest
                                            ) ===
                                            Number(
                                                user.id
                                            )
                                        }
                                        onSendRequest={
                                            handleSendRequest
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// USER RESULT
// ============================================================

function UserResult({
    user,
    sending,
    onSendRequest,
}) {
    const username =
        user?.username ||
        "User";

    const avatar =
        user?.avatar ||
        null;

    const requestSent =
        Boolean(
            user?.requestSent
        );

    const isFriend =
        Boolean(
            user?.isFriend
        );

    return (
        <div
            className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-3
                transition
            "
            style={{
                backgroundColor:
                    "var(--surface)",

                color:
                    "var(--text-primary)",
            }}
            onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor =
                    "var(--surface-secondary)";
            }}
            onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                    "var(--surface)";
            }}
        >
            {/* ==================================================
                AVATAR
            ================================================== */}

            <div
                className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    font-semibold
                    text-white
                "
                style={{
                    backgroundColor:
                        "var(--accent)",
                }}
            >
                {avatar ? (
                    <img
                        src={avatar}
                        alt={username}
                        className="
                            h-full
                            w-full
                            object-cover
                        "
                    />
                ) : (
                    username
                        .charAt(0)
                        .toUpperCase()
                )}
            </div>

            {/* ==================================================
                USER INFO
            ================================================== */}

            <div className="min-w-0 flex-1">
                <p
                    className="
                        truncate
                        text-sm
                        font-medium
                    "
                    style={{
                        color:
                            "var(--text-primary)",
                    }}
                >
                    {username}
                </p>

                {user?.bio && (
                    <p
                        className="
                            truncate
                            text-xs
                        "
                        style={{
                            color:
                                "var(--text-secondary)",
                        }}
                    >
                        {user.bio}
                    </p>
                )}

                {user?.isOnline !==
                    undefined && (
                    <div
                        className="
                            mt-1
                            flex
                            items-center
                            gap-1.5
                            text-[11px]
                        "
                    >
                        <span
                            className="
                                h-1.5
                                w-1.5
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
                )}
            </div>

            {/* ==================================================
                ACTION
            ================================================== */}

            {isFriend ? (
                <span
                    className="
                        shrink-0
                        rounded-lg
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                    "
                    style={{
                        backgroundColor:
                            "var(--surface-tertiary)",

                        color:
                            "var(--success)",
                    }}
                >
                    Friends
                </span>
            ) : requestSent ? (
                <span
                    className="
                        shrink-0
                        rounded-lg
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                    "
                    style={{
                        backgroundColor:
                            "var(--surface-tertiary)",

                        color:
                            "var(--text-secondary)",
                    }}
                >
                    Request sent
                </span>
            ) : (
                <button
                    type="button"
                    disabled={sending}
                    onClick={() =>
                        onSendRequest(
                            user
                        )
                    }
                    className="
                        shrink-0
                        rounded-lg
                        px-3
                        py-1.5
                        text-xs
                        font-semibold
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
                    {sending
                        ? "Sending..."
                        : "Add"}
                </button>
            )}
        </div>
    );
}