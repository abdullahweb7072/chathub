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

    const searchParams =
        useSearchParams();

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

            // ====================================================
            // OWN PROFILE / OTHER USER PROFILE
            // ====================================================

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
                    Accept:
                        "application/json",
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

            // ====================================================
            // DETERMINE PROFILE TYPE
            // ====================================================

            const ownProfile =
                viewedUserId
                    ? Boolean(
                          data.isOwnProfile
                      )
                    : true;

            setIsOwnProfile(
                ownProfile
            );

            // ====================================================
            // USER DATA
            // ====================================================

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
                // ------------------------------------------------
                // ONLINE STATUS
                // ------------------------------------------------

                if (
                    fetchedUser.showOnlineStatus ===
                    false
                ) {
                    safeUser.isOnline =
                        false;

                    safeUser.onlineStatusHidden =
                        true;
                }

                // ------------------------------------------------
                // LAST SEEN
                // ------------------------------------------------

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

            setUser(
                safeUser
            );
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
        setUser(
            updatedUser
        );

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
        setUser(
            updatedUser
        );

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
                    <div className="animate-pulse">
                        <div
                            className="
                                h-8
                                w-40
                                rounded-lg
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                mt-8
                                overflow-hidden
                                rounded-3xl
                                border
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
                                    h-32
                                    sm:h-40
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-tertiary)",
                                }}
                            />

                            <div className="p-6">
                                <div className="-mt-20">
                                    <div
                                        className="
                                            h-32
                                            w-32
                                            rounded-full
                                            border-4
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
                                        h-6
                                        w-40
                                        rounded
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
                                        rounded
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />

                                <div className="mt-8 space-y-4">
                                    <div
                                        className="
                                            h-16
                                            rounded-xl
                                        "
                                        style={{
                                            background:
                                                "var(--chat-bg-tertiary)",
                                        }}
                                    />

                                    <div
                                        className="
                                            h-16
                                            rounded-xl
                                        "
                                        style={{
                                            background:
                                                "var(--chat-bg-tertiary)",
                                        }}
                                    />

                                    <div
                                        className="
                                            h-24
                                            rounded-xl
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
                        p-6
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
                        Unable to load profile
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
                            "Something went wrong."}
                    </p>

                    <button
                        type="button"
                        onClick={
                            fetchProfile
                        }
                        className="
                            mt-6
                            rounded-xl
                            border
                            px-5
                            py-2.5
                            text-sm
                            font-semibold
                            transition
                            hover:opacity-90
                        "
                        style={{
                            background:
                                "var(--chat-accent)",
                            borderColor:
                                "var(--chat-accent)",
                            color:
                                "var(--chat-text-primary)",
                        }}
                    >
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
    } else {
        onlineText =
            "Offline";
    }

    // ============================================================
    // MAIN UI
    // ============================================================

    return (
        <>
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
                        BACK BUTTON
                    ================================================= */}

                    <button
                        type="button"
                        onClick={() =>
                            router.back()
                        }
                        className="
                            mb-5
                            flex
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
                                "var(--chat-bg-secondary)",
                            borderColor:
                                "var(--chat-border)",
                            color:
                                "var(--chat-text-primary)",
                        }}
                        aria-label="Go back"
                        title="Go back"
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
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>

                    {/* =================================================
                        PAGE HEADER
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
                            {isOwnProfile
                                ? "My Profile"
                                : "Profile"}
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
                            {isOwnProfile
                                ? "Manage your ChatHub profile."
                                : `Viewing ${displayName}'s profile.`}
                        </p>
                    </div>

                    {/* =================================================
                        SUCCESS MESSAGE
                    ================================================= */}

                    {success && (
                        <div
                            className="
                                mb-5
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
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
                            {success}
                        </div>
                    )}

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
                                    "var(--chat-bg-tertiary)",
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
                                    sm:justify-between
                                "
                            >
                                <div
                                    className="
                                        flex
                                        flex-col
                                        items-start
                                        gap-4
                                        sm:flex-row
                                        sm:items-end
                                    "
                                >
                                    {/* =================================================
                                        AVATAR
                                    ================================================= */}

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

                                        {/* EMAIL */}

                                        {isOwnProfile &&
                                            user.email && (
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
                                                    {
                                                        user.email
                                                    }
                                                </p>
                                            )}

                                        {/* ONLINE STATUS */}

                                        <div
                                            className="
                                                mt-2
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
                                                    background:
                                                        isOnline
                                                            ? "#22c55e"
                                                            : "#64748b",
                                                }}
                                            />

                                            <span
                                                style={{
                                                    color:
                                                        "var(--chat-text-muted)",
                                                }}
                                            >
                                                {
                                                    onlineText
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* =================================================
                                    EDIT PROFILE BUTTON
                                ================================================= */}

                                {isOwnProfile && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditModalOpen(
                                                true
                                            )
                                        }
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            border
                                            px-5
                                            py-2.5
                                            text-sm
                                            font-semibold
                                            transition
                                            hover:opacity-90
                                            sm:w-auto
                                        "
                                        style={{
                                            background:
                                                "var(--chat-accent)",
                                            borderColor:
                                                "var(--chat-accent)",
                                            color:
                                                "var(--chat-text-primary)",
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
                                                d="M12 20h9"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                                            />
                                        </svg>

                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            {/* =================================================
                                DETAILS
                            ================================================= */}

                            <div className="mt-8 grid gap-5">
                                {/* =================================================
                                    BIO
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
                                    INFORMATION
                                ================================================= */}

                                <div
                                    className="
                                        grid
                                        gap-5
                                        md:grid-cols-2
                                    "
                                >
                                    {/* EMAIL */}

                                    {isOwnProfile && (
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
                                                Email
                                            </p>

                                            <p
                                                className="
                                                    mt-3
                                                    break-all
                                                    text-sm
                                                "
                                                style={{
                                                    color:
                                                        "var(--chat-text-secondary)",
                                                }}
                                            >
                                                {
                                                    user.email
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {/* MEMBER SINCE */}

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
                                                {isOwnProfile
                                                    ? lastSeenText
                                                    : lastSeenHidden
                                                    ? "Last seen hidden"
                                                    : lastSeenText}
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
                                                    onlineStatusHidden
                                                        ? "var(--chat-bg-tertiary)"
                                                        : isOnline
                                                        ? "rgba(34,197,94,0.10)"
                                                        : "var(--chat-bg-tertiary)",
                                                color:
                                                    onlineStatusHidden
                                                        ? "var(--chat-text-muted)"
                                                        : isOnline
                                                        ? "#22c55e"
                                                        : "var(--chat-text-muted)",
                                            }}
                                        >
                                            {onlineStatusHidden
                                                ? "Hidden"
                                                : isOnline
                                                ? "Online"
                                                : "Offline"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* =========================================================
                EDIT PROFILE MODAL
            ========================================================= */}

            {isOwnProfile && (
                <EditProfileModal
                    user={user}
                    open={
                        editModalOpen
                    }
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