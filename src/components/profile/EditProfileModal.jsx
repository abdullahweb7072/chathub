
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

    const isDark =
        theme === "dark";

    // ============================================================
    // SOLID THEME COLORS
    // ============================================================

    // IMPORTANT:
    // These are intentionally NOT CSS variables.
    // This guarantees the modal is fully opaque.

    const modalBackground = isDark
        ? "#111827"
        : "#ffffff";

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
    // MODAL CLOSED
    // ============================================================

    if (!open) {
        return null;
    }

    // ============================================================
    // SAVE PROFILE
    // ============================================================

    async function handleSubmit(e) {
        e.preventDefault();

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
                            bio: cleanBio,
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
            // UPDATE PROFILE IN PARENT
            // ====================================================

            onUpdated?.(
                data.user
            );

            // ====================================================
            // CLOSE MODAL
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
                px-4
                py-6
            "
        >
            {/* =================================================
                SOLID MODAL
            ================================================= */}

            <div
                className="
                    max-h-[90vh]
                    w-full
                    max-w-lg
                    overflow-y-auto
                    rounded-3xl
                    border
                    shadow-2xl
                "
                style={{
                    // FORCE SOLID BACKGROUND
                    backgroundColor:
                        modalBackground,

                    borderColor:
                        borderColor,

                    opacity: 1,

                    // Prevent any inherited transparency
                    backdropFilter:
                        "none",

                    WebkitBackdropFilter:
                        "none",
                }}
            >
                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        px-5
                        py-4
                        sm:px-6
                    "
                    style={{
                        backgroundColor:
                            modalBackground,

                        borderColor:
                            borderColor,

                        opacity: 1,
                    }}
                >
                    <div>
                        <h2
                            className="
                                text-lg
                                font-semibold
                            "
                            style={{
                                color:
                                    primaryText,
                            }}
                        >
                            Edit Profile
                        </h2>

                        <p
                            className="
                                mt-0.5
                                text-xs
                            "
                            style={{
                                color:
                                    mutedText,
                            }}
                        >
                            Update your profile
                            information
                        </p>
                    </div>

                    {/* CLOSE BUTTON */}

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close edit profile"
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            transition
                            hover:opacity-70
                            disabled:cursor-not-allowed
                            disabled:opacity-50
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
                                d="M6 18 18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={handleSubmit}
                    className="
                        space-y-6
                        p-5
                        sm:p-6
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
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
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

                                opacity: 1,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* =================================================
                        USERNAME
                    ================================================= */}

                    <div>
                        <label
                            className="
                                mb-2
                                block
                                text-sm
                                font-medium
                            "
                            style={{
                                color:
                                    secondaryText,
                            }}
                        >
                            Username
                        </label>

                        <input
                            type="text"
                            value={
                                user?.username ||
                                ""
                            }
                            disabled
                            readOnly
                            className="
                                w-full
                                cursor-not-allowed
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
                                outline-none
                            "
                            style={{
                                borderColor:
                                    borderColor,

                                backgroundColor:
                                    disabledBackground,

                                color:
                                    mutedText,

                                opacity: 1,
                            }}
                        />

                        <p
                            className="
                                mt-1
                                text-xs
                            "
                            style={{
                                color:
                                    mutedText,
                            }}
                        >
                            Username cannot be
                            changed. People can
                            use it to find you.
                        </p>
                    </div>

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
                                    font-medium
                                "
                                style={{
                                    color:
                                        secondaryText,
                                }}
                            >
                                Display Name
                            </label>

                            <span
                                className="text-xs"
                                style={{
                                    color:
                                        mutedText,
                                }}
                            >
                                {displayName.length}/50
                            </span>
                        </div>

                        <input
                            type="text"
                            value={
                                displayName
                            }
                            onChange={(e) =>
                                setDisplayName(
                                    e.target.value
                                )
                            }
                            maxLength={50}
                            disabled={saving}
                            placeholder="Enter your display name"
                            className="
                                w-full
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
                                outline-none
                                transition
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
                            }}
                        />

                        <p
                            className="
                                mt-1
                                text-xs
                            "
                            style={{
                                color:
                                    mutedText,
                            }}
                        >
                            This is the name people
                            will see in ChatHub.
                        </p>
                    </div>

                    {/* =================================================
                        EMAIL
                    ================================================= */}

                    <div>
                        <label
                            className="
                                mb-2
                                block
                                text-sm
                                font-medium
                            "
                            style={{
                                color:
                                    secondaryText,
                            }}
                        >
                            Email
                        </label>

                        <input
                            type="email"
                            value={
                                user?.email ||
                                ""
                            }
                            disabled
                            readOnly
                            className="
                                w-full
                                cursor-not-allowed
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
                                outline-none
                            "
                            style={{
                                borderColor:
                                    borderColor,

                                backgroundColor:
                                    disabledBackground,

                                color:
                                    mutedText,

                                opacity: 1,
                            }}
                        />

                        <p
                            className="
                                mt-1
                                text-xs
                            "
                            style={{
                                color:
                                    mutedText,
                            }}
                        >
                            Email cannot be changed
                            here.
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
                                    font-medium
                                "
                                style={{
                                    color:
                                        secondaryText,
                                }}
                            >
                                Bio
                            </label>

                            <span
                                className="text-xs"
                                style={{
                                    color:
                                        mutedText,
                                }}
                            >
                                {bio.length}/160
                            </span>
                        </div>

                        <textarea
                            value={bio}
                            onChange={(e) =>
                                setBio(
                                    e.target.value
                                )
                            }
                            maxLength={160}
                            rows={4}
                            disabled={saving}
                            placeholder="Tell people something about yourself..."
                            className="
                                w-full
                                resize-none
                                rounded-xl
                                border
                                px-4
                                py-3
                                text-sm
                                leading-6
                                outline-none
                                transition
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
                            }}
                        />
                    </div>

                    {/* =================================================
                        BUTTONS
                    ================================================= */}

                    <div
                        className="
                            flex
                            flex-col-reverse
                            gap-3
                            border-t
                            pt-5
                            sm:flex-row
                            sm:justify-end
                        "
                        style={{
                            borderColor:
                                borderColor,
                        }}
                    >
                        {/* CANCEL */}

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="
                                rounded-xl
                                border
                                px-5
                                py-2.5
                                text-sm
                                font-medium
                                transition
                                hover:opacity-80
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            style={{
                                borderColor:
                                    borderColor,

                                backgroundColor:
                                    disabledBackground,

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
    disabled={saving}
    className="
        rounded-xl
        border
        px-5
        py-2.5
        text-sm
        font-medium
        transition
        hover:opacity-80
        disabled:cursor-not-allowed
        disabled:opacity-50
    "
    style={{
        borderColor: borderColor,

        backgroundColor:
            disabledBackground,

        color:
            secondaryText,

        opacity: 1,
    }}
>
    {saving
        ? "Saving..."
        : "Save Changes"}
</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

