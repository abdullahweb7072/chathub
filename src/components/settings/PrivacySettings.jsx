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

            // ====================================================
            // USE SERVER VALUES
            // ====================================================

            setSettings({
                onlineStatus:
                    data.settings?.privacy?.onlineStatus ?? true,
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

            // ====================================================
            // UPDATE UI IMMEDIATELY
            // ====================================================

            setSettings(updatedPrivacy);

            // ====================================================
            // SAVE TO DATABASE
            // ====================================================

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

            // ====================================================
            // USE SERVER RESPONSE
            // ====================================================

            setSettings({
                onlineStatus:
                    data.settings?.privacy?.onlineStatus ?? true,
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

            // ====================================================
            // ROLLBACK IF API FAILS
            // ====================================================

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
                        border-[var(--chat-border)]
                        px-5
                        py-5
                        sm:px-8
                    "
                >
                    <div className="animate-pulse">
                        <div
                            className="
                                h-6
                                w-40
                                rounded
                                bg-[var(--chat-hover-bg)]
                            "
                        />

                        <div
                            className="
                                mt-2
                                h-4
                                w-80
                                rounded
                                bg-[var(--chat-hover-bg)]
                            "
                        />
                    </div>
                </div>

                <div className="p-5 sm:p-8">
                    <div
                        className="
                            animate-pulse
                            overflow-hidden
                            rounded-2xl
                            border
                            border-[var(--chat-border)]
                        "
                    >
                        <div
                            className="
                                h-20
                                bg-[var(--chat-hover-bg)]
                            "
                        />
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
                        rounded-xl
                        border
                        border-red-500/20
                        bg-red-500/10
                        px-4
                        py-3
                        text-sm
                        text-red-400
                    "
                >
                    {error ||
                        "Unable to load privacy settings."}
                </div>

                <button
                    type="button"
                    onClick={loadSettings}
                    className="
                        mt-4
                        rounded-xl
                        bg-[var(--chat-accent)]
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        text-[var(--chat-accent-text)]
                        transition
                        hover:opacity-90
                    "
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
        <div>
            {/* =====================================================
                HEADER
            ===================================================== */}

            <div
                className="
                    border-b
                    border-[var(--chat-border)]
                    px-5
                    py-5
                    sm:px-8
                "
            >
                <h2
                    className="
                        text-lg
                        font-semibold
                        text-[var(--chat-text-primary)]
                    "
                >
                    Privacy Settings
                </h2>

                <p
                    className="
                        mt-1
                        text-sm
                        text-[var(--chat-text-secondary)]
                    "
                >
                    Control what other people can see about your
                    activity.
                </p>
            </div>

            <div className="p-5 sm:p-8">
                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div
                        className="
                            mb-5
                            rounded-xl
                            border
                            border-red-500/20
                            bg-red-500/10
                            px-4
                            py-3
                            text-sm
                            text-red-400
                        "
                    >
                        {error}
                    </div>
                )}

                {/* =================================================
                    SUCCESS
                ================================================= */}

                {success && (
                    <div
                        className="
                            mb-5
                            rounded-xl
                            border
                            border-emerald-500/20
                            bg-emerald-500/10
                            px-4
                            py-3
                            text-sm
                            text-emerald-400
                        "
                    >
                        {success}
                    </div>
                )}

                {/* =================================================
                    PRIVACY SETTINGS
                ================================================= */}

                <div
                    className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[var(--chat-border)]
                        bg-[var(--chat-bg-secondary)]
                    "
                >
                    <SettingToggle
                        title="Show online status"
                        description="Allow other users to see when you are online."
                        enabled={settings.onlineStatus}
                        saving={
                            savingKey === "onlineStatus"
                        }
                        onChange={() =>
                            updateSetting("onlineStatus")
                        }
                        last
                    />
                </div>

                {/* =================================================
                    INFO
                ================================================= */}

                <div
                    className="
                        mt-5
                        rounded-xl
                        border
                        border-[var(--chat-accent)]/10
                        bg-[var(--chat-accent)]/5
                        px-4
                        py-3
                    "
                >
                    <p
                        className="
                            text-xs
                            leading-5
                            text-[var(--chat-text-secondary)]
                        "
                    >
                        Your privacy preferences are saved
                        automatically.
                    </p>
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
    last = false,
}) {
    return (
        <div
            className={`
                flex
                items-center
                justify-between
                gap-5
                px-4
                py-4
                transition
                hover:bg-[var(--chat-hover-bg)]
                sm:px-5
                ${
                    !last
                        ? "border-b border-[var(--chat-border)]"
                        : ""
                }
            `}
        >
            {/* ====================================================
                TEXT
            ==================================================== */}

            <div className="min-w-0">
                <p
                    className="
                        text-sm
                        font-medium
                        text-[var(--chat-text-primary)]
                    "
                >
                    {title}
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        leading-5
                        text-[var(--chat-text-secondary)]
                    "
                >
                    {description}
                </p>
            </div>

            {/* ====================================================
                HARDCODED TOGGLE UI
            ==================================================== */}

            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving}
                onClick={onChange}
                className={`
                    relative
                    h-6
                    w-11
                    shrink-0
                    rounded-full
                    transition
                    ${
                        enabled
                            ? "bg-[var(--chat-accent)]"
                            : "bg-[var(--chat-border)]"
                    }
                    ${
                        saving
                            ? "cursor-wait opacity-60"
                            : "cursor-pointer"
                    }
                `}
            >
                <span
                    className={`
                        absolute
                        top-1
                        h-4
                        w-4
                        rounded-full
                        bg-[var(--chat-accent-text)]
                        shadow-sm
                        transition
                        ${
                            enabled
                                ? "left-6"
                                : "left-1"
                        }
                    `}
                />
            </button>
        </div>
    );
}