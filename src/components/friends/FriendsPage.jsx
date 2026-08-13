"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import FriendCard from "./FriendCard";
import FriendRequestCard from "./FriendRequestCard";

export default function FriendsPage() {
    const router = useRouter();

    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);

    const [loadingFriends, setLoadingFriends] =
        useState(true);

    const [loadingRequests, setLoadingRequests] =
        useState(true);

    const [error, setError] = useState("");

    // ============================================================
    // HELPER: SAFE JSON RESPONSE
    // ============================================================

    const parseApiResponse = async (response) => {
        const contentType =
            response.headers.get("content-type") || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            return await response.json();
        }

        const text = await response.text();

        console.error(
            "❌ API returned non-JSON response:",
            {
                status: response.status,
                statusText: response.statusText,
                contentType,
                response: text,
            }
        );

        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );
    };

    // ============================================================
    // FETCH FRIENDS
    // ============================================================

    const fetchFriends = useCallback(
        async () => {
            try {
                setLoadingFriends(true);

                const response = await fetch(
                    "/api/friends",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                        headers: {
                            Accept:
                                "application/json",
                        },
                    }
                );

                const data =
                    await parseApiResponse(
                        response
                    );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Failed to fetch friends."
                    );
                }

                setFriends(
                    Array.isArray(
                        data.data
                    )
                        ? data.data
                        : []
                );
            } catch (error) {
                console.error(
                    "❌ FETCH FRIENDS ERROR:",
                    error
                );

                setError(
                    error?.message ||
                        "Failed to load friends."
                );
            } finally {
                setLoadingFriends(false);
            }
        },
        []
    );

    // ============================================================
    // FETCH RECEIVED FRIEND REQUESTS
    // ============================================================

    const fetchRequests = useCallback(
        async () => {
            try {
                setLoadingRequests(true);

                const response =
                    await fetch(
                        "/api/friends/request/recieved",
                        {
                            method: "GET",
                            credentials: "include",
                            cache: "no-store",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                        }
                    );

                const data =
                    await parseApiResponse(
                        response
                    );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Failed to fetch friend requests."
                    );
                }

                setRequests(
                    Array.isArray(
                        data.data
                    )
                        ? data.data
                        : []
                );
            } catch (error) {
                console.error(
                    "❌ FETCH REQUESTS ERROR:",
                    error
                );

                setError(
                    error?.message ||
                        "Failed to load friend requests."
                );
            } finally {
                setLoadingRequests(false);
            }
        },
        []
    );

    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {
        fetchFriends();
        fetchRequests();
    }, [
        fetchFriends,
        fetchRequests,
    ]);

    // ============================================================
    // ACCEPT FRIEND REQUEST
    // ============================================================

    const handleAccepted = async (
        request
    ) => {
        setRequests(
            (previous) =>
                previous.filter(
                    (item) =>
                        item.id !==
                        request.id
                )
        );

        await fetchFriends();
    };

    // ============================================================
    // REJECT FRIEND REQUEST
    // ============================================================

    const handleRejected = (
        request
    ) => {
        setRequests(
            (previous) =>
                previous.filter(
                    (item) =>
                        item.id !==
                        request.id
                )
        );
    };

    // ============================================================
    // MESSAGE FRIEND
    // ============================================================

    const handleMessage = (
        friend,
        conversation
    ) => {
        const conversationId =
            conversation?.id ??
            friend?.conversation?.id;

        if (!conversationId) {
            console.error(
                "❌ No conversation ID found:",
                {
                    friend,
                    conversation,
                }
            );

            setError(
                "Unable to open this conversation."
            );

            return;
        }

        router.push(
            `/chat?conversationId=${encodeURIComponent(
                conversationId
            )}`
        );
    };

    // ============================================================
    // CLEAR ERROR
    // ============================================================

    const clearError = () => {
        setError("");
    };

    // ============================================================
    // RETRY
    // ============================================================

    const handleRetry = () => {
        setError("");

        fetchFriends();
        fetchRequests();
    };

    // ============================================================
    // UI
    // ============================================================

    return (
        <main
            className="
                min-h-screen
                px-4
                py-8
                sm:px-6
                lg:px-8
            "
            style={{
                background:
                    "var(--background)",
                color:
                    "var(--text-primary)",
            }}
        >
            <div className="mx-auto max-w-5xl">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="mb-8">

                    {/* BACK BUTTON */}

                    <button
                        type="button"
                        onClick={() =>
                            router.back()
                        }
                        className="
                            mb-5
                            inline-flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            border
                            shadow-sm
                            transition
                            hover:opacity-80
                            active:scale-95
                        "
                        style={{
                            background:
                                "var(--surface)",
                            borderColor:
                                "var(--border)",
                            color:
                                "var(--text-primary)",
                        }}
                        aria-label="Go back"
                        title="Go back"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>

                    <h1
                        className="
                            text-3xl
                            font-bold
                            tracking-tight
                        "
                        style={{
                            color:
                                "var(--text-primary)",
                        }}
                    >
                        Friends
                    </h1>

                    <p
                        className="mt-2 text-sm"
                        style={{
                            color:
                                "var(--text-secondary)",
                        }}
                    >
                        Manage friend requests
                        and connect with your
                        friends.
                    </p>
                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div
                        className="
                            mb-6
                            flex
                            items-center
                            justify-between
                            gap-4
                            rounded-2xl
                            border
                            px-4
                            py-3
                            text-sm
                        "
                        style={{
                            borderColor:
                                "var(--danger)",
                            background:
                                "color-mix(in srgb, var(--danger) 10%, var(--surface))",
                            color:
                                "var(--danger)",
                        }}
                    >
                        <span>
                            {error}
                        </span>

                        <div className="flex items-center gap-3">

                            <button
                                type="button"
                                onClick={
                                    clearError
                                }
                                className="
                                    font-medium
                                    transition
                                    hover:opacity-70
                                "
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Dismiss
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleRetry
                                }
                                className="
                                    font-medium
                                    underline
                                "
                                style={{
                                    color:
                                        "var(--danger)",
                                }}
                            >
                                Retry
                            </button>

                        </div>
                    </div>
                )}

                {/* ==================================================
                    FRIEND REQUESTS
                ================================================== */}

                <section className="mb-8">

                    <div className="mb-4 flex items-center justify-between">

                        <div>
                            <h2
                                className="
                                    text-lg
                                    font-semibold
                                "
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                Friend Requests
                            </h2>

                            <p
                                className="text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                People who want to
                                connect with you.
                            </p>
                        </div>

                        {requests.length > 0 && (
                            <span
                                className="
                                    rounded-full
                                    px-3
                                    py-1
                                    text-xs
                                    font-semibold
                                "
                                style={{
                                    background:
                                        "color-mix(in srgb, var(--accent) 12%, var(--surface))",
                                    color:
                                        "var(--accent)",
                                }}
                            >
                                {requests.length}
                            </span>
                        )}

                    </div>

                    {/* LOADING */}

                    {loadingRequests ? (

                        <div
                            className="
                                rounded-2xl
                                border
                                p-8
                                text-center
                            "
                            style={{
                                background:
                                    "var(--surface)",
                                borderColor:
                                    "var(--border)",
                            }}
                        >
                            <p
                                className="text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Loading friend
                                requests...
                            </p>
                        </div>

                    ) : requests.length === 0 ? (

                        /* EMPTY REQUESTS */

                        <div
                            className="
                                rounded-2xl
                                border
                                border-dashed
                                p-8
                                text-center
                            "
                            style={{
                                background:
                                    "var(--surface)",
                                borderColor:
                                    "var(--border)",
                            }}
                        >
                            <div
                                className="
                                    mx-auto
                                    mb-3
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-xl
                                "
                                style={{
                                    background:
                                        "var(--surface-tertiary)",
                                }}
                            >
                                👋
                            </div>

                            <h3
                                className="font-medium"
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                No friend requests
                            </h3>

                            <p
                                className="mt-1 text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                New requests will
                                appear here.
                            </p>
                        </div>

                    ) : (

                        /* REQUEST LIST */

                        <div className="space-y-3">

                            {requests.map(
                                (request) => (
                                    <FriendRequestCard
                                        key={
                                            request.id
                                        }
                                        request={
                                            request
                                        }
                                        onAccepted={
                                            handleAccepted
                                        }
                                        onRejected={
                                            handleRejected
                                        }
                                    />
                                )
                            )}

                        </div>
                    )}

                </section>

                {/* ==================================================
                    FRIENDS
                ================================================== */}

                <section>

                    <div className="mb-4 flex items-center justify-between">

                        <div>
                            <h2
                                className="
                                    text-lg
                                    font-semibold
                                "
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                My Friends
                            </h2>

                            <p
                                className="text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                People you're connected
                                with.
                            </p>
                        </div>

                        {friends.length > 0 && (
                            <span
                                className="
                                    rounded-full
                                    px-3
                                    py-1
                                    text-xs
                                    font-semibold
                                "
                                style={{
                                    background:
                                        "var(--surface-tertiary)",
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                {friends.length}
                            </span>
                        )}

                    </div>

                    {/* LOADING */}

                    {loadingFriends ? (

                        <div
                            className="
                                rounded-2xl
                                border
                                p-8
                                text-center
                            "
                            style={{
                                background:
                                    "var(--surface)",
                                borderColor:
                                    "var(--border)",
                            }}
                        >
                            <p
                                className="text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Loading friends...
                            </p>
                        </div>

                    ) : friends.length === 0 ? (

                        /* EMPTY FRIENDS */

                        <div
                            className="
                                rounded-2xl
                                border
                                border-dashed
                                p-8
                                text-center
                            "
                            style={{
                                background:
                                    "var(--surface)",
                                borderColor:
                                    "var(--border)",
                            }}
                        >
                            <div
                                className="
                                    mx-auto
                                    mb-3
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-xl
                                "
                                style={{
                                    background:
                                        "var(--surface-tertiary)",
                                }}
                            >
                                👥
                            </div>

                            <h3
                                className="font-medium"
                                style={{
                                    color:
                                        "var(--text-primary)",
                                }}
                            >
                                No friends yet
                            </h3>

                            <p
                                className="mt-1 text-sm"
                                style={{
                                    color:
                                        "var(--text-secondary)",
                                }}
                            >
                                Use the{" "}
                                <strong
                                    style={{
                                        color:
                                            "var(--accent)",
                                    }}
                                >
                                    +
                                </strong>{" "}
                                button in ChatHub
                                to find people
                                and send friend
                                requests.
                            </p>

                        </div>

                    ) : (

                        /* FRIEND LIST */

                        <div className="grid gap-3 md:grid-cols-2">

                            {friends.map(
                                (
                                    item,
                                    index
                                ) => (
                                    <FriendCard
                                        key={
                                            item.friendshipId ??
                                            item.friend?.id ??
                                            `friend-${index}`
                                        }
                                        friend={
                                            item.friend
                                        }
                                        conversation={
                                            item.conversation
                                        }
                                        onMessage={
                                            handleMessage
                                        }
                                    />
                                )
                            )}

                        </div>
                    )}

                </section>

            </div>
        </main>
    );
}