"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

export default function CreateStatusModal({
    open,
    onClose,
    onCreated,
}) {
    const fileInputRef = useRef(null);

    const [content, setContent] = useState("");
    const [backgroundColor, setBackgroundColor] =
        useState("#1f2937");

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [previewUrl, setPreviewUrl] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    // ============================================================
    // RESET
    // ============================================================

    useEffect(() => {
        if (!open) {
            setContent("");
            setSelectedFile(null);
            setPreviewUrl(null);
            setError("");
            setLoading(false);
            setBackgroundColor("#1f2937");
        }
    }, [open]);

    // ============================================================
    // FILE SELECT
    // ============================================================

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        // 25 MB
        const MAX_FILE_SIZE =
            25 * 1024 * 1024;

        if (file.size > MAX_FILE_SIZE) {
            setError(
                "File size must be less than 25 MB."
            );

            event.target.value = "";
            return;
        }

        if (
            !file.type.startsWith("image/") &&
            !file.type.startsWith("video/")
        ) {
            setError(
                "Only image and video files are supported."
            );

            event.target.value = "";
            return;
        }

        setError("");
        setSelectedFile(file);

        const url =
            URL.createObjectURL(file);

        setPreviewUrl(url);
    };

    // ============================================================
    // REMOVE FILE
    // ============================================================

    const handleRemoveFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // ============================================================
    // UPLOAD MEDIA
    // ============================================================

    const uploadMedia = async () => {
        const formData = new FormData();

        formData.append(
            "file",
            selectedFile
        );

        const response = await fetch(
            "/api/upload",
            {
                method: "POST",
                credentials: "include",
                body: formData,
            }
        );

        const data =
            await response
                .json()
                .catch(() => null);

        if (!response.ok || !data?.success) {
            throw new Error(
                data?.message ||
                    "Failed to upload media."
            );
        }

        return data;
    };

    // ============================================================
    // CREATE STATUS
    // ============================================================

    const handleCreateStatus = async () => {
        if (loading) {
            return;
        }

        const trimmedContent =
            content.trim();

        if (
            !trimmedContent &&
            !selectedFile
        ) {
            setError(
                "Write something or select a photo/video."
            );

            return;
        }

        try {
            setLoading(true);
            setError("");

            let mediaUrl = null;
            let mediaType = null;
            let mediaName = null;

            // ----------------------------------------------------
            // UPLOAD MEDIA FIRST
            // ----------------------------------------------------

            if (selectedFile) {
                const uploadData =
                    await uploadMedia();

                mediaUrl =
                    uploadData.url ||
                    uploadData.fileUrl ||
                    uploadData.path ||
                    null;

                if (!mediaUrl) {
                    throw new Error(
                        "Upload succeeded but no file URL was returned."
                    );
                }

                mediaType =
                    selectedFile.type.startsWith(
                        "video/"
                    )
                        ? "VIDEO"
                        : "IMAGE";

                mediaName =
                    selectedFile.name;
            }

            // ----------------------------------------------------
            // CREATE STATUS
            // ----------------------------------------------------

            const response = await fetch(
                "/api/status",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Accept:
                            "application/json",
                    },
                    body: JSON.stringify({
                        content:
                            trimmedContent ||
                            null,

                        mediaUrl,
                        mediaType,
                        mediaName,

                        backgroundColor:
                            trimmedContent &&
                            !selectedFile
                                ? backgroundColor
                                : null,
                    }),
                }
            );

            const data =
                await response
                    .json()
                    .catch(() => null);

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                        "Failed to create status."
                );
            }

            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            if (onCreated) {
                onCreated(data.status);
            }

            onClose();
        } catch (error) {
            console.error(
                "CREATE STATUS ERROR:",
                error
            );

            setError(
                error.message ||
                    "Failed to create status."
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // CLOSE
    // ============================================================

    const handleClose = () => {
        if (loading) {
            return;
        }

        onClose();
    };

    if (!open) {
        return null;
    }

    return (
        <div
            className="
                fixed
                inset-0
                z-[200]
                flex
                items-center
                justify-center
                bg-black/70
                px-4
                backdrop-blur-sm
            "
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    handleClose();
                }
            }}
        >
            <div
                className="
                    w-full
                    max-w-lg
                    overflow-hidden
                    rounded-2xl
                    border
                    border-border
                    bg-surface
                    shadow-2xl
                "
            >
                {/* ====================================================
                    HEADER
                ==================================================== */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-border
                        px-5
                        py-4
                    "
                >
                    <div>
                        <h2
                            className="
                                text-lg
                                font-semibold
                                text-foreground
                            "
                        >
                            Create Status
                        </h2>

                        <p
                            className="
                                mt-0.5
                                text-xs
                                text-muted
                            "
                        >
                            Share something that
                            disappears after 24 hours.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            text-xl
                            text-muted
                            transition
                            hover:bg-hover
                            hover:text-foreground
                            disabled:opacity-50
                        "
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* ====================================================
                    CONTENT
                ==================================================== */}

                <div className="p-5">
                    {/* TEXT PREVIEW */}

                    {!selectedFile && (
                        <div
                            className="
                                mb-4
                                overflow-hidden
                                rounded-2xl
                                border
                                border-border
                            "
                            style={{
                                backgroundColor:
                                    backgroundColor,
                            }}
                        >
                            <textarea
                                value={content}
                                onChange={(event) =>
                                    setContent(
                                        event.target
                                            .value
                                    )
                                }
                                maxLength={700}
                                placeholder="What's on your mind?"
                                className="
                                    min-h-[220px]
                                    w-full
                                    resize-none
                                    bg-transparent
                                    px-6
                                    py-8
                                    text-center
                                    text-xl
                                    font-medium
                                    text-white
                                    outline-none
                                    placeholder:text-white/60
                                "
                            />

                            <div
                                className="
                                    px-4
                                    pb-3
                                    text-right
                                    text-xs
                                    text-white/60
                                "
                            >
                                {content.length}/700
                            </div>
                        </div>
                    )}

                    {/* MEDIA PREVIEW */}

                    {selectedFile && (
                        <div
                            className="
                                relative
                                mb-4
                                overflow-hidden
                                rounded-2xl
                                border
                                border-border
                                bg-black
                            "
                        >
                            {selectedFile.type.startsWith(
                                "video/"
                            ) ? (
                                <video
                                    src={previewUrl}
                                    controls
                                    className="
                                        max-h-[360px]
                                        w-full
                                        object-contain
                                    "
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Status preview"
                                    className="
                                        max-h-[360px]
                                        w-full
                                        object-contain
                                    "
                                />
                            )}

                            <button
                                type="button"
                                onClick={
                                    handleRemoveFile
                                }
                                disabled={loading}
                                className="
                                    absolute
                                    right-3
                                    top-3
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-black/60
                                    text-lg
                                    text-white
                                    backdrop-blur
                                    transition
                                    hover:bg-black/80
                                "
                                aria-label="Remove media"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* TEXT WITH MEDIA */}

                    {selectedFile && (
                        <textarea
                            value={content}
                            onChange={(event) =>
                                setContent(
                                    event.target.value
                                )
                            }
                            maxLength={700}
                            placeholder="Add a caption..."
                            className="
                                mb-4
                                min-h-[90px]
                                w-full
                                resize-none
                                rounded-xl
                                border
                                border-border
                                bg-background
                                px-4
                                py-3
                                text-sm
                                text-foreground
                                outline-none
                                placeholder:text-muted
                                focus:border-blue-500
                            "
                        />
                    )}

                    {/* BACKGROUND COLORS */}

                    {!selectedFile && (
                        <div className="mb-4">
                            <p
                                className="
                                    mb-2
                                    text-xs
                                    font-medium
                                    text-muted
                                "
                            >
                                Background
                            </p>

                            <div className="flex gap-2">
                                {[
                                    "#1f2937",
                                    "#7c3aed",
                                    "#db2777",
                                    "#dc2626",
                                    "#ea580c",
                                    "#ca8a04",
                                    "#059669",
                                    "#0891b2",
                                ].map(
                                    (color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                                setBackgroundColor(
                                                    color
                                                )
                                            }
                                            className={`
                                                h-8
                                                w-8
                                                rounded-full
                                                border-2
                                                transition
                                                ${
                                                    backgroundColor ===
                                                    color
                                                        ? "scale-110 border-white"
                                                        : "border-transparent"
                                                }
                                            `}
                                            style={{
                                                backgroundColor:
                                                    color,
                                            }}
                                            aria-label={`Select ${color} background`}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* FILE BUTTON */}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={
                            handleFileChange
                        }
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={loading}
                        className="
                            flex
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-border
                            bg-background
                            px-4
                            py-3
                            text-sm
                            font-medium
                            text-foreground
                            transition
                            hover:bg-hover
                            disabled:opacity-50
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                        >
                            <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                            />

                            <circle
                                cx="8.5"
                                cy="8.5"
                                r="1.5"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 15-5-5L5 21"
                            />
                        </svg>

                        {selectedFile
                            ? "Change photo or video"
                            : "Add photo or video"}
                    </button>

                    {/* ERROR */}

                    {error && (
                        <p
                            className="
                                mt-3
                                text-center
                                text-sm
                                text-red-500
                            "
                        >
                            {error}
                        </p>
                    )}
                </div>

                {/* ====================================================
                    FOOTER
                ==================================================== */}

                <div
                    className="
                        flex
                        gap-3
                        border-t
                        border-border
                        bg-background
                        px-5
                        py-4
                    "
                >
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="
                            h-11
                            flex-1
                            rounded-xl
                            border
                            border-border
                            bg-surface
                            text-sm
                            font-medium
                            text-foreground
                            transition
                            hover:bg-hover
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleCreateStatus
                        }
                        disabled={loading}
                        className="
                            h-11
                            flex-1
                            rounded-xl
                            bg-blue-600
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-blue-700
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
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

                                Posting...
                            </span>
                        ) : (
                            "Post Status"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}