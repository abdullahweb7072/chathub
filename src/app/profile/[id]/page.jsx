
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

export default function PublicProfilePage() {
    const params = useParams();

    // ============================================================
    // THEME
    // ============================================================

    const { theme } = useTheme();

    // ============================================================
    // STATE
    // ============================================================

    const [user, setUser] = useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // ============================================================
    // FETCH USER
    // ============================================================

    useEffect(() => {
        if (!params?.id) {
            return;
        }

        fetchUser(params.id);
    }, [params?.id]);

    async function fetchUser(id) {
        try {
            setLoading(true);
            setError("");

            const response =
                await fetch(
                    `/api/users/${encodeURIComponent(id)}`,
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
                await response.json();

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.error ||
                        data?.message ||
                        "Failed to load profile."
                );
            }

            if (!data?.user) {
                throw new Error(
                    "User not found."
                );
            }

            setUser(data.user);
        } catch (error) {
            console.error(
                "❌ PUBLIC PROFILE ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to load profile."
            );

            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    px-4
                "
                style={{
                    background:
                        "var(--chat-bg-primary)",
                    color:
                        "var(--chat-text-primary)",
                }}
            >
                <div
                    className="
                        h-8
                        w-8
                        animate-spin
                        rounded-full
                        border-2
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                        borderTopColor:
                            "var(--chat-accent)",
                    }}
                />
            </main>
        );
    }

    // ============================================================
    // ERROR
    // ============================================================

    if (!user) {
        return (
            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    px-4
                "
                style={{
                    background:
                        "var(--chat-bg-primary)",
                    color:
                        "var(--chat-text-primary)",
                }}
            >
                <div
                    className="
                        w-full
                        max-w-md
                        rounded-3xl
                        border
                        p-8
                        text-center
                    "
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div
                        className="
                            mx-auto
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-full
                            text-lg
                            font-bold
                        "
                        style={{
                            background:
                                "var(--chat-danger-bg)",
                            color:
                                "var(--chat-danger)",
                        }}
                    >
                        !
                    </div>

                    <h2
                        className="
                            mt-4
                            text-lg
                            font-semibold
                        "
                        style={{
                            color:
                                "var(--chat-text-primary)",
                        }}
                    >
                        Profile unavailable
                    </h2>

                    <p
                        className="
                            mt-2
                            text-sm
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        {error ||
                            "User not found."}
                    </p>
                </div>
            </main>
        );
    }

    // ============================================================
    // PREFERRED DISPLAY NAME
    //
    // displayName → username → email → User
    // ============================================================

    const displayName =
        user?.displayName?.trim() ||
        user?.username?.trim() ||
        user?.email?.trim() ||
        "User";

    // ============================================================
    // PRIVACY
    // ============================================================

    const onlineStatusHidden =
        user.showOnlineStatus === false;

    const lastSeenHidden =
        user.showLastSeen === false;

    // ============================================================
    // SAFE ONLINE STATUS
    // ============================================================

    const isOnline =
        !onlineStatusHidden &&
        Boolean(user.isOnline);

    // ============================================================
    // SAFE LAST SEEN
    // ============================================================

    let lastSeenText = "Never";

    if (onlineStatusHidden) {
        lastSeenText =
            "Online status hidden";
    } else if (isOnline) {
        lastSeenText =
            "Currently online";
    } else if (lastSeenHidden) {
        lastSeenText =
            "Last seen hidden";
    } else if (user.lastSeen) {
        const date =
            new Date(user.lastSeen);

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {
            lastSeenText =
                date.toLocaleString();
        }
    }

    // ============================================================
    // AVATAR INITIAL
    // ============================================================

    const avatarInitial =
        displayName
            ?.charAt(0)
            ?.toUpperCase() || "?";

    // ============================================================
    // MAIN UI
    // ============================================================

    return (
        <main
            className="
                min-h-screen
                px-4
                py-6
                sm:px-6
                lg:px-8
            "
            style={{
                background:
                    "var(--chat-bg-primary)",
                color:
                    "var(--chat-text-primary)",
            }}
        >
            <div
                className="
                    mx-auto
                    w-full
                    max-w-4xl
                "
            >
                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="mb-6">
                    <h1
                        className="
                            text-2xl
                            font-bold
                            tracking-tight
                            sm:text-3xl
                        "
                        style={{
                            color:
                                "var(--chat-text-primary)",
                        }}
                    >
                        Profile
                    </h1>

                    <p
                        className="
                            mt-1
                            text-sm
                        "
                        style={{
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        View{" "}
                        <span className="font-medium">
                            {displayName}
                        </span>
                        's ChatHub profile.
                    </p>
                </div>

                {/* =================================================
                    PROFILE CARD
                ================================================= */}

                <section
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        shadow-2xl
                    "
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    {/* =================================================
                        COVER
                    ================================================= */}

                    <div
                        className="
                            relative
                            h-32
                            overflow-hidden
                            sm:h-40
                        "
                        style={{
                            background:
                                "linear-gradient(135deg, var(--chat-accent-soft), var(--chat-bg-tertiary), var(--chat-accent-soft))",
                        }}
                    >
                        <div
                            className="
                                absolute
                                -right-20
                                -top-20
                                h-56
                                w-56
                                rounded-full
                                blur-3xl
                            "
                            style={{
                                background:
                                    "var(--chat-accent-soft)",
                            }}
                        />

                        <div
                            className="
                                absolute
                                -bottom-24
                                left-1/3
                                h-64
                                w-64
                                rounded-full
                                blur-3xl
                            "
                            style={{
                                background:
                                    "var(--chat-accent-soft)",
                            }}
                        />
                    </div>

                    {/* =================================================
                        CONTENT
                    ================================================= */}

                    <div
                        className="
                            px-5
                            pb-7
                            sm:px-8
                        "
                    >
                        {/* =================================================
                            PROFILE HEADER
                        ================================================= */}

                        <div
                            className="
                                -mt-16
                                flex
                                flex-col
                                gap-5
                                sm:-mt-20
                                sm:flex-row
                                sm:items-end
                            "
                        >
                            {/* =================================================
                                AVATAR
                            ================================================= */}

                            <div
                                className="
                                    flex
                                    h-32
                                    w-32
                                    shrink-0
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-full
                                    border-4
                                    text-4xl
                                    font-bold
                                    shadow-xl
                                    sm:h-36
                                    sm:w-36
                                    sm:text-5xl
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-bg-secondary)",
                                    background:
                                        "var(--chat-accent)",
                                    color:
                                        "#ffffff",
                                }}
                            >
                                {user.avatar ? (
                                    <img
                                        src={
                                            user.avatar
                                        }
                                        alt={`${displayName} avatar`}
                                        className="
                                            h-full
                                            w-full
                                            object-cover
                                        "
                                    />
                                ) : (
                                    avatarInitial
                                )}
                            </div>

                            {/* =================================================
                                USER INFO
                            ================================================= */}

                            <div className="pb-1">
                                <div
                                    className="
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-2
                                    "
                                >
                                    <h2
                                        className="
                                            text-2xl
                                            font-bold
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        {displayName}
                                    </h2>

                                    {user.role ===
                                        "user" && (
                                        <span
                                            className="
                                                rounded-full
                                                border
                                                px-2.5
                                                py-1
                                                text-[10px]
                                                font-medium
                                                uppercase
                                                tracking-wide
                                            "
                                            style={{
                                                borderColor:
                                                    "var(--chat-border)",
                                                background:
                                                    "var(--chat-bg-tertiary)",
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            User
                                        </span>
                                    )}
                                </div>

                                {/* =================================================
                                    USERNAME
                                    Optional secondary identifier
                                ================================================= */}

                                {user.username &&
                                    user.username !==
                                        displayName && (
                                        <p
                                            className="
                                                mt-1
                                                text-xs
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            @{user.username}
                                        </p>
                                    )}

                                {/* =================================================
                                    ONLINE STATUS
                                ================================================= */}

                                <div
                                    className="
                                        mt-2
                                        flex
                                        items-center
                                        gap-2
                                        text-xs
                                    "
                                >
                                    {onlineStatusHidden ? (
                                        <span
                                            className="
                                                h-2
                                                w-2
                                                rounded-full
                                            "
                                            style={{
                                                background:
                                                    "var(--chat-text-muted)",
                                            }}
                                        />
                                    ) : (
                                        <span
                                            className="
                                                h-2
                                                w-2
                                                rounded-full
                                            "
                                            style={{
                                                background:
                                                    isOnline
                                                        ? "#10b981"
                                                        : "#64748b",
                                            }}
                                        />
                                    )}

                                    <span
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        {onlineStatusHidden
                                            ? "Online status hidden"
                                            : isOnline
                                            ? "Online"
                                            : "Offline"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* =================================================
                            DETAILS
                        ================================================= */}

                        <div className="mt-8 grid gap-5">
                            {/* =================================================
                                ABOUT
                            ================================================= */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    p-5
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-primary)",
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                <p
                                    className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                    "
                                    style={{
                                        color:
                                            "var(--chat-text-muted)",
                                    }}
                                >
                                    About
                                </p>

                                <p
                                    className="
                                        mt-3
                                        whitespace-pre-wrap
                                        text-sm
                                        leading-6
                                    "
                                    style={{
                                        color:
                                            "var(--chat-text-secondary)",
                                    }}
                                >
                                    {user.bio ||
                                        "No bio added yet."}
                                </p>
                            </div>

                            {/* =================================================
                                MEMBER SINCE
                            ================================================= */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    p-5
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-primary)",
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                <p
                                    className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                    "
                                    style={{
                                        color:
                                            "var(--chat-text-muted)",
                                    }}
                                >
                                    Member Since
                                </p>

                                <p
                                    className="
                                        mt-3
                                        text-sm
                                    "
                                    style={{
                                        color:
                                            "var(--chat-text-secondary)",
                                    }}
                                >
                                    {user.createdAt
                                        ? new Date(
                                              user.createdAt
                                          ).toLocaleDateString(
                                              undefined,
                                              {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                              }
                                          )
                                        : "Unknown"}
                                </p>
                            </div>

                            {/* =================================================
                                LAST SEEN
                            ================================================= */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    p-5
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-primary)",
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-4
                                    "
                                >
                                    <div>
                                        <p
                                            className="
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            Last Seen
                                        </p>

                                        <p
                                            className="
                                                mt-3
                                                text-sm
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-secondary)",
                                            }}
                                        >
                                            {lastSeenText}
                                        </p>
                                    </div>

                                    <span
                                        className="
                                            rounded-full
                                            px-3
                                            py-1.5
                                            text-xs
                                            font-medium
                                        "
                                        style={{
                                            background:
                                                onlineStatusHidden ||
                                                lastSeenHidden
                                                    ? "var(--chat-bg-tertiary)"
                                                    : isOnline
                                                    ? "rgba(16, 185, 129, 0.10)"
                                                    : "var(--chat-bg-tertiary)",

                                            color:
                                                onlineStatusHidden ||
                                                lastSeenHidden
                                                    ? "var(--chat-text-muted)"
                                                    : isOnline
                                                    ? "#10b981"
                                                    : "var(--chat-text-muted)",
                                        }}
                                    >
                                        {onlineStatusHidden
                                            ? "Hidden"
                                            : isOnline
                                            ? "Online"
                                            : lastSeenHidden
                                            ? "Hidden"
                                            : "Offline"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

