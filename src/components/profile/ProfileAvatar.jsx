"use client";

import { useRef, useState } from "react";

export default function ProfileAvatar({
    user,
    size = "large",
    editable = false,
    onAvatarUpdated,
}) {
    const [imageError, setImageError] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [localPreview, setLocalPreview] = useState(null);

    const fileInputRef = useRef(null);

    // ============================================================
    // USER DATA
    // ============================================================

    const username =
        user?.username || "User";

    const displayName =
        user?.displayName?.trim() ||
        username;

    const initial =
        username
            .charAt(0)
            .toUpperCase() || "U";

    // ============================================================
    // SIZE
    // ============================================================

    const sizeConfig = {
        small: {
            avatar: "h-12 w-12 text-lg",
            ring: "p-[2px]",
            status: "h-3.5 w-3.5 border-[3px]",
            controls: "h-7 w-7",
            icon: "h-3.5 w-3.5",
        },

        medium: {
            avatar: "h-20 w-20 text-2xl",
            ring: "p-[3px]",
            status: "h-4 w-4 border-[3px]",
            controls: "h-8 w-8",
            icon: "h-4 w-4",
        },

        large: {
            avatar:
                "h-32 w-32 text-4xl sm:h-36 sm:w-36 sm:text-5xl",
            ring: "p-[4px]",
            status:
                "h-5 w-5 border-[4px]",
            controls: "h-9 w-9",
            icon: "h-4 w-4",
        },
    };

    const config =
        sizeConfig[size] ||
        sizeConfig.large;

    // ============================================================
    // AVATAR SOURCE
    // ============================================================

    const avatarSource =
        localPreview ||
        user?.avatar ||
        null;

    const hasAvatar =
        Boolean(avatarSource);

    // ============================================================
    // STATE
    // ============================================================

    const isBusy =
        uploading || removing;

    const isOnline =
        Boolean(user?.isOnline);

    // ============================================================
    // OPEN FILE PICKER
    // ============================================================

    function handleAvatarClick() {
        if (isBusy) {
            return;
        }

        fileInputRef.current?.click();
    }

    // ============================================================
    // HANDLE FILE SELECTION
    // ============================================================

    async function handleFileChange(event) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploadError("");
        setImageError(false);

        // ========================================================
        // VALIDATE FILE TYPE
        // ========================================================

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {
            setUploadError(
                "Only JPG, PNG, WEBP, and GIF images are allowed."
            );

            event.target.value = "";

            return;
        }

        // ========================================================
        // VALIDATE FILE SIZE
        // ========================================================

        const maxFileSize =
            5 * 1024 * 1024;

        if (
            file.size > maxFileSize
        ) {
            setUploadError(
                "Avatar image cannot exceed 5 MB."
            );

            event.target.value = "";

            return;
        }

        // ========================================================
        // LOCAL PREVIEW
        // ========================================================

        const objectUrl =
            URL.createObjectURL(file);

        setLocalPreview(objectUrl);

        // ========================================================
        // UPLOAD
        // ========================================================

        try {
            setUploading(true);

            const formData =
                new FormData();

            formData.append(
                "avatar",
                file
            );

            const response =
                await fetch(
                    "/api/profile/avatar",
                    {
                        method: "POST",
                        credentials: "include",
                        body: formData,
                    }
                );

            const data =
                await response.json();

            // ====================================================
            // API ERROR
            // ====================================================

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.error ||
                        "Failed to upload profile picture."
                );
            }

            // ====================================================
            // UPDATED USER
            // ====================================================

            const updatedUser =
                data.user;

            // ====================================================
            // RESET
            // ====================================================

            setLocalPreview(null);
            setImageError(false);
            setUploadError("");

            // ====================================================
            // UPDATE PARENT
            // ====================================================

            if (onAvatarUpdated) {
                onAvatarUpdated(
                    updatedUser
                );
            }
        } catch (error) {
            console.error(
                "❌ AVATAR UPLOAD ERROR:",
                error
            );

            setLocalPreview(null);

            setUploadError(
                error?.message ||
                    "Failed to upload profile picture."
            );
        } finally {
            setUploading(false);

            event.target.value = "";

            URL.revokeObjectURL(
                objectUrl
            );
        }
    }

    // ============================================================
    // REMOVE AVATAR
    // ============================================================

    async function handleRemoveAvatar() {
        if (
            isBusy ||
            !user?.avatar
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to remove your profile picture?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setRemoving(true);
            setUploadError("");
            setImageError(false);

            const response =
                await fetch(
                    "/api/profile/avatar",
                    {
                        method: "DELETE",
                        credentials: "include",
                    }
                );

            const data =
                await response.json();

            // ====================================================
            // API ERROR
            // ====================================================

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.error ||
                        "Failed to remove profile picture."
                );
            }

            // ====================================================
            // RESET
            // ====================================================

            setLocalPreview(null);
            setImageError(false);

            // ====================================================
            // UPDATE PARENT
            // ====================================================

            if (onAvatarUpdated) {
                onAvatarUpdated(
                    data.user
                );
            }
        } catch (error) {
            console.error(
                "❌ AVATAR REMOVE ERROR:",
                error
            );

            setUploadError(
                error?.message ||
                    "Failed to remove profile picture."
            );
        } finally {
            setRemoving(false);
        }
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="relative inline-block">
            {/* =================================================
                HIDDEN FILE INPUT
            ================================================= */}

            {editable && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={
                        handleFileChange
                    }
                    className="hidden"
                />
            )}

            {/* =================================================
                AVATAR GLOW
            ================================================= */}

            <div
                className={`
                    pointer-events-none
                    absolute
                    inset-[-10px]
                    rounded-full
                    opacity-40
                    blur-2xl
                    transition-all
                    duration-500
                    ${
                        isOnline
                            ? "scale-100"
                            : "scale-90 opacity-20"
                    }
                `}
                style={{
                    background:
                        "var(--chat-accent)",
                }}
            />

            {/* =================================================
                GRADIENT RING
            ================================================= */}

            <div
                className={`
                    relative
                    ${config.ring}
                    rounded-full
                    transition-all
                    duration-300
                    ${
                        isOnline
                            ? "shadow-[0_0_25px_rgba(34,197,94,0.20)]"
                            : "shadow-xl"
                    }
                `}
                style={{
                    background:
                        isOnline
                            ? "linear-gradient(135deg, #22c55e, var(--chat-accent), #8b5cf6)"
                            : "linear-gradient(135deg, var(--chat-accent), #6366f1, #8b5cf6)",
                }}
            >
                {/* =================================================
                    INNER AVATAR
                ================================================= */}

                <div
                    className={`
                        relative
                        overflow-hidden
                        rounded-full
                        ${config.avatar}
                        flex
                        items-center
                        justify-center
                        font-bold
                        transition-all
                        duration-300
                    `}
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                    }}
                >
                    {avatarSource &&
                    !imageError ? (
                        <img
                            src={avatarSource}
                            alt={`${displayName}'s profile`}
                            onError={() =>
                                setImageError(
                                    true
                                )
                            }
                            className="
                                h-full
                                w-full
                                object-cover
                                transition
                                duration-500
                                hover:scale-105
                            "
                        />
                    ) : (
                        <div
                            className="
                                flex
                                h-full
                                w-full
                                items-center
                                justify-center
                                bg-gradient-to-br
                                from-blue-500
                                via-indigo-500
                                to-purple-600
                                font-bold
                                text-white
                            "
                        >
                            {initial}
                        </div>
                    )}

                    {/* =================================================
                        SUBTLE IMAGE OVERLAY
                    ================================================= */}

                    <div
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            rounded-full
                            bg-gradient-to-t
                            from-black/10
                            via-transparent
                            to-white/10
                        "
                    />

                    {/* =================================================
                        BUSY OVERLAY
                    ================================================= */}

                    {isBusy && (
                        <div
                            className="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                rounded-full
                                bg-black/65
                                backdrop-blur-[2px]
                            "
                        >
                            <div className="flex flex-col items-center gap-2 text-white">
                                <div
                                    className="
                                        h-7
                                        w-7
                                        animate-spin
                                        rounded-full
                                        border-2
                                        border-white/25
                                        border-t-white
                                    "
                                />

                                <span
                                    className="
                                        text-[10px]
                                        font-semibold
                                        tracking-wide
                                    "
                                >
                                    {uploading
                                        ? "UPLOADING"
                                        : "REMOVING"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* =================================================
                ONLINE STATUS
            ================================================= */}

            {size !== "small" && (
                <div
                    className="
                        absolute
                        bottom-1
                        right-1
                        flex
                        items-center
                        justify-center
                    "
                >
                    {/* pulse */}
                    {isOnline && (
                        <span
                            className="
                                absolute
                                h-full
                                w-full
                                animate-ping
                                rounded-full
                                bg-emerald-400
                                opacity-30
                            "
                        />
                    )}

                    <span
                        className={`
                            relative
                            block
                            rounded-full
                            ${config.status}
                        `}
                        style={{
                            background:
                                isOnline
                                    ? "#22c55e"
                                    : "#64748b",

                            borderColor:
                                "var(--chat-bg-secondary)",
                        }}
                        title={
                            isOnline
                                ? "Online"
                                : "Offline"
                        }
                    />
                </div>
            )}

            {/* =================================================
                EDIT CONTROLS
            ================================================= */}

            {editable && (
                <div
                    className="
                        absolute
                        -bottom-1
                        -right-1
                        flex
                        items-center
                        gap-1.5
                    "
                >
                    {/* =========================================
                        REMOVE
                    ========================================= */}

                    {hasAvatar && (
                        <button
                            type="button"
                            onClick={
                                handleRemoveAvatar
                            }
                            disabled={isBusy}
                            className={`
                                ${config.controls}
                                flex
                                items-center
                                justify-center
                                rounded-full
                                border-[3px]
                                text-white
                                shadow-xl
                                transition-all
                                duration-200
                                hover:scale-110
                                hover:bg-red-500
                                active:scale-95
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            `}
                            style={{
                                background:
                                    "#dc2626",
                                borderColor:
                                    "var(--chat-bg-secondary)",
                            }}
                            title="Remove profile picture"
                            aria-label="Remove profile picture"
                        >
                            {removing ? (
                                <div
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
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={
                                        config.icon
                                    }
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 6h18"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 6V4h8v2"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 6l-1 14H6L5 6"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10 11v5"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14 11v5"
                                    />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* =========================================
                        CHANGE PHOTO
                    ========================================= */}

                    <button
                        type="button"
                        onClick={
                            handleAvatarClick
                        }
                        disabled={isBusy}
                        className={`
                            ${config.controls}
                            group
                            flex
                            items-center
                            justify-center
                            rounded-full
                            border-[3px]
                            text-white
                            shadow-xl
                            transition-all
                            duration-200
                            hover:scale-110
                            active:scale-95
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        `}
                        style={{
                            background:
                                "var(--chat-accent)",
                            borderColor:
                                "var(--chat-bg-secondary)",
                        }}
                        title="Change profile picture"
                        aria-label="Change profile picture"
                    >
                        {uploading ? (
                            <div
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
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`
                                    ${config.icon}
                                    transition
                                    duration-200
                                    group-hover:scale-110
                                `}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 7h3l2-3h8l2 3h3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                                />

                                <circle
                                    cx="12"
                                    cy="13"
                                    r="3"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            )}

            {/* =================================================
                UPLOAD ERROR
            ================================================= */}

            {uploadError && (
                <div
                    className="
                        absolute
                        left-1/2
                        top-full
                        z-50
                        mt-4
                        w-72
                        -translate-x-1/2
                        rounded-2xl
                        border
                        p-3
                        shadow-2xl
                        backdrop-blur-xl
                    "
                    style={{
                        borderColor:
                            "var(--chat-danger-border)",
                        background:
                            "var(--chat-bg-secondary)",
                    }}
                >
                    <div className="flex items-start gap-2">
                        <div
                            className="
                                flex
                                h-6
                                w-6
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-red-500/10
                                text-red-400
                            "
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3.5 w-3.5"
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
                                    d="M10.3 3.7L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z"
                                />
                            </svg>
                        </div>

                        <p
                            className="
                                text-xs
                                leading-5
                            "
                            style={{
                                color:
                                    "var(--chat-danger)",
                            }}
                        >
                            {uploadError}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}