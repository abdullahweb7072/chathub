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

    const username = user?.username || "User";

    const initial = username
        .charAt(0)
        .toUpperCase();

    // ============================================================
    // SIZE
    // ============================================================

    const sizeClasses = {
        small: "h-12 w-12 text-lg",
        medium: "h-20 w-20 text-2xl",
        large: "h-32 w-32 text-4xl sm:h-36 sm:w-36 sm:text-5xl",
    };

    const avatarSize =
        sizeClasses[size] || sizeClasses.large;

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
    // OPEN FILE PICKER
    // ============================================================

    function handleAvatarClick() {
        if (uploading || removing) {
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

        if (!allowedTypes.includes(file.type)) {
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

        if (file.size > maxFileSize) {
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
            // RESET LOCAL PREVIEW
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
            uploading ||
            removing ||
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
            // RESET LOCAL PREVIEW
            // ====================================================

            setLocalPreview(null);
            setImageError(false);

            // ====================================================
            // UPDATE PARENT USER
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
                    onChange={handleFileChange}
                    className="hidden"
                />
            )}

            {/* =================================================
                AVATAR
            ================================================= */}

            {avatarSource &&
            !imageError ? (
                <img
                    src={avatarSource}
                    alt={`${username}'s profile`}
                    onError={() =>
                        setImageError(true)
                    }
                    className={`
                        ${avatarSize}
                        rounded-full
                        border-4
                        object-cover
                        shadow-xl
                    `}
                    style={{
                        borderColor:
                            "var(--chat-bg-secondary)",
                    }}
                />
            ) : (
                <div
                    className={`
                        ${avatarSize}
                        flex
                        items-center
                        justify-center
                        rounded-full
                        border-4
                        bg-gradient-to-br
                        from-blue-500
                        via-indigo-500
                        to-purple-600
                        font-bold
                        text-white
                        shadow-xl
                    `}
                    style={{
                        borderColor:
                            "var(--chat-bg-secondary)",
                    }}
                >
                    {initial}
                </div>
            )}

            {/* =================================================
                UPLOADING / REMOVING OVERLAY
            ================================================= */}

            {(uploading || removing) && (
                <div
                    className={`
                        ${avatarSize}
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        rounded-full
                    `}
                    style={{
                        background:
                            "rgba(0,0,0,0.60)",
                    }}
                >
                    <div className="flex flex-col items-center gap-2 text-white">

                        <div
                            className="
                                h-6
                                w-6
                                animate-spin
                                rounded-full
                                border-2
                                border-white/30
                                border-t-white
                            "
                        />

                        <span className="text-xs font-medium">
                            {uploading
                                ? "Uploading..."
                                : "Removing..."}
                        </span>

                    </div>
                </div>
            )}

            {/* =================================================
                ONLINE STATUS
            ================================================= */}

            {size !== "small" && (
                <span
                    className={`
                        absolute
                        bottom-1
                        right-1
                        h-5
                        w-5
                        rounded-full
                        border-4
                        ${
                            user?.isOnline
                                ? "bg-emerald-500"
                                : "bg-slate-500"
                        }
                    `}
                    style={{
                        borderColor:
                            "var(--chat-bg-secondary)",
                    }}
                    title={
                        user?.isOnline
                            ? "Online"
                            : "Offline"
                    }
                />
            )}

            {/* =================================================
                EDIT CONTROLS
            ================================================= */}

            {editable && (
                <div className="absolute bottom-1 right-1 flex items-center gap-1">

                    {/* =========================================
                        REMOVE BUTTON
                    ========================================= */}

                    {hasAvatar && (
                        <button
                            type="button"
                            onClick={
                                handleRemoveAvatar
                            }
                            disabled={
                                uploading ||
                                removing
                            }
                            className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-full
                                border-4
                                text-white
                                shadow-lg
                                transition
                                hover:bg-red-500
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            style={{
                                background:
                                    "#dc2626",
                                borderColor:
                                    "var(--chat-bg-secondary)",
                            }}
                            title="Remove profile picture"
                        >
                            {removing ? (
                                <div
                                    className="
                                        h-4
                                        w-4
                                        animate-spin
                                        rounded-full
                                        border-2
                                        border-white/40
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
                                    className="h-4 w-4"
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
                        CHANGE BUTTON
                    ========================================= */}

                    <button
                        type="button"
                        onClick={
                            handleAvatarClick
                        }
                        disabled={
                            uploading ||
                            removing
                        }
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            border-4
                            text-white
                            shadow-lg
                            transition
                            hover:bg-blue-500
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                "#2563eb",
                            borderColor:
                                "var(--chat-bg-secondary)",
                        }}
                        title="Change profile picture"
                    >
                        {uploading ? (
                            <div
                                className="
                                    h-4
                                    w-4
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-white/40
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
                                className="h-4 w-4"
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
                ERROR MESSAGE
            ================================================= */}

            {uploadError && (
                <div
                    className="
                        absolute
                        left-1/2
                        top-full
                        z-50
                        mt-3
                        w-64
                        -translate-x-1/2
                        rounded-xl
                        border
                        px-3
                        py-2
                        text-center
                        text-xs
                        shadow-xl
                    "
                    style={{
                        borderColor:
                            "var(--chat-danger-border)",
                        background:
                            "var(--chat-bg-secondary)",
                        color:
                            "var(--chat-danger)",
                    }}
                >
                    {uploadError}
                </div>
            )}

        </div>
    );
}