"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import ProfileAvatar from "./ProfileAvatar";
import EditProfileModal from "./EditProfileModal";

export default function ProfilePage() {
    const router = useRouter();

    const searchParams = useSearchParams();

    const viewedUserId =
        searchParams.get("userId");

    // ============================================================
    // STATE
    // ============================================================

    const [user, setUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [editModalOpen, setEditModalOpen] =
        useState(false);

    const [isOwnProfile, setIsOwnProfile] =
        useState(false);

    // ============================================================
    // FETCH PROFILE
    // ============================================================

    useEffect(() => {
        fetchProfile();
    }, [viewedUserId]);

    async function fetchProfile() {
        try {
            setLoading(true);
            setError("");
            setEditModalOpen(false);

            const url = viewedUserId
                ? `/api/users/${encodeURIComponent(
                      viewedUserId
                  )}`
                : "/api/profile";

            const response = await fetch(url, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
            });

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

            const ownProfile =
                viewedUserId
                    ? Boolean(
                          data.isOwnProfile
                      )
                    : true;

            setIsOwnProfile(
                ownProfile
            );

            const fetchedUser =
                data.user;

            if (!fetchedUser) {
                throw new Error(
                    "User not found."
                );
            }

            let safeUser = {
                ...fetchedUser,
            };

            // ====================================================
            // OTHER USER PRIVACY
            // ====================================================

            if (!ownProfile) {
                if (
                    fetchedUser.showOnlineStatus ===
                    false
                ) {
                    safeUser.isOnline =
                        false;

                    safeUser.onlineStatusHidden =
                        true;
                }

                if (
                    fetchedUser.showLastSeen ===
                    false
                ) {
                    safeUser.lastSeen =
                        null;

                    safeUser.lastSeenHidden =
                        true;
                }
            }

            setUser(safeUser);
        } catch (error) {
            console.error(
                "❌ PROFILE FETCH ERROR:",
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
    // PROFILE UPDATED
    // ============================================================

    function handleProfileUpdated(
        updatedUser
    ) {
        setUser(updatedUser);

        setSuccess(
            "Profile updated successfully."
        );

        setTimeout(() => {
            setSuccess("");
        }, 3000);
    }

    // ============================================================
    // AVATAR UPDATED
    // ============================================================

    function handleAvatarUpdated(
        updatedUser
    ) {
        setUser(updatedUser);

        setSuccess(
            "Profile picture updated successfully."
        );

        setTimeout(() => {
            setSuccess("");
        }, 3000);
    }

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
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
                }}
            >
                <div
                    className="
                        mx-auto
                        w-full
                        max-w-5xl
                    "
                >
                    {/* TOP BAR */}

                    <div
                        className="
                            mb-6
                            flex
                            items-center
                            gap-3
                        "
                    >
                        <div
                            className="
                                h-10
                                w-10
                                animate-pulse
                                rounded-xl
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                h-6
                                w-36
                                animate-pulse
                                rounded-lg
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />
                    </div>

                    {/* CARD */}

                    <div
                        className="
                            overflow-hidden
                            rounded-[2rem]
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
                        {/* COVER */}

                        <div
                            className="
                                h-40
                                animate-pulse
                                sm:h-52
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        {/* CONTENT */}

                        <div className="px-5 pb-8 sm:px-8">
                            <div className="-mt-16 sm:-mt-20">
                                <div
                                    className="
                                        h-32
                                        w-32
                                        animate-pulse
                                        rounded-full
                                        border-[6px]
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                        borderColor:
                                            "var(--chat-bg-secondary)",
                                    }}
                                />
                            </div>

                            <div
                                className="
                                    mt-6
                                    h-7
                                    w-48
                                    animate-pulse
                                    rounded-lg
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-tertiary)",
                                }}
                            />

                            <div
                                className="
                                    mt-3
                                    h-4
                                    w-64
                                    animate-pulse
                                    rounded
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-tertiary)",
                                }}
                            />

                            <div
                                className="
                                    mt-8
                                    grid
                                    gap-4
                                    sm:grid-cols-2
                                "
                            >
                                <div
                                    className="
                                        h-28
                                        animate-pulse
                                        rounded-2xl
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />

                                <div
                                    className="
                                        h-28
                                        animate-pulse
                                        rounded-2xl
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />

                                <div
                                    className="
                                        h-28
                                        animate-pulse
                                        rounded-2xl
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />

                                <div
                                    className="
                                        h-28
                                        animate-pulse
                                        rounded-2xl
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // ============================================================
    // ERROR / NO USER
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
                }}
            >
                <div
                    className="
                        w-full
                        max-w-md
                        rounded-[2rem]
                        border
                        p-7
                        text-center
                        shadow-2xl
                    "
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    {/* ERROR ICON */}

                    <div
                        className="
                            mx-auto
                            flex
                            h-16
                            w-16
                            items-center
                            justify-center
                            rounded-2xl
                        "
                        style={{
                            background:
                                "var(--chat-danger-bg)",
                            color:
                                "var(--chat-danger)",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-7 w-7"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v4"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 17h.01"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.3 3.5L2.8 17a2 2 0 001.75 3h14.9a2 2 0 001.75-3L13.7 3.5a2 2 0 00-3.4 0z"
                            />
                        </svg>
                    </div>

                    <h2
                        className="
                            mt-5
                            text-xl
                            font-bold
                        "
                        style={{
                            color:
                                "var(--chat-text-primary)",
                        }}
                    >
                        Unable to load profile
                    </h2>

                    <p
                        className="
                            mt-2
                            text-sm
                            leading-6
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        {error ||
                            "Something went wrong while loading this profile."}
                    </p>

                    <button
                        type="button"
                        onClick={fetchProfile}
                        className="
                            mt-6
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            px-5
                            py-2.5
                            text-sm
                            font-semibold
                            transition
                            hover:opacity-90
                            active:scale-95
                        "
                        style={{
                            background:
                                "var(--chat-accent)",
                            color:
                                "var(--chat-accent-text)",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 11a8.1 8.1 0 00-15.5-2M4 5v4h4"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 13a8.1 8.1 0 0015.5 2M20 19v-4h-4"
                            />
                        </svg>

                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    // ============================================================
    // DISPLAY NAME
    // ============================================================

    const displayName =
        user.displayName?.trim() ||
        user.username ||
        "User";

    // ============================================================
    // PRIVACY STATES
    // ============================================================

    const onlineStatusHidden =
        !isOwnProfile &&
        user.onlineStatusHidden === true;

    const lastSeenHidden =
        !isOwnProfile &&
        user.lastSeenHidden === true;

    // ============================================================
    // SAFE ONLINE STATE
    // ============================================================

    const isOnline =
        !onlineStatusHidden &&
        Boolean(user.isOnline);

    // ============================================================
    // SAFE LAST SEEN
    // ============================================================

    const lastSeen =
        !lastSeenHidden
            ? user.lastSeen
            : null;

    // ============================================================
    // LAST SEEN TEXT
    // ============================================================

    let lastSeenText =
        "Never";

    if (isOnline) {
        lastSeenText =
            "Currently online";
    } else if (lastSeen) {
        const date =
            new Date(lastSeen);

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
    // ONLINE STATUS TEXT
    // ============================================================

    let onlineText =
        "Offline";

    if (onlineStatusHidden) {
        onlineText =
            "Online status hidden";
    } else if (isOnline) {
        onlineText =
            "Online";
    }

    // ============================================================
    // MEMBER SINCE
    // ============================================================

    const memberSince =
        user.createdAt
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
            : "Unknown";

    // ============================================================
    // MAIN UI
    // ============================================================

    return (
        <>
            <main
                className="
                    min-h-screen
                    px-4
                    py-5
                    sm:px-6
                    sm:py-8
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
                        max-w-5xl
                    "
                >
                    {/* =================================================
                        TOP NAVIGATION
                    ================================================= */}

                    <div
                        className="
                            mb-6
                            flex
                            items-center
                            justify-between
                            gap-4
                        "
                    >
                        <button
                            type="button"
                            onClick={() =>
                                router.back()
                            }
                            className="
                                group
                                flex
                                h-10
                                items-center
                                gap-2
                                rounded-xl
                                border
                                px-3
                                text-sm
                                font-medium
                                shadow-sm
                                transition
                                hover:-translate-x-0.5
                                hover:opacity-90
                                active:scale-95
                            "
                            style={{
                                background:
                                    "var(--chat-bg-secondary)",
                                borderColor:
                                    "var(--chat-border)",
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="
                                    h-4
                                    w-4
                                    transition
                                    group-hover:-translate-x-0.5
                                "
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>

                            Back
                        </button>

                        <div
                            className="
                                hidden
                                items-center
                                gap-2
                                rounded-full
                                border
                                px-3
                                py-1.5
                                text-xs
                                sm:flex
                            "
                            style={{
                                background:
                                    "var(--chat-bg-secondary)",
                                borderColor:
                                    "var(--chat-border)",
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            <span
                                className="
                                    h-1.5
                                    w-1.5
                                    rounded-full
                                "
                                style={{
                                    background:
                                        isOnline
                                            ? "#22c55e"
                                            : "var(--chat-text-muted)",
                                }}
                            />

                            ChatHub Profile
                        </div>
                    </div>

                    {/* =================================================
                        PAGE TITLE
                    ================================================= */}

                    <div className="mb-6">
                        <p
                            className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.2em]
                            "
                            style={{
                                color:
                                    "var(--chat-accent)",
                            }}
                        >
                            {isOwnProfile
                                ? "Account"
                                : "Member"}
                        </p>

                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-bold
                                tracking-tight
                                sm:text-4xl
                            "
                            style={{
                                color:
                                    "var(--chat-text-primary)",
                            }}
                        >
                            {isOwnProfile
                                ? "My Profile"
                                : "Profile"}
                        </h1>

                        <p
                            className="
                                mt-2
                                max-w-xl
                                text-sm
                                leading-6
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            {isOwnProfile
                                ? "Manage your identity, profile information, and presence on ChatHub."
                                : `View ${displayName}'s profile information and presence.`}
                        </p>
                    </div>

                    {/* =================================================
                        SUCCESS
                    ================================================= */}

                    {success && (
                        <div
                            className="
                                mb-5
                                flex
                                items-center
                                gap-3
                                rounded-2xl
                                border
                                px-4
                                py-3
                                text-sm
                                shadow-sm
                            "
                            style={{
                                borderColor:
                                    "var(--chat-success-border)",
                                background:
                                    "var(--chat-success-bg)",
                                color:
                                    "var(--chat-success)",
                            }}
                        >
                            <div
                                className="
                                    flex
                                    h-7
                                    w-7
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                "
                                style={{
                                    background:
                                        "rgba(34,197,94,0.12)",
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            {success}
                        </div>
                    )}

                    {/* =================================================
                        PROFILE CARD
                    ================================================= */}

                    <section
                        className="
                            overflow-hidden
                            rounded-[2rem]
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
                                h-40
                                overflow-hidden
                                sm:h-52
                            "
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--chat-bg-tertiary), var(--chat-bg-secondary))",
                            }}
                        >
                            {/* ACCENT GLOW */}

                            <div
                                className="
                                    absolute
                                    -right-16
                                    -top-24
                                    h-72
                                    w-72
                                    rounded-full
                                    blur-3xl
                                "
                                style={{
                                    background:
                                        "var(--chat-accent-soft)",
                                    opacity: 0.8,
                                }}
                            />

                            <div
                                className="
                                    absolute
                                    -bottom-32
                                    left-1/4
                                    h-72
                                    w-72
                                    rounded-full
                                    blur-3xl
                                "
                                style={{
                                    background:
                                        "var(--chat-accent-soft)",
                                    opacity: 0.5,
                                }}
                            />

                            {/* DECORATIVE GRID */}

                            <div
                                className="
                                    absolute
                                    inset-0
                                    opacity-20
                                "
                                style={{
                                    backgroundImage:
                                        "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                                    backgroundSize:
                                        "32px 32px",
                                }}
                            />

                            {/* TOP LABEL */}

                            <div
                                className="
                                    absolute
                                    right-5
                                    top-5
                                    rounded-full
                                    border
                                    px-3
                                    py-1.5
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wider
                                    backdrop-blur-md
                                "
                                style={{
                                    borderColor:
                                        "rgba(255,255,255,0.10)",
                                    background:
                                        "rgba(0,0,0,0.12)",
                                    color:
                                        "rgba(255,255,255,0.75)",
                                }}
                            >
                                {isOwnProfile
                                    ? "Your Profile"
                                    : "ChatHub Member"}
                            </div>
                        </div>

                        {/* =================================================
                            PROFILE CONTENT
                        ================================================= */}

                        <div
                            className="
                                px-5
                                pb-8
                                sm:px-8
                                sm:pb-10
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
                                    gap-6
                                    sm:-mt-20
                                    lg:flex-row
                                    lg:items-end
                                    lg:justify-between
                                "
                            >
                                <div
                                    className="
                                        flex
                                        min-w-0
                                        flex-col
                                        gap-5
                                        sm:flex-row
                                        sm:items-end
                                    "
                                >
                                    {/* AVATAR */}

                                    <div className="shrink-0">
                                        <div className="relative">
                                            <ProfileAvatar
                                                user={user}
                                                size="large"
                                                editable={
                                                    isOwnProfile
                                                }
                                                onAvatarUpdated={
                                                    isOwnProfile
                                                        ? handleAvatarUpdated
                                                        : undefined
                                                }
                                            />

                                            {/* ONLINE DOT */}

                                            {!onlineStatusHidden && (
                                                <span
                                                    className="
                                                        absolute
                                                        bottom-2
                                                        right-2
                                                        h-5
                                                        w-5
                                                        rounded-full
                                                        border-4
                                                    "
                                                    style={{
                                                        background:
                                                            isOnline
                                                                ? "#22c55e"
                                                                : "#64748b",
                                                        borderColor:
                                                            "var(--chat-bg-secondary)",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* USER INFO */}

                                    <div
                                        className="
                                            min-w-0
                                            pb-1
                                        "
                                    >
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
                                                    truncate
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
                                                {
                                                    displayName
                                                }
                                            </h2>

                                            {user.role ===
                                                "user" && (
                                                <span
                                                    className="
                                                        rounded-full
                                                        border
                                                        px-2.5
                                                        py-1
                                                        text-[9px]
                                                        font-bold
                                                        uppercase
                                                        tracking-wider
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
                                                    Member
                                                </span>
                                            )}
                                        </div>

                                        {/* USERNAME */}

                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            @{user.username}
                                        </p>

                                        {/* STATUS */}

                                        <div
                                            className="
                                                mt-3
                                                inline-flex
                                                items-center
                                                gap-2
                                                rounded-full
                                                border
                                                px-3
                                                py-1.5
                                            "
                                            style={{
                                                background:
                                                    isOnline
                                                        ? "rgba(34,197,94,0.08)"
                                                        : "var(--chat-bg-primary)",
                                                borderColor:
                                                    isOnline
                                                        ? "rgba(34,197,94,0.15)"
                                                        : "var(--chat-border)",
                                            }}
                                        >
                                            <span
                                                className="
                                                    h-1.5
                                                    w-1.5
                                                    rounded-full
                                                "
                                                style={{
                                                    background:
                                                        onlineStatusHidden
                                                            ? "var(--chat-text-muted)"
                                                            : isOnline
                                                            ? "#22c55e"
                                                            : "#64748b",
                                                }}
                                            />

                                            <span
                                                className="
                                                    text-xs
                                                    font-medium
                                                "
                                                style={{
                                                    color:
                                                        isOnline
                                                            ? "#22c55e"
                                                            : "var(--chat-text-muted)",
                                                }}
                                            >
                                                {
                                                    onlineText
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* EDIT BUTTON */}

                                {isOwnProfile && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditModalOpen(
                                                true
                                            )
                                        }
                                        className="
                                            group
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            px-5
                                            py-3
                                            text-sm
                                            font-semibold
                                            shadow-lg
                                            transition
                                            hover:-translate-y-0.5
                                            hover:opacity-95
                                            active:translate-y-0
                                            sm:w-auto
                                        "
                                        style={{
                                            background:
                                                "var(--chat-accent)",
                                            color:
                                                "var(--chat-accent-text)",
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="
                                                h-4
                                                w-4
                                                transition
                                                group-hover:rotate-[-8deg]
                                            "
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 20h9"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1-1 4 4-1L19.5 6.5a2.121 2.121 0 00-3-3z"
                                            />
                                        </svg>

                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            {/* =================================================
                                DIVIDER
                            ================================================= */}

                            <div
                                className="
                                    my-8
                                    h-px
                                "
                                style={{
                                    background:
                                        "var(--chat-border)",
                                }}
                            />

                            {/* =================================================
                                ABOUT
                            ================================================= */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    p-5
                                    sm:p-6
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
                                        gap-3
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                        "
                                        style={{
                                            background:
                                                "var(--chat-accent-soft)",
                                            color:
                                                "var(--chat-accent)",
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-4 w-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M20 11.5a8.38 8.38 0 01-1.9 5.4A8.5 8.5 0 1112 3.5"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M20 4v6h-6"
                                            />
                                        </svg>
                                    </div>

                                    <div>
                                        <p
                                            className="
                                                text-xs
                                                font-bold
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
                                                mt-0.5
                                                text-xs
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            A little about this
                                            member
                                        </p>
                                    </div>
                                </div>

                                <p
                                    className="
                                        mt-5
                                        whitespace-pre-wrap
                                        text-sm
                                        leading-7
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
                                INFORMATION GRID
                            ================================================= */}

                            <div
                                className="
                                    mt-5
                                    grid
                                    gap-4
                                    sm:grid-cols-2
                                "
                            >
                                {/* EMAIL */}

                                {isOwnProfile && (
                                    <ProfileInfoCard
                                        icon={
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-5 w-5"
                                            >
                                                <rect
                                                    width="20"
                                                    height="16"
                                                    x="2"
                                                    y="4"
                                                    rx="2"
                                                />

                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="m22 7-10 6L2 7"
                                                />
                                            </svg>
                                        }
                                        label="Email Address"
                                        value={
                                            user.email ||
                                            "Not available"
                                        }
                                    />
                                )}

                                {/* MEMBER SINCE */}

                                <ProfileInfoCard
                                    icon={
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-5 w-5"
                                        >
                                            <rect
                                                width="18"
                                                height="18"
                                                x="3"
                                                y="3"
                                                rx="2"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16 2v4M8 2v4M3 10h18"
                                            />
                                        </svg>
                                    }
                                    label="Member Since"
                                    value={memberSince}
                                />

                                {/* LAST SEEN */}

                                <ProfileInfoCard
                                    icon={
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-5 w-5"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="9"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 7v5l3 2"
                                            />
                                        </svg>
                                    }
                                    label="Last Seen"
                                    value={
                                        isOwnProfile
                                            ? lastSeenText
                                            : lastSeenHidden
                                            ? "Last seen hidden"
                                            : lastSeenText
                                    }
                                />

                                {/* STATUS */}

                                <ProfileInfoCard
                                    icon={
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-5 w-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 3a9 9 0 100 18 9 9 0 000-18z"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8 12l2.5 2.5L16 9"
                                            />
                                        </svg>
                                    }
                                    label="Presence"
                                    value={
                                        onlineStatusHidden
                                            ? "Hidden"
                                            : isOnline
                                            ? "Currently online"
                                            : "Offline"
                                    }
                                    status={
                                        !onlineStatusHidden
                                    }
                                    online={
                                        isOnline
                                    }
                                />
                            </div>

                            {/* =================================================
                                ACCOUNT SUMMARY
                            ================================================= */}

                            <div
                                className="
                                    mt-5
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
                                                font-bold
                                                uppercase
                                                tracking-wider
                                            "
                                            style={{
                                                color:
                                                    "var(--chat-text-muted)",
                                            }}
                                        >
                                            Profile Status
                                        </p>

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
                                            {isOwnProfile
                                                ? "Your ChatHub account is active."
                                                : `${displayName}'s ChatHub profile.`}
                                        </p>
                                    </div>

                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                        "
                                        style={{
                                            background:
                                                isOnline
                                                    ? "rgba(34,197,94,0.10)"
                                                    : "var(--chat-bg-tertiary)",
                                            color:
                                                isOnline
                                                    ? "#22c55e"
                                                    : "var(--chat-text-muted)",
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-5 w-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M20 7l-8 8-4-4"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <p
                        className="
                            mt-5
                            text-center
                            text-xs
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        {isOwnProfile
                            ? "Your profile information is only displayed according to your privacy settings."
                            : "Some information may be hidden according to this user's privacy settings."}
                    </p>
                </div>
            </main>

            {/* =========================================================
                EDIT PROFILE MODAL
            ========================================================= */}

            {isOwnProfile && (
                <EditProfileModal
                    user={user}
                    open={editModalOpen}
                    onClose={() =>
                        setEditModalOpen(
                            false
                        )
                    }
                    onUpdated={
                        handleProfileUpdated
                    }
                />
            )}
        </>
    );
}

// ================================================================
// PROFILE INFO CARD
// ================================================================

function ProfileInfoCard({
    icon,
    label,
    value,
    status = false,
    online = false,
}) {
    return (
        <div
            className="
                group
                rounded-2xl
                border
                p-5
                transition
                hover:-translate-y-0.5
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
                    items-start
                    gap-4
                "
            >
                {/* ICON */}

                <div
                    className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        transition
                        group-hover:scale-105
                    "
                    style={{
                        background:
                            "var(--chat-accent-soft)",
                        color:
                            "var(--chat-accent)",
                    }}
                >
                    {icon}
                </div>

                {/* CONTENT */}

                <div className="min-w-0">
                    <p
                        className="
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.15em]
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        {label}
                    </p>

                    <div
                        className="
                            mt-2
                            flex
                            items-center
                            gap-2
                        "
                    >
                        {status && (
                            <span
                                className="
                                    h-2
                                    w-2
                                    shrink-0
                                    rounded-full
                                "
                                style={{
                                    background:
                                        online
                                            ? "#22c55e"
                                            : "#64748b",
                                }}
                            />
                        )}

                        <p
                            className="
                                break-words
                                text-sm
                                font-medium
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            {value}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}