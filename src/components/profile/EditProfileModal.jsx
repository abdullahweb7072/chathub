"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function EditProfileModal({
    user,
    open,
    onClose,
    onUpdated,
}) {
    // ============================================================
    // THEME
    // ============================================================

    const { theme } = useTheme();

    const isDark = theme === "dark";

    // ============================================================
    // THEME COLORS
    // ============================================================

    const modalBackground = isDark
        ? "#111827"
        : "#ffffff";

    const headerBackground = isDark
        ? "#151f32"
        : "#f8fafc";

    const inputBackground = isDark
        ? "#1f2937"
        : "#f8fafc";

    const disabledBackground = isDark
        ? "#273244"
        : "#f1f5f9";

    const borderColor = isDark
        ? "#374151"
        : "#e5e7eb";

    const primaryText = isDark
        ? "#f9fafb"
        : "#111827";

    const secondaryText = isDark
        ? "#d1d5db"
        : "#374151";

    const mutedText = isDark
        ? "#9ca3af"
        : "#64748b";

    const accentColor = isDark
        ? "#818cf8"
        : "#4f46e5";

    const accentSoft = isDark
        ? "rgba(129,140,248,0.14)"
        : "rgba(79,70,229,0.08)";

    // ============================================================
    // FORM STATE
    // ============================================================

    const [displayName, setDisplayName] =
        useState("");

    const [bio, setBio] =
        useState("");

    // ============================================================
    // UI STATE
    // ============================================================

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    // ============================================================
    // LOAD USER DATA
    // ============================================================

    useEffect(() => {
        if (open && user) {
            setDisplayName(
                user.displayName || ""
            );

            setBio(
                user.bio || ""
            );

            setError("");
        }
    }, [open, user]);

    // ============================================================
    // CLOSE WITH ESCAPE
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(event) {
            if (
                event.key === "Escape" &&
                !saving
            ) {
                onClose?.();
            }
        }

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
    }, [open, saving, onClose]);

    // ============================================================
    // MODAL CLOSED
    // ============================================================

    if (!open) {
        return null;
    }

    // ============================================================
    // USER INFORMATION
    // ============================================================

    const username =
        user?.username || "user";

    const displayInitial =
        (
            displayName.trim() ||
            username
        )
            .charAt(0)
            .toUpperCase();

    // ============================================================
    // SAVE PROFILE
    // ============================================================

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        const cleanDisplayName =
            displayName.trim();

        const cleanBio =
            bio.trim();

        // ========================================================
        // DISPLAY NAME VALIDATION
        // ========================================================

        if (
            cleanDisplayName.length < 1
        ) {
            setError(
                "Display name cannot be empty."
            );

            return;
        }

        if (
            cleanDisplayName.length > 50
        ) {
            setError(
                "Display name cannot exceed 50 characters."
            );

            return;
        }

        // ========================================================
        // BIO VALIDATION
        // ========================================================

        if (
            cleanBio.length > 160
        ) {
            setError(
                "Bio cannot exceed 160 characters."
            );

            return;
        }

        // ========================================================
        // SAVE
        // ========================================================

        try {
            setSaving(true);

            const response =
                await fetch(
                    "/api/profile",
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json",
                        },

                        credentials:
                            "include",

                        body: JSON.stringify({
                            displayName:
                                cleanDisplayName,

                            bio:
                                cleanBio,
                        }),
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
                        "Failed to update profile."
                );
            }

            // ====================================================
            // UPDATE PARENT
            // ====================================================

            onUpdated?.(
                data.user
            );

            // ====================================================
            // CLOSE
            // ====================================================

            onClose?.();
        } catch (error) {
            console.error(
                "❌ EDIT PROFILE ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to update profile."
            );
        } finally {
            setSaving(false);
        }
    }

    // ============================================================
    // CLOSE BACKDROP
    // ============================================================

    function handleBackdropClick(event) {
        if (
            event.target ===
                event.currentTarget &&
            !saving
        ) {
            onClose?.();
        }
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className="
                fixed
                inset-0
                z-50
                flex
                items-center
                justify-center
                overflow-y-auto
                bg-black/60
                px-4
                py-6
                backdrop-blur-sm
                sm:py-10
            "
            onMouseDown={
                handleBackdropClick
            }
        >
            {/* =================================================
                MODAL
            ================================================= */}

            <div
                className="
                    relative
                    w-full
                    max-w-xl
                    overflow-hidden
                    rounded-3xl
                    border
                    shadow-2xl
                "
                style={{
                    backgroundColor:
                        modalBackground,

                    borderColor:
                        borderColor,

                    opacity: 1,

                    backdropFilter:
                        "none",

                    WebkitBackdropFilter:
                        "none",
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-profile-title"
            >
                {/* =================================================
                    DECORATIVE TOP ACCENT
                ================================================= */}

                <div
                    className="
                        absolute
                        left-0
                        right-0
                        top-0
                        h-1
                    "
                    style={{
                        background:
                            `linear-gradient(90deg, ${accentColor}, #8b5cf6, #ec4899)`,
                    }}
                />

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        relative
                        overflow-hidden
                        border-b
                        px-5
                        pb-5
                        pt-7
                        sm:px-7
                    "
                    style={{
                        backgroundColor:
                            headerBackground,

                        borderColor:
                            borderColor,

                        opacity: 1,
                    }}
                >
                    {/* Decorative glow */}

                    <div
                        className="
                            pointer-events-none
                            absolute
                            -right-16
                            -top-20
                            h-40
                            w-40
                            rounded-full
                            blur-3xl
                        "
                        style={{
                            background:
                                accentSoft,
                        }}
                    />

                    <div
                        className="
                            pointer-events-none
                            absolute
                            -bottom-24
                            left-1/3
                            h-40
                            w-40
                            rounded-full
                            blur-3xl
                        "
                        style={{
                            background:
                                accentSoft,
                        }}
                    />

                    <div
                        className="
                            relative
                            flex
                            items-start
                            justify-between
                            gap-4
                        "
                    >
                        {/* PROFILE IDENTITY */}

                        <div
                            className="
                                flex
                                min-w-0
                                items-center
                                gap-4
                            "
                        >
                            {/* MINI AVATAR */}

                            <div
                                className="
                                    flex
                                    h-14
                                    w-14
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    border
                                    text-xl
                                    font-bold
                                    shadow-lg
                                "
                                style={{
                                    background:
                                        `linear-gradient(135deg, ${accentColor}, #8b5cf6)`,

                                    borderColor:
                                        isDark
                                            ? "#4b5563"
                                            : "#e0e7ff",

                                    color:
                                        "#ffffff",
                                }}
                            >
                                {user?.avatar ? (
                                    <img
                                        src={
                                            user.avatar
                                        }
                                        alt=""
                                        className="
                                            h-full
                                            w-full
                                            rounded-2xl
                                            object-cover
                                        "
                                    />
                                ) : (
                                    displayInitial
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2
                                        id="edit-profile-title"
                                        className="
                                            truncate
                                            text-lg
                                            font-bold
                                            tracking-tight
                                            sm:text-xl
                                        "
                                        style={{
                                            color:
                                                primaryText,
                                        }}
                                    >
                                        Edit Profile
                                    </h2>

                                    <span
                                        className="
                                            hidden
                                            rounded-full
                                            border
                                            px-2
                                            py-0.5
                                            text-[9px]
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            sm:inline-flex
                                        "
                                        style={{
                                            background:
                                                accentSoft,

                                            borderColor:
                                                isDark
                                                    ? "#4338ca"
                                                    : "#c7d2fe",

                                            color:
                                                accentColor,
                                        }}
                                    >
                                        Profile
                                    </span>
                                </div>

                                <p
                                    className="
                                        mt-1
                                        truncate
                                        text-xs
                                        sm:text-sm
                                    "
                                    style={{
                                        color:
                                            mutedText,
                                    }}
                                >
                                    @{username}
                                </p>
                            </div>
                        </div>

                        {/* CLOSE */}

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            aria-label="Close edit profile"
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                border
                                transition
                                duration-200
                                hover:scale-105
                                active:scale-95
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            style={{
                                backgroundColor:
                                    inputBackground,

                                borderColor:
                                    borderColor,

                                color:
                                    secondaryText,
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
                                    d="M6 18 18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <p
                        className="
                            relative
                            mt-4
                            max-w-md
                            text-xs
                            leading-5
                            sm:text-sm
                        "
                        style={{
                            color:
                                secondaryText,
                        }}
                    >
                        Personalize how people see
                        you across ChatHub.
                    </p>
                </div>

                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="
                        space-y-5
                        p-5
                        sm:p-7
                    "
                    style={{
                        backgroundColor:
                            modalBackground,

                        opacity: 1,
                    }}
                >
                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {error && (
                        <div
                            className="
                                flex
                                items-start
                                gap-3
                                rounded-2xl
                                border
                                px-4
                                py-3.5
                            "
                            style={{
                                borderColor:
                                    isDark
                                        ? "#7f1d1d"
                                        : "#fecaca",

                                backgroundColor:
                                    isDark
                                        ? "#450a0a"
                                        : "#fef2f2",

                                color:
                                    isDark
                                        ? "#fca5a5"
                                        : "#dc2626",
                            }}
                        >
                            <div
                                className="
                                    flex
                                    h-6
                                    w-6
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-xs
                                    font-bold
                                "
                                style={{
                                    backgroundColor:
                                        isDark
                                            ? "#7f1d1d"
                                            : "#fee2e2",
                                }}
                            >
                                !
                            </div>

                            <p
                                className="
                                    pt-0.5
                                    text-sm
                                    leading-5
                                "
                            >
                                {error}
                            </p>
                        </div>
                    )}

                    {/* =================================================
                        ACCOUNT INFORMATION
                    ================================================= */}

                    <div>
                        <div
                            className="
                                mb-3
                                flex
                                items-center
                                gap-2
                            "
                        >
                            <span
                                className="
                                    flex
                                    h-7
                                    w-7
                                    items-center
                                    justify-center
                                    rounded-lg
                                "
                                style={{
                                    background:
                                        accentSoft,

                                    color:
                                        accentColor,
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
                                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                                    />

                                    <circle
                                        cx="9"
                                        cy="7"
                                        r="4"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 8v6M22 11h-6"
                                    />
                                </svg>
                            </span>

                            <div>
                                <h3
                                    className="
                                        text-sm
                                        font-semibold
                                    "
                                    style={{
                                        color:
                                            primaryText,
                                    }}
                                >
                                    Account Information
                                </h3>

                                <p
                                    className="
                                        text-[11px]
                                    "
                                    style={{
                                        color:
                                            mutedText,
                                    }}
                                >
                                    Your account details
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                            "
                            style={{
                                borderColor:
                                    borderColor,
                            }}
                        >
                            {/* USERNAME */}

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                    p-4
                                "
                                style={{
                                    backgroundColor:
                                        disabledBackground,
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
                                            isDark
                                                ? "#374151"
                                                : "#e2e8f0",

                                        color:
                                            mutedText,
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
                                        <circle
                                            cx="12"
                                            cy="8"
                                            r="4"
                                        />

                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 20c1.5-3 4-4 8-4s6.5 1 8 4"
                                        />
                                    </svg>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="
                                            text-[10px]
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                        "
                                        style={{
                                            color:
                                                mutedText,
                                        }}
                                    >
                                        Username
                                    </p>

                                    <p
                                        className="
                                            mt-0.5
                                            truncate
                                            text-sm
                                            font-medium
                                        "
                                        style={{
                                            color:
                                                secondaryText,
                                        }}
                                    >
                                        @{username}
                                    </p>
                                </div>

                                <span
                                    className="
                                        hidden
                                        rounded-full
                                        px-2.5
                                        py-1
                                        text-[10px]
                                        font-medium
                                        sm:block
                                    "
                                    style={{
                                        backgroundColor:
                                            isDark
                                                ? "#374151"
                                                : "#e2e8f0",

                                        color:
                                            mutedText,
                                    }}
                                >
                                    Locked
                                </span>
                            </div>

                            {/* DIVIDER */}

                            <div
                                className="h-px"
                                style={{
                                    backgroundColor:
                                        borderColor,
                                }}
                            />

                            {/* EMAIL */}

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                    p-4
                                "
                                style={{
                                    backgroundColor:
                                        disabledBackground,
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
                                            isDark
                                                ? "#374151"
                                                : "#e2e8f0",

                                        color:
                                            mutedText,
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
                                            d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7"
                                        />
                                    </svg>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="
                                            text-[10px]
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                        "
                                        style={{
                                            color:
                                                mutedText,
                                        }}
                                    >
                                        Email
                                    </p>

                                    <p
                                        className="
                                            mt-0.5
                                            truncate
                                            text-sm
                                        "
                                        style={{
                                            color:
                                                secondaryText,
                                        }}
                                    >
                                        {user?.email ||
                                            "No email"}
                                    </p>
                                </div>

                                <span
                                    className="
                                        hidden
                                        rounded-full
                                        px-2.5
                                        py-1
                                        text-[10px]
                                        font-medium
                                        sm:block
                                    "
                                    style={{
                                        backgroundColor:
                                            isDark
                                                ? "#374151"
                                                : "#e2e8f0",

                                        color:
                                            mutedText,
                                    }}
                                >
                                    Locked
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        PUBLIC PROFILE
                    ================================================= */}

                    <div>
                        <div
                            className="
                                mb-3
                                flex
                                items-center
                                gap-2
                            "
                        >
                            <span
                                className="
                                    flex
                                    h-7
                                    w-7
                                    items-center
                                    justify-center
                                    rounded-lg
                                "
                                style={{
                                    background:
                                        accentSoft,

                                    color:
                                        accentColor,
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
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z"
                                    />
                                </svg>
                            </span>

                            <div>
                                <h3
                                    className="
                                        text-sm
                                        font-semibold
                                    "
                                    style={{
                                        color:
                                            primaryText,
                                    }}
                                >
                                    Public Profile
                                </h3>

                                <p
                                    className="
                                        text-[11px]
                                    "
                                    style={{
                                        color:
                                            mutedText,
                                    }}
                                >
                                    What people see
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* =================================================
                                DISPLAY NAME
                            ================================================= */}

                            <div>
                                <div
                                    className="
                                        mb-2
                                        flex
                                        items-center
                                        justify-between
                                    "
                                >
                                    <label
                                        className="
                                            text-sm
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                secondaryText,
                                        }}
                                    >
                                        Display Name
                                    </label>

                                    <span
                                        className="
                                            rounded-full
                                            px-2
                                            py-1
                                            text-[10px]
                                            font-medium
                                        "
                                        style={{
                                            background:
                                                displayName.length >
                                                45
                                                    ? "rgba(239,68,68,0.10)"
                                                    : accentSoft,

                                            color:
                                                displayName.length >
                                                45
                                                    ? "#ef4444"
                                                    : accentColor,
                                        }}
                                    >
                                        {
                                            displayName.length
                                        }
                                        /50
                                    </span>
                                </div>

                                <div className="relative">
                                    <div
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-4
                                            top-1/2
                                            -translate-y-1/2
                                        "
                                        style={{
                                            color:
                                                mutedText,
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
                                                d="M20 21a8 8 0 0 0-16 0"
                                            />

                                            <circle
                                                cx="12"
                                                cy="7"
                                                r="4"
                                            />
                                        </svg>
                                    </div>

                                    <input
                                        type="text"
                                        value={
                                            displayName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDisplayName(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        maxLength={
                                            50
                                        }
                                        disabled={
                                            saving
                                        }
                                        placeholder="Enter your display name"
                                        className="
                                            w-full
                                            rounded-2xl
                                            border
                                            py-3.5
                                            pl-12
                                            pr-4
                                            text-sm
                                            outline-none
                                            transition
                                            duration-200
                                            focus:ring-2
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                        style={{
                                            borderColor:
                                                borderColor,

                                            backgroundColor:
                                                inputBackground,

                                            color:
                                                primaryText,

                                            opacity: 1,

                                            "--tw-ring-color":
                                                accentSoft,
                                        }}
                                    />
                                </div>

                                <p
                                    className="
                                        mt-1.5
                                        px-1
                                        text-[11px]
                                    "
                                    style={{
                                        color:
                                            mutedText,
                                    }}
                                >
                                    This is the name
                                    people will see
                                    in ChatHub.
                                </p>
                            </div>

                            {/* =================================================
                                BIO
                            ================================================= */}

                            <div>
                                <div
                                    className="
                                        mb-2
                                        flex
                                        items-center
                                        justify-between
                                    "
                                >
                                    <label
                                        className="
                                            text-sm
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                secondaryText,
                                        }}
                                    >
                                        Bio
                                    </label>

                                    <span
                                        className="
                                            rounded-full
                                            px-2
                                            py-1
                                            text-[10px]
                                            font-medium
                                        "
                                        style={{
                                            background:
                                                bio.length >
                                                150
                                                    ? "rgba(239,68,68,0.10)"
                                                    : accentSoft,

                                            color:
                                                bio.length >
                                                150
                                                    ? "#ef4444"
                                                    : accentColor,
                                        }}
                                    >
                                        {bio.length}
                                        /160
                                    </span>
                                </div>

                                <div className="relative">
                                    <div
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-4
                                            top-4
                                        "
                                        style={{
                                            color:
                                                mutedText,
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
                                                d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
                                            />
                                        </svg>
                                    </div>

                                    <textarea
                                        value={bio}
                                        onChange={(
                                            event
                                        ) =>
                                            setBio(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        maxLength={
                                            160
                                        }
                                        rows={5}
                                        disabled={
                                            saving
                                        }
                                        placeholder="Tell people something about yourself..."
                                        className="
                                            w-full
                                            resize-none
                                            rounded-2xl
                                            border
                                            py-3.5
                                            pl-12
                                            pr-4
                                            text-sm
                                            leading-6
                                            outline-none
                                            transition
                                            duration-200
                                            focus:ring-2
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                        style={{
                                            borderColor:
                                                borderColor,

                                            backgroundColor:
                                                inputBackground,

                                            color:
                                                primaryText,

                                            opacity: 1,

                                            "--tw-ring-color":
                                                accentSoft,
                                        }}
                                    />
                                </div>

                                <div
                                    className="
                                        mt-1.5
                                        flex
                                        items-center
                                        justify-between
                                        px-1
                                    "
                                >
                                    <p
                                        className="
                                            text-[11px]
                                        "
                                        style={{
                                            color:
                                                mutedText,
                                        }}
                                    >
                                        Keep it short and
                                        personal.
                                    </p>

                                    {bio.length >
                                        140 && (
                                        <span
                                            className="
                                                text-[10px]
                                                font-medium
                                            "
                                            style={{
                                                color:
                                                    "#f59e0b",
                                            }}
                                        >
                                            Almost full
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div
                        className="
                            flex
                            flex-col-reverse
                            gap-3
                            border-t
                            pt-5
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        "
                        style={{
                            borderColor:
                                borderColor,
                        }}
                    >
                        <p
                            className="
                                hidden
                                text-[11px]
                                sm:block
                            "
                            style={{
                                color:
                                    mutedText,
                            }}
                        >
                            Changes will appear
                            immediately.
                        </p>

                        <div
                            className="
                                flex
                                w-full
                                flex-col-reverse
                                gap-3
                                sm:w-auto
                                sm:flex-row
                            "
                        >
                            {/* CANCEL */}

                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                disabled={
                                    saving
                                }
                                className="
                                    rounded-xl
                                    border
                                    px-5
                                    py-3
                                    text-sm
                                    font-semibold
                                    transition
                                    duration-200
                                    hover:opacity-80
                                    active:scale-[0.98]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                                style={{
                                    borderColor:
                                        borderColor,

                                    backgroundColor:
                                        inputBackground,

                                    color:
                                        secondaryText,

                                    opacity: 1,
                                }}
                            >
                                Cancel
                            </button>

                            {/* SAVE */}

                            <button
                                type="submit"
                                disabled={
                                    saving
                                }
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    px-6
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-white
                                    shadow-lg
                                    transition
                                    duration-200
                                    hover:-translate-y-0.5
                                    hover:shadow-xl
                                    active:translate-y-0
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                                style={{
                                    background:
                                        `linear-gradient(135deg, ${accentColor}, #7c3aed)`,

                                    borderColor:
                                        accentColor,

                                    color:
                                        "#ffffff",

                                    opacity: 1,
                                }}
                            >
                                {saving ? (
                                    <>
                                        <span
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/30
                                                border-t-white
                                            "
                                        />

                                        Saving...
                                    </>
                                ) : (
                                    <>
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
                                                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M17 21v-8H7v8M7 3v5h8"
                                            />
                                        </svg>

                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}