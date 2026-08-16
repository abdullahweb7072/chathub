"use client";

import { useEffect, useState } from "react";

export default function NotificationSettings() {
    const [settings, setSettings] = useState(null);

    const [loading, setLoading] = useState(true);

    const [savingKey, setSavingKey] = useState("");

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    // ============================================================
    // FETCH SETTINGS
    // ============================================================

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/settings", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.error ||
                        "Failed to load notification settings."
                );
            }

            setSettings({
                messages:
                    data.settings?.notifications?.messages ??
                    true,

                friendRequests:
                    data.settings?.notifications
                        ?.friendRequests ?? true,

                sound:
                    data.settings?.notifications?.sound ??
                    true,

                preview:
                    data.settings?.notifications?.preview ??
                    true,
            });
        } catch (error) {
            console.error(
                "❌ LOAD NOTIFICATION SETTINGS ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to load notification settings."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // UPDATE SETTING
    // ============================================================

    async function updateSetting(key) {
        if (!settings || savingKey) {
            return;
        }

        const newValue = !settings[key];

        const previousValue = settings[key];

        try {
            setSavingKey(key);

            setError("");

            setSuccess("");

            // ----------------------------------------------------
            // OPTIMISTIC UI
            // ----------------------------------------------------

            setSettings((previous) => ({
                ...previous,
                [key]: newValue,
            }));

            // ----------------------------------------------------
            // SAVE
            // ----------------------------------------------------

            const response = await fetch("/api/settings", {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    notifications: {
                        [key]: newValue,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.error ||
                        "Failed to save notification setting."
                );
            }

            // ----------------------------------------------------
            // SERVER RESPONSE
            // ----------------------------------------------------

            setSettings({
                messages:
                    data.settings?.notifications?.messages ??
                    false,

                friendRequests:
                    data.settings?.notifications
                        ?.friendRequests ?? false,

                sound:
                    data.settings?.notifications?.sound ??
                    false,

                preview:
                    data.settings?.notifications?.preview ??
                    false,
            });

            setSuccess("Notification preference updated.");

            setTimeout(() => {
                setSuccess("");
            }, 2200);
        } catch (error) {
            console.error(
                "❌ SAVE NOTIFICATION SETTING ERROR:",
                error
            );

            // ----------------------------------------------------
            // ROLLBACK
            // ----------------------------------------------------

            setSettings((previous) => ({
                ...previous,
                [key]: previousValue,
            }));

            setError(
                error?.message ||
                    "Failed to save notification setting."
            );
        } finally {
            setSavingKey("");
        }
    }

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <div
                style={{
                    color: "var(--chat-text-primary)",
                }}
            >
                {/* HEADER */}

                <div
                    className="
                        border-b
                        px-5
                        py-6
                        sm:px-8
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div className="animate-pulse">
                        <div
                            className="
                                h-11
                                w-11
                                rounded-2xl
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                mt-4
                                h-6
                                w-52
                                rounded-lg
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                mt-2
                                h-4
                                w-72
                                rounded
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />
                    </div>
                </div>

                {/* CONTENT */}

                <div className="p-5 sm:p-8">
                    <div
                        className="
                            animate-pulse
                            space-y-3
                        "
                    >
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="
                                    flex
                                    items-center
                                    gap-4
                                    rounded-2xl
                                    border
                                    p-5
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-border)",
                                    background:
                                        "var(--chat-bg-secondary)",
                                }}
                            >
                                <div
                                    className="
                                        h-11
                                        w-11
                                        shrink-0
                                        rounded-xl
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />

                                <div className="flex-1">
                                    <div
                                        className="
                                            h-4
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
                                            mt-2
                                            h-3
                                            w-64
                                            max-w-full
                                            rounded
                                        "
                                        style={{
                                            background:
                                                "var(--chat-bg-tertiary)",
                                        }}
                                    />
                                </div>

                                <div
                                    className="
                                        h-6
                                        w-11
                                        rounded-full
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-tertiary)",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // ERROR / NO SETTINGS
    // ============================================================

    if (!settings) {
        return (
            <div className="p-5 sm:p-8">
                <div
                    className="
                        rounded-2xl
                        border
                        px-5
                        py-5
                    "
                    style={{
                        borderColor:
                            "var(--chat-danger-border)",
                        background:
                            "var(--chat-danger-bg)",
                    }}
                >
                    <div className="flex gap-3">
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
                                    "var(--chat-danger-bg)",
                                color:
                                    "var(--chat-danger)",
                            }}
                        >
                            <AlertIcon />
                        </div>

                        <div>
                            <p
                                className="
                                    text-sm
                                    font-semibold
                                "
                                style={{
                                    color:
                                        "var(--chat-danger)",
                                }}
                            >
                                Unable to load settings
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                "
                                style={{
                                    color:
                                        "var(--chat-text-secondary)",
                                }}
                            >
                                {error ||
                                    "Something went wrong while loading your notification preferences."}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadSettings}
                    className="
                        mt-4
                        rounded-xl
                        px-5
                        py-2.5
                        text-sm
                        font-semibold
                        text-white
                        transition
                        hover:opacity-90
                        active:scale-[0.98]
                    "
                    style={{
                        background:
                            "var(--chat-accent)",
                    }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // ============================================================
    // MAIN UI
    // ============================================================

    return (
        <div
            style={{
                color:
                    "var(--chat-text-primary)",
            }}
        >
            {/* =====================================================
                HEADER
            ===================================================== */}

            <div
                className="
                    relative
                    overflow-hidden
                    border-b
                    px-5
                    py-6
                    sm:px-8
                "
                style={{
                    borderColor:
                        "var(--chat-border)",
                }}
            >
                {/* DECORATIVE BACKGROUND */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-16
                        -top-16
                        h-40
                        w-40
                        rounded-full
                        opacity-30
                        blur-3xl
                    "
                    style={{
                        background:
                            "var(--chat-accent)",
                    }}
                />

                <div className="relative">
                    <div
                        className="
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-2xl
                        "
                        style={{
                            background:
                                "var(--chat-accent-soft)",
                            color:
                                "var(--chat-accent)",
                        }}
                    >
                        <BellIcon />
                    </div>

                    <div className="mt-4">
                        <h2
                            className="
                                text-xl
                                font-bold
                                tracking-tight
                            "
                            style={{
                                color:
                                    "var(--chat-text-primary)",
                            }}
                        >
                            Notification Settings
                        </h2>

                        <p
                            className="
                                mt-1.5
                                max-w-xl
                                text-sm
                                leading-6
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Choose how ChatHub keeps you
                            informed about messages,
                            requests, sounds, and previews.
                        </p>
                    </div>
                </div>
            </div>

            {/* =====================================================
                CONTENT
            ===================================================== */}

            <div className="p-5 sm:p-8">
                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <StatusMessage
                        type="error"
                        message={error}
                    />
                )}

                {/* =================================================
                    SUCCESS
                ================================================= */}

                {success && (
                    <StatusMessage
                        type="success"
                        message={success}
                    />
                )}

                {/* =================================================
                    QUICK STATUS
                ================================================= */}

                <div
                    className="
                        mb-5
                        flex
                        flex-col
                        gap-4
                        rounded-2xl
                        border
                        p-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                        background:
                            "var(--chat-bg-primary)",
                    }}
                >
                    <div className="flex items-center gap-3">
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
                                    "var(--chat-accent-soft)",
                                color:
                                    "var(--chat-accent)",
                            }}
                        >
                            <SettingsIcon />
                        </div>

                        <div>
                            <p
                                className="
                                    text-sm
                                    font-semibold
                                "
                                style={{
                                    color:
                                        "var(--chat-text-primary)",
                                }}
                            >
                                Notification preferences
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
                                Changes are saved automatically.
                            </p>
                        </div>
                    </div>

                    <div
                        className="
                            inline-flex
                            w-fit
                            items-center
                            gap-2
                            rounded-full
                            border
                            px-3
                            py-1.5
                            text-xs
                            font-medium
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
                        <span
                            className="
                                h-1.5
                                w-1.5
                                rounded-full
                            "
                            style={{
                                background:
                                    "var(--chat-success)",
                            }}
                        />

                        Auto saved
                    </div>
                </div>

                {/* =================================================
                    SETTINGS
                ================================================= */}

                <div className="space-y-3">
                    <NotificationCard
                        icon={<MessageIcon />}
                        title="Message notifications"
                        description="Get notified whenever someone sends you a new message."
                        enabled={settings.messages}
                        saving={
                            savingKey === "messages"
                        }
                        onChange={() =>
                            updateSetting("messages")
                        }
                    />

                    <NotificationCard
                        icon={<UserPlusIcon />}
                        title="Friend request notifications"
                        description="Get notified when someone sends you a friend request."
                        enabled={
                            settings.friendRequests
                        }
                        saving={
                            savingKey ===
                            "friendRequests"
                        }
                        onChange={() =>
                            updateSetting(
                                "friendRequests"
                            )
                        }
                    />

                    <NotificationCard
                        icon={<SoundIcon />}
                        title="Notification sound"
                        description="Play a sound whenever a new notification arrives."
                        enabled={settings.sound}
                        saving={
                            savingKey === "sound"
                        }
                        onChange={() =>
                            updateSetting("sound")
                        }
                    />

                    <NotificationCard
                        icon={<EyeIcon />}
                        title="Notification preview"
                        description="Show useful message information inside notification previews."
                        enabled={settings.preview}
                        saving={
                            savingKey === "preview"
                        }
                        onChange={() =>
                            updateSetting("preview")
                        }
                    />
                </div>

                {/* =================================================
                    FOOTER INFO
                ================================================= */}

                <div
                    className="
                        mt-5
                        flex
                        gap-3
                        rounded-2xl
                        border
                        p-4
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                        background:
                            "var(--chat-bg-primary)",
                    }}
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
                                "var(--chat-bg-tertiary)",
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        <InfoIcon />
                    </div>

                    <div>
                        <p
                            className="
                                text-xs
                                font-semibold
                            "
                            style={{
                                color:
                                    "var(--chat-text-primary)",
                            }}
                        >
                            About notifications
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                leading-5
                            "
                            style={{
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            You can change these preferences
                            at any time. Your choices are
                            saved automatically.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ================================================================
// NOTIFICATION CARD
// ================================================================

function NotificationCard({
    icon,
    title,
    description,
    enabled,
    saving,
    onChange,
}) {
    return (
        <div
            className="
                group
                relative
                overflow-hidden
                rounded-2xl
                border
                p-4
                transition-all
                duration-200
                sm:p-5
            "
            style={{
                borderColor: enabled
                    ? "var(--chat-accent)"
                    : "var(--chat-border)",

                background: enabled
                    ? "var(--chat-accent-soft)"
                    : "var(--chat-bg-primary)",
            }}
        >
            {/* ACTIVE ACCENT */}

            {enabled && (
                <div
                    className="
                        absolute
                        bottom-0
                        left-0
                        top-0
                        w-0.5
                    "
                    style={{
                        background:
                            "var(--chat-accent)",
                    }}
                />
            )}

            <div
                className="
                    flex
                    items-center
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
                    "
                    style={{
                        background: enabled
                            ? "var(--chat-accent-soft)"
                            : "var(--chat-bg-tertiary)",

                        color: enabled
                            ? "var(--chat-accent)"
                            : "var(--chat-text-secondary)",
                    }}
                >
                    {icon}
                </div>

                {/* TEXT */}

                <div className="min-w-0 flex-1">
                    <div
                        className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                        "
                    >
                        <p
                            className="
                                text-sm
                                font-semibold
                            "
                            style={{
                                color:
                                    "var(--chat-text-primary)",
                            }}
                        >
                            {title}
                        </p>

                        <span
                            className="
                                rounded-full
                                px-2
                                py-0.5
                                text-[10px]
                                font-semibold
                            "
                            style={{
                                background: enabled
                                    ? "var(--chat-success-bg)"
                                    : "var(--chat-bg-tertiary)",

                                color: enabled
                                    ? "var(--chat-success)"
                                    : "var(--chat-text-muted)",
                            }}
                        >
                            {enabled
                                ? "Enabled"
                                : "Disabled"}
                        </span>
                    </div>

                    <p
                        className="
                            mt-1
                            max-w-xl
                            text-xs
                            leading-5
                        "
                        style={{
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        {description}
                    </p>
                </div>

                {/* TOGGLE */}

                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${title}: ${
                        enabled
                            ? "enabled"
                            : "disabled"
                    }`}
                    disabled={saving}
                    onClick={onChange}
                    className="
                        relative
                        h-7
                        w-12
                        shrink-0
                        rounded-full
                        transition-all
                        duration-200
                        focus:outline-none
                        focus:ring-2
                        focus:ring-offset-2
                    "
                    style={{
                        background: enabled
                            ? "var(--chat-accent)"
                            : "var(--chat-bg-tertiary)",

                        "--tw-ring-color":
                            "var(--chat-accent-soft)",
                    }}
                >
                    <span
                        className="
                            absolute
                            top-1
                            h-5
                            w-5
                            rounded-full
                            bg-white
                            shadow-md
                            transition-all
                            duration-200
                        "
                        style={{
                            left: enabled
                                ? "24px"
                                : "4px",
                        }}
                    />

                    {saving && (
                        <span
                            className="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                rounded-full
                            "
                            style={{
                                background:
                                    "rgba(0,0,0,0.15)",
                            }}
                        >
                            <span
                                className="
                                    h-3
                                    w-3
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-white/40
                                    border-t-white
                                "
                            />
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}

// ================================================================
// STATUS MESSAGE
// ================================================================

function StatusMessage({
    type,
    message,
}) {
    const isError = type === "error";

    return (
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
            "
            style={{
                borderColor: isError
                    ? "var(--chat-danger-border)"
                    : "var(--chat-success-border)",

                background: isError
                    ? "var(--chat-danger-bg)"
                    : "var(--chat-success-bg)",
            }}
        >
            <div
                className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                "
                style={{
                    color: isError
                        ? "var(--chat-danger)"
                        : "var(--chat-success)",
                }}
            >
                {isError ? (
                    <AlertIcon />
                ) : (
                    <CheckIcon />
                )}
            </div>

            <p
                className="text-xs font-medium"
                style={{
                    color: isError
                        ? "var(--chat-danger)"
                        : "var(--chat-success)",
                }}
            >
                {message}
            </p>
        </div>
    );
}

// ================================================================
// ICONS
// ================================================================

function BellIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17H9m10-2.5c0 .8-.4 1.5-1.1 1.9-.4.2-.7.6-.8 1.1H6.9c-.1-.5-.4-.9-.8-1.1A2.2 2.2 0 0 1 5 14.5V11a7 7 0 1 1 14 0v3.5Z"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20h4"
            />
        </svg>
    );
}

function MessageIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5.2A7.5 7.5 0 1 1 20 11.5Z"
            />
        </svg>
    );
}

function UserPlusIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19a6 6 0 0 0-12 0"
            />

            <circle
                cx="9"
                cy="7"
                r="3"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 8v6m-3-3h6"
            />
        </svg>
    );
}

function SoundIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 10v4h4l5 4V6l-5 4H4Z"
            />

            <path
                strokeLinecap="round"
                d="M16 9.5a4 4 0 0 1 0 5"
            />

            <path
                strokeLinecap="round"
                d="M18.5 7a7.5 7.5 0 0 1 0 10"
            />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
            />

            <circle
                cx="12"
                cy="12"
                r="2.5"
            />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6.3v-2.5h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2H15v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.5H21a1.7 1.7 0 0 0-1.6 1Z"
            />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
            />

            <path
                strokeLinecap="round"
                d="M12 11v5"
            />

            <path
                strokeLinecap="round"
                d="M12 8h.01"
            />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.3 4.5 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"
            />

            <path
                strokeLinecap="round"
                d="M12 9v4"
            />

            <path
                strokeLinecap="round"
                d="M12 16h.01"
            />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
            />
        </svg>
    );
}