"use client";

export default function ConversationItem({
    conversation,
    active,
    onClick,

    // ============================================================
    // RESOLVED USER DATA
    // ============================================================

    user = null,
    userId = null,
    name = "Unknown",
    avatar = null,
    online = false,

    // ============================================================
    // MESSAGE DATA
    // ============================================================

    latestMessage = null,
    unreadCount = 0,
    lastMessage = "No messages yet",
    currentUserId,

    // ============================================================
    // HELPERS
    // ============================================================

    formatTime,
    onOpenProfile,
}) {
    // ============================================================
    // AVATAR INITIAL
    // ============================================================

    const avatarInitial =
        getInitials(name);

    // ============================================================
    // MESSAGE TIME
    // ============================================================

    const time =
        latestMessage?.createdAt &&
        formatTime
            ? formatTime(
                  latestMessage.createdAt
              )
            : "";

    // ============================================================
    // OPEN PROFILE
    // ============================================================

    const handleProfileClick = (
        event
    ) => {
        event.stopPropagation();

        if (
            typeof onOpenProfile ===
            "function"
        ) {
            onOpenProfile(
                event,
                userId
            );
        }
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                group
                flex
                w-full
                items-center
                gap-3
                border-b
                border-border
                px-3
                py-3
                text-left
                text-foreground
                transition-colors
                duration-200

                ${
                    active
                        ? "bg-active"
                        : "bg-background hover:bg-hover"
                }
            `}
        >
            {/* ====================================================
                AVATAR
            ==================================================== */}

            <div
                className={`
                    relative
                    h-12
                    w-12
                    shrink-0
                    cursor-pointer

                    ${
                        online
                            ? "rounded-full ring-2 ring-green-500 ring-offset-2 ring-offset-background"
                            : ""
                    }
                `}
                onClick={
                    handleProfileClick
                }
                title={
                    userId
                        ? `View ${name}'s profile`
                        : "View profile"
                }
                role="link"
                tabIndex={0}
                onKeyDown={(
                    event
                ) => {
                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {
                        event.preventDefault();

                        handleProfileClick(
                            event
                        );
                    }
                }}
            >
                <div
                    className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-full
                        bg-primary
                        text-sm
                        font-semibold
                        text-primary-foreground
                    "
                >
                    {/* =================================================
                        AVATAR IMAGE
                    ================================================= */}

                    {avatar ? (
                        <img
                            src={avatar}
                            alt={`${name} avatar`}
                            className="
                                h-full
                                w-full
                                object-cover
                            "
                            onError={(
                                event
                            ) => {
                                event.currentTarget.style.display =
                                    "none";

                                const fallback =
                                    event
                                        .currentTarget
                                        .nextElementSibling;

                                if (
                                    fallback
                                ) {
                                    fallback.style.display =
                                        "flex";
                                }
                            }}
                        />
                    ) : null}

                    {/* =================================================
                        AVATAR FALLBACK
                    ================================================= */}

                    <span
                        className={`
                            h-full
                            w-full
                            items-center
                            justify-center

                            ${
                                avatar
                                    ? "hidden"
                                    : "flex"
                            }
                        `}
                    >
                        {
                            avatarInitial
                        }
                    </span>
                </div>

                {/* ====================================================
                    ONLINE INDICATOR
                ==================================================== */}

                {online && (
                    <span
                        className="
                            absolute
                            bottom-0
                            right-0
                            h-3
                            w-3
                            rounded-full
                            border-2
                            border-background
                            bg-online
                        "
                        aria-label="Online"
                        title="Online"
                    />
                )}
            </div>

            {/* ====================================================
                CONTENT
            ==================================================== */}

            <div className="min-w-0 flex-1">
                {/* =================================================
                    NAME + TIME
                ================================================= */}

                <div className="flex items-center justify-between gap-2">
                    <h3
                        className={`
                            truncate
                            text-[15px]

                            ${
                                unreadCount >
                                0
                                    ? "font-bold text-foreground"
                                    : "font-medium text-secondary"
                            }
                        `}
                    >
                        {name}
                    </h3>

                    {time && (
                        <span
                            className={`
                                shrink-0
                                text-[11px]

                                ${
                                    unreadCount >
                                    0
                                        ? "font-semibold text-primary"
                                        : "text-muted"
                                }
                            `}
                        >
                            {time}
                        </span>
                    )}
                </div>

                {/* =================================================
                    MESSAGE + UNREAD
                ================================================= */}

                <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                        className={`
                            min-w-0
                            flex-1
                            truncate
                            text-xs

                            ${
                                unreadCount >
                                0
                                    ? "font-semibold text-secondary"
                                    : "text-muted"
                            }
                        `}
                    >
                        {/* =================================================
                            OWN MESSAGE
                        ================================================= */}

                        {Number(
                            latestMessage?.senderId
                        ) ===
                            Number(
                                currentUserId
                            ) &&
                            "You: "}

                        {lastMessage}
                    </p>

                    {/* =================================================
                        UNREAD BADGE
                    ================================================= */}

                    {unreadCount >
                        0 && (
                        <span
                            className="
                                flex
                                h-5
                                min-w-5
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-primary
                                px-1.5
                                text-[10px]
                                font-bold
                                text-primary-foreground
                            "
                        >
                            {unreadCount >
                            99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ================================================================
// INITIALS
// ================================================================

function getInitials(name) {
    if (!name) {
        return "?";
    }

    return name
        .split(" ")
        .filter(Boolean)
        .map(
            (word) =>
                word[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();
}