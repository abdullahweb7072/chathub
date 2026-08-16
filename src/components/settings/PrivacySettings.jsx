"use client";

import { useEffect, useState } from "react";

export default function PrivacySettings() {
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
                        "Failed to load privacy settings."
                );
            }

            setSettings({
                onlineStatus:
                    data.settings?.privacy?.onlineStatus ??
                    true,
            });
        } catch (error) {
            console.error(
                "❌ LOAD PRIVACY SETTINGS ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to load privacy settings."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // UPDATE PRIVACY SETTING
    // ============================================================

    async function updateSetting(key) {
        if (!settings) {
            return;
        }

        const newValue = !settings[key];
        const previousValue = settings[key];

        const updatedPrivacy = {
            ...settings,
            [key]: newValue,
        };

        try {
            setSavingKey(key);
            setError("");
            setSuccess("");

            // Optimistic UI
            setSettings(updatedPrivacy);

            const response = await fetch("/api/settings", {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    privacy: updatedPrivacy,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.error ||
                        "Failed to save privacy setting."
                );
            }

            setSettings({
                onlineStatus:
                    data.settings?.privacy?.onlineStatus ??
                    true,
            });

            setSuccess("Privacy setting saved.");

            setTimeout(() => {
                setSuccess("");
            }, 2000);
        } catch (error) {
            console.error(
                "❌ SAVE PRIVACY SETTING ERROR:",
                error
            );

            // Rollback
            setSettings((previous) => ({
                ...previous,
                [key]: previousValue,
            }));

            setError(
                error?.message ||
                    "Failed to save privacy setting."
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
            <div>
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
                                h-7
                                w-44
                                rounded-lg
                            "
                            style={{
                                background:
                                    "var(--chat-hover-bg)",
                            }}
                        />

                        <div
                            className="
                                mt-3
                                h-4
                                w-80
                                max-w-full
                                rounded
                            "
                            style={{
                                background:
                                    "var(--chat-hover-bg)",
                            }}
                        />
                    </div>
                </div>

                <div className="p-5 sm:p-8">
                    <div
                        className="
                            animate-pulse
                            rounded-2xl
                            border
                            p-5
                        "
                        style={{
                            borderColor:
                                "var(--chat-border)",
                            background:
                                "var(--chat-bg-primary)",
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="
                                    h-12
                                    w-12
                                    shrink-0
                                    rounded-2xl
                                "
                                style={{
                                    background:
                                        "var(--chat-hover-bg)",
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
                                            "var(--chat-hover-bg)",
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
                                            "var(--chat-hover-bg)",
                                    }}
                                />
                            </div>

                            <div
                                className="
                                    h-7
                                    w-12
                                    rounded-full
                                "
                                style={{
                                    background:
                                        "var(--chat-hover-bg)",
                                }}
                            />
                        </div>
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
                        py-4
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
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                            "
                            style={{
                                background:
                                    "var(--chat-danger)",
                                color: "white",
                            }}
                        >
                            <ErrorIcon />
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
                                Unable to load settings
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-5
                                "
                                style={{
                                    color:
                                        "var(--chat-danger)",
                                }}
                            >
                                {error ||
                                    "Something went wrong while loading your privacy settings."}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadSettings}
                    className="
                        mt-4
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        px-4
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
                    <RefreshIcon />
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
                    background:
                        "var(--chat-bg-secondary)",
                }}
            >
                {/* Decorative glow */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-12
                        -top-16
                        h-36
                        w-36
                        rounded-full
                        opacity-20
                        blur-3xl
                    "
                    style={{
                        background:
                            "var(--chat-accent)",
                    }}
                />

                <div className="relative flex items-start gap-4">
                    {/* ICON */}

                    <div
                        className="
                            flex
                            h-12
                            w-12
                            shrink-0
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
                        <ShieldIcon />
                    </div>

                    {/* TITLE */}

                    <div className="min-w-0">
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
                            Privacy & Visibility
                        </h2>

                        <p
                            className="
                                mt-1.5
                                max-w-xl
                                text-sm
                                leading-5
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Choose what other people can
                            see about your activity on
                            ChatHub.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-8">
                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div
                        className="
                            mb-5
                            rounded-2xl
                            border
                            px-4
                            py-3.5
                        "
                        style={{
                            borderColor:
                                "var(--chat-danger-border)",
                            background:
                                "var(--chat-danger-bg)",
                        }}
                    >
                        <div className="flex items-center gap-3">
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
                                    background:
                                        "var(--chat-danger)",
                                    color: "white",
                                }}
                            >
                                <ErrorIcon />
                            </div>

                            <p
                                className="
                                    text-sm
                                    font-medium
                                "
                                style={{
                                    color:
                                        "var(--chat-danger)",
                                }}
                            >
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {/* =================================================
                    SUCCESS
                ================================================= */}

                {success && (
                    <div
                        className="
                            mb-5
                            rounded-2xl
                            border
                            px-4
                            py-3.5
                        "
                        style={{
                            borderColor:
                                "var(--chat-success-border)",
                            background:
                                "var(--chat-success-bg)",
                        }}
                    >
                        <div className="flex items-center gap-3">
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
                                    background:
                                        "var(--chat-success)",
                                    color: "white",
                                }}
                            >
                                <CheckIcon />
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
                                    Saved successfully
                                </p>

                                <p
                                    className="
                                        mt-0.5
                                        text-xs
                                    "
                                    style={{
                                        color:
                                            "var(--chat-text-secondary)",
                                    }}
                                >
                                    Your privacy preference
                                    has been updated.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* =================================================
                    VISIBILITY OVERVIEW
                ================================================= */}

                <div
                    className="
                        mb-5
                        overflow-hidden
                        rounded-2xl
                        border
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
                            border-b
                            px-5
                            py-4
                        "
                        style={{
                            borderColor:
                                "var(--chat-border)",
                        }}
                    >
                        <div className="flex items-center justify-between">
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
                                    Visibility
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
                                    Manage how your activity
                                    appears to others.
                                </p>
                            </div>

                            <div
                                className="
                                    rounded-full
                                    px-2.5
                                    py-1
                                    text-[11px]
                                    font-semibold
                                "
                                style={{
                                    background:
                                        settings.onlineStatus
                                            ? "var(--chat-success-bg)"
                                            : "var(--chat-bg-tertiary)",
                                    color:
                                        settings.onlineStatus
                                            ? "var(--chat-success)"
                                            : "var(--chat-text-muted)",
                                }}
                            >
                                {settings.onlineStatus
                                    ? "Visible"
                                    : "Private"}
                            </div>
                        </div>
                    </div>

                    <SettingToggle
                        title="Show online status"
                        description="Allow other users to see when you are currently online."
                        enabled={
                            settings.onlineStatus
                        }
                        saving={
                            savingKey ===
                            "onlineStatus"
                        }
                        onChange={() =>
                            updateSetting(
                                "onlineStatus"
                            )
                        }
                        icon={<OnlineIcon />}
                        last
                    />
                </div>

                {/* =================================================
                    STATUS PREVIEW
                ================================================= */}

                <div
                    className="
                        mb-5
                        rounded-2xl
                        border
                        p-5
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                        background:
                            "var(--chat-bg-primary)",
                    }}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className="
                                flex
                                h-11
                                w-11
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
                            <EyeIcon />
                        </div>

                        <div className="min-w-0">
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
                                What others see
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-5
                                "
                                style={{
                                    color:
                                        "var(--chat-text-secondary)",
                                }}
                            >
                                {settings.onlineStatus
                                    ? "When you are online, people you chat with can see your online indicator."
                                    : "Your online presence is hidden from other users."}
                            </p>

                            {/* STATUS PREVIEW */}

                            <div
                                className="
                                    mt-4
                                    flex
                                    items-center
                                    gap-3
                                    rounded-xl
                                    border
                                    px-3
                                    py-2.5
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-border)",
                                    background:
                                        "var(--chat-bg-secondary)",
                                }}
                            >
                                <div className="relative">
                                    <div
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-full
                                            text-xs
                                            font-bold
                                            text-white
                                        "
                                        style={{
                                            background:
                                                "var(--chat-accent)",
                                        }}
                                    >
                                        Y
                                    </div>

                                    {settings.onlineStatus && (
                                        <span
                                            className="
                                                absolute
                                                -bottom-0.5
                                                -right-0.5
                                                h-3
                                                w-3
                                                rounded-full
                                                border-2
                                            "
                                            style={{
                                                background:
                                                    "var(--chat-success)",
                                                borderColor:
                                                    "var(--chat-bg-secondary)",
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="min-w-0">
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
                                        Your profile
                                    </p>

                                    <p
                                        className="
                                            text-[11px]
                                        "
                                        style={{
                                            color:
                                                settings.onlineStatus
                                                    ? "var(--chat-success)"
                                                    : "var(--chat-text-muted)",
                                        }}
                                    >
                                        {settings.onlineStatus
                                            ? "Online"
                                            : "Offline / hidden"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =================================================
                    INFO
                ================================================= */}

                <div
                    className="
                        flex
                        items-start
                        gap-3
                        rounded-2xl
                        border
                        px-4
                        py-4
                    "
                    style={{
                        borderColor:
                            "var(--chat-accent-soft)",
                        background:
                            "var(--chat-accent-soft)",
                    }}
                >
                    <div
                        className="
                            mt-0.5
                            shrink-0
                        "
                        style={{
                            color:
                                "var(--chat-accent)",
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
                            Privacy is always in your
                            control
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                leading-5
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Changes are saved
                            automatically. You can update
                            this preference whenever you
                            want.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ================================================================
// TOGGLE COMPONENT
// ================================================================

function SettingToggle({
    title,
    description,
    enabled,
    saving,
    onChange,
    icon,
    last = false,
}) {
    return (
        <div
            className={`
                group
                flex
                items-center
                justify-between
                gap-5
                px-5
                py-5
                transition
                sm:px-6
                ${!last ? "border-b" : ""}
            `}
            style={{
                borderColor:
                    "var(--chat-border)",
            }}
        >
            <div className="flex min-w-0 items-center gap-4">
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
                            : "var(--chat-text-muted)",
                    }}
                >
                    {icon}
                </div>

                {/* TEXT */}

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
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

                        {enabled && (
                            <span
                                className="
                                    hidden
                                    rounded-full
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    font-semibold
                                    sm:inline-flex
                                "
                                style={{
                                    background:
                                        "var(--chat-success-bg)",
                                    color:
                                        "var(--chat-success)",
                                }}
                            >
                                Active
                            </span>
                        )}
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
            </div>

            {/* ====================================================
                TOGGLE
            ==================================================== */}

            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={title}
                disabled={saving}
                onClick={onChange}
                className="
                    relative
                    h-7
                    w-12
                    shrink-0
                    rounded-full
                    p-0.5
                    transition-all
                    duration-200
                    focus:outline-none
                    focus:ring-2
                    focus:ring-offset-2
                    disabled:cursor-wait
                    disabled:opacity-60
                "
                style={{
                    background: enabled
                        ? "var(--chat-accent)"
                        : "var(--chat-border)",
                    "--tw-ring-color":
                        "var(--chat-accent-soft)",
                    "--tw-ring-offset-color":
                        "var(--chat-bg-primary)",
                }}
            >
                <span
                    className={`
                        absolute
                        top-1/2
                        h-6
                        w-6
                        -translate-y-1/2
                        rounded-full
                        bg-white
                        shadow-md
                        transition-all
                        duration-200
                        ${
                            enabled
                                ? "left-[23px]"
                                : "left-[2px]"
                        }
                    `}
                >
                    {saving && (
                        <span
                            className="
                                absolute
                                inset-0
                                m-auto
                                h-3
                                w-3
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
                    )}
                </span>
            </button>
        </div>
    );
}

// ================================================================
// ICONS
// ================================================================

function ShieldIcon() {
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
                d="M12 3l7 3v5c0 4.7-2.9 8.5-7 10-4.1-1.5-7-5.3-7-10V6l7-3z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.5 12l1.7 1.7 3.5-3.5"
            />
        </svg>
    );
}

function OnlineIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <circle cx="12" cy="8" r="3" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 20c.7-3.2 3.2-5 7-5s6.3 1.8 7 5"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 5v4M16 7h4"
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
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
            />
            <circle cx="12" cy="12" r="2.5" />
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
            className="h-5 w-5"
        >
            <circle cx="12" cy="12" r="9" />
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

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-4 w-4"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12.5l4 4L19 7"
            />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4"
            />
            <path
                strokeLinecap="round"
                d="M12 16h.01"
            />
            <circle cx="12" cy="12" r="9" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg
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
    );
}