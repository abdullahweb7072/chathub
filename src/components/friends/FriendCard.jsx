"use client";

import Image from "next/image";

// ============================================================
// HARD-CODED FRIEND CARD UI CONFIG
// Static design values stay hardcoded.
// Dynamic friend data remains data-driven.
// ============================================================

const COLORS = {
    background: "#ffffff",
    backgroundTertiary: "#f1f5f9",

    border: "#e2e8f0",

    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",

    accent: "#2563eb",
    accentHover: "#1d4ed8",

    online: "#059669",
    offline: "#94a3b8",

    white: "#ffffff",
};

const SIZES = {
    avatar: "56px",
    onlineIndicator: "16px",
    borderRadius: "16px",
    buttonRadius: "12px",
    padding: "16px",
};

// ============================================================
// COMPONENT
// ============================================================

export default function FriendCard({
    friend,
    conversation,
    onMessage,
}) {
    if (!friend) {
        return null;
    }

    const {
        id,
        username,
        avatar,
        bio,
        isOnline,
        lastSeen,
    } = friend;

    // ========================================================
    // FORMAT LAST SEEN
    // ========================================================

    const formatLastSeen = () => {
        if (!lastSeen) {
            return "Offline";
        }

        const date = new Date(lastSeen);

        if (Number.isNaN(date.getTime())) {
            return "Offline";
        }

        return `Last seen ${date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
        })}`;
    };

    // ========================================================
    // MESSAGE FRIEND
    // ========================================================

    const handleMessage = () => {
        console.log("💬 Message friend:", {
            friend,
            conversation,
        });

        onMessage?.(friend, conversation);
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className="
                group
                flex
                items-center
                gap-4
                rounded-2xl
                border
                p-4
                shadow-sm
                transition
                hover:shadow-md
            "
            style={{
                background: COLORS.background,
                borderColor: COLORS.border,
                color: COLORS.textPrimary,
            }}
        >
            {/* ==================================================
                AVATAR
            ================================================== */}

            <div
                className="relative shrink-0"
                style={{
                    width: SIZES.avatar,
                    height: SIZES.avatar,
                }}
            >
                {avatar ? (
                    <Image
                        src={avatar}
                        alt={
                            username || "Friend"
                        }
                        width={56}
                        height={56}
                        className="
                            h-14
                            w-14
                            rounded-full
                            object-cover
                        "
                    />
                ) : (
                    <div
                        className="
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
                                COLORS.accent,
                            color: COLORS.white,
                        }}
                    >
                        {username
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "U"}
                    </div>
                )}

                {/* ==================================================
                    ONLINE INDICATOR
                ================================================== */}

                <span
                    className="
                        absolute
                        bottom-0
                        right-0
                        rounded-full
                        border-2
                    "
                    style={{
                        width:
                            SIZES.onlineIndicator,
                        height:
                            SIZES.onlineIndicator,

                        background: isOnline
                            ? COLORS.online
                            : COLORS.offline,

                        borderColor:
                            COLORS.background,
                    }}
                />
            </div>

            {/* ==================================================
                USER INFORMATION
            ================================================== */}

            <div className="min-w-0 flex-1">
                <h3
                    className="
                        truncate
                        text-base
                        font-semibold
                    "
                    style={{
                        color:
                            COLORS.textPrimary,
                    }}
                >
                    {username}
                </h3>

                <p
                    className="
                        truncate
                        text-sm
                    "
                    style={{
                        color: isOnline
                            ? COLORS.online
                            : COLORS.textSecondary,
                    }}
                >
                    {isOnline
                        ? "Online"
                        : formatLastSeen()}
                </p>

                {bio && (
                    <p
                        className="
                            mt-1
                            truncate
                            text-xs
                        "
                        style={{
                            color:
                                COLORS.textMuted,
                        }}
                    >
                        {bio}
                    </p>
                )}
            </div>

            {/* ==================================================
                MESSAGE BUTTON
            ================================================== */}

            <button
                type="button"
                onClick={handleMessage}
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
                "
                style={{
                    background:
                        COLORS.accent,
                    color: COLORS.white,
                }}
            >
                Message
            </button>
        </div>
    );
}