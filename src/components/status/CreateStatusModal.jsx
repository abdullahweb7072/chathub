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
    // BACKGROUND COLORS
    // ============================================================

    const backgroundColors = [
        "#1f2937",
        "#7c3aed",
        "#db2777",
        "#dc2626",
        "#ea580c",
        "#ca8a04",
        "#059669",
        "#0891b2",
    ];

    // ============================================================
    // RESET
    // ============================================================

    useEffect(() => {
        if (!open) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            setContent("");
            setSelectedFile(null);
            setPreviewUrl(null);
            setError("");
            setLoading(false);
            setBackgroundColor("#1f2937");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
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

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        const url =
            URL.createObjectURL(file);

        setError("");
        setSelectedFile(file);
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
        setError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // ============================================================
    // UPLOAD MEDIA
    // ============================================================

    const uploadMedia = async () => {
        const formData =
            new FormData();

        formData.append(
            "file",
            selectedFile
        );

        const response =
            await fetch(
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

        if (
            !response.ok ||
            !data?.success
        ) {
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

    const handleCreateStatus =
        async () => {
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

                // ------------------------------------------------
                // UPLOAD MEDIA
                // ------------------------------------------------

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

                // ------------------------------------------------
                // CREATE STATUS
                // ------------------------------------------------

                const response =
                    await fetch(
                        "/api/status",
                        {
                            method: "POST",
                            credentials:
                                "include",
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
                        .catch(
                            () => null
                        );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Failed to create status."
                    );
                }

                if (onCreated) {
                    onCreated(
                        data.status
                    );
                }

                onClose();
            } catch (error) {
                console.error(
                    "CREATE STATUS ERROR:",
                    error
                );

                setError(
                    error?.message ||
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

    // ============================================================
    // KEYBOARD
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event) => {
            if (
                event.key === "Escape" &&
                !loading
            ) {
                handleClose();
            }
        };

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
    }, [open, loading]);

    if (!open) {
        return null;
    }

    const isVideo =
        selectedFile?.type?.startsWith(
            "video/"
        );

    const contentLength =
        content.length;

    const canPost =
        content.trim() ||
        selectedFile;

    return (
        <div
            className="
                fixed
                inset-0
                z-[200]
                flex
                items-center
                justify-center
                bg-black/75
                px-4
                py-6
                backdrop-blur-md
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
            {/* ====================================================
                MODAL
            ==================================================== */}

            <div
                className="
                    relative
                    flex
                    max-h-[92vh]
                    w-full
                    max-w-xl
                    flex-col
                    overflow-hidden
                    rounded-[28px]
                    border
                    shadow-2xl
                "
                style={{
                    background:
                        "var(--chat-bg-secondary)",
                    borderColor:
                        "var(--chat-border)",
                }}
            >
                {/* ==================================================
                    DECORATIVE GLOW
                ================================================== */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-24
                        -top-24
                        h-56
                        w-56
                        rounded-full
                        blur-3xl
                    "
                    style={{
                        background:
                            "var(--chat-accent-soft)",
                        opacity: 0.45,
                    }}
                />

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div
                    className="
                        relative
                        flex
                        shrink-0
                        items-center
                        justify-between
                        border-b
                        px-5
                        py-4
                        sm:px-6
                    "
                    style={{
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div className="flex items-center gap-3">
                        {/* STATUS ICON */}

                        <div
                            className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-2xl
                                shadow-lg
                            "
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--chat-accent), #7c3aed)",
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5 text-white"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 3v18M3 12h18"
                                />

                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    opacity="0.25"
                                />
                            </svg>
                        </div>

                        <div>
                            <h2
                                className="
                                    text-lg
                                    font-bold
                                    tracking-tight
                                "
                                style={{
                                    color:
                                        "var(--chat-text-primary)",
                                }}
                            >
                                Create Status
                            </h2>

                            <div
                                className="
                                    mt-0.5
                                    flex
                                    items-center
                                    gap-1.5
                                    text-xs
                                "
                                style={{
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            >
                                <span
                                    className="
                                        h-1.5
                                        w-1.5
                                        rounded-full
                                        bg-emerald-500
                                    "
                                />

                                Disappears after 24 hours
                            </div>
                        </div>
                    </div>

                    {/* CLOSE */}

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        aria-label="Close"
                        className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-full
                            border
                            transition
                            hover:scale-105
                            active:scale-95
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                            borderColor:
                                "var(--chat-border)",
                            color:
                                "var(--chat-text-muted)",
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

                {/* ==================================================
                    SCROLLABLE CONTENT
                ================================================== */}

                <div
                    className="
                        min-h-0
                        flex-1
                        overflow-y-auto
                        px-5
                        py-5
                        sm:px-6
                    "
                >
                    {/* ==================================================
                        TEXT STATUS PREVIEW
                    ================================================== */}

                    {!selectedFile && (
                        <div>
                            <div
                                className="
                                    relative
                                    overflow-hidden
                                    rounded-[24px]
                                    border
                                    shadow-xl
                                "
                                style={{
                                    backgroundColor:
                                        backgroundColor,
                                    borderColor:
                                        "rgba(255,255,255,0.12)",
                                }}
                            >
                                {/* Decorative circles */}

                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        -right-16
                                        -top-16
                                        h-40
                                        w-40
                                        rounded-full
                                        bg-white/10
                                        blur-2xl
                                    "
                                />

                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        -bottom-20
                                        -left-10
                                        h-44
                                        w-44
                                        rounded-full
                                        bg-black/10
                                        blur-2xl
                                    "
                                />

                                <div
                                    className="
                                        relative
                                        flex
                                        min-h-[260px]
                                        flex-col
                                    "
                                >
                                    <textarea
                                        value={
                                            content
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setContent(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        maxLength={
                                            700
                                        }
                                        placeholder="What's on your mind?"
                                        disabled={
                                            loading
                                        }
                                        className="
                                            min-h-[220px]
                                            w-full
                                            flex-1
                                            resize-none
                                            bg-transparent
                                            px-7
                                            py-10
                                            text-center
                                            text-xl
                                            font-semibold
                                            leading-relaxed
                                            text-white
                                            outline-none
                                            placeholder:text-white/55
                                            disabled:cursor-not-allowed
                                        "
                                    />

                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            px-5
                                            pb-4
                                        "
                                    >
                                        <span
                                            className="
                                                rounded-full
                                                bg-black/10
                                                px-3
                                                py-1
                                                text-[10px]
                                                font-medium
                                                uppercase
                                                tracking-wider
                                                text-white/70
                                            "
                                        >
                                            Text Status
                                        </span>

                                        <span
                                            className="
                                                text-xs
                                                font-medium
                                                text-white/60
                                            "
                                        >
                                            {
                                                contentLength
                                            }
                                            /700
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ==================================================
                                BACKGROUND PICKER
                            ================================================== */}

                            <div className="mt-5">
                                <div className="mb-3 flex items-center justify-between">
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
                                            Choose a background
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
                                            Pick a color for your text status
                                        </p>
                                    </div>

                                    <div
                                        className="
                                            h-7
                                            w-7
                                            rounded-full
                                            border-2
                                        "
                                        style={{
                                            backgroundColor:
                                                backgroundColor,
                                            borderColor:
                                                "var(--chat-border)",
                                        }}
                                    />
                                </div>

                                <div
                                    className="
                                        flex
                                        flex-wrap
                                        gap-3
                                    "
                                >
                                    {backgroundColors.map(
                                        (color) => {
                                            const selected =
                                                backgroundColor ===
                                                color;

                                            return (
                                                <button
                                                    key={
                                                        color
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setBackgroundColor(
                                                            color
                                                        )
                                                    }
                                                    disabled={
                                                        loading
                                                    }
                                                    className={`
                                                        relative
                                                        h-10
                                                        w-10
                                                        rounded-full
                                                        border-2
                                                        transition
                                                        duration-200
                                                        hover:scale-110
                                                        active:scale-95
                                                        disabled:opacity-50
                                                        ${
                                                            selected
                                                                ? "scale-110"
                                                                : ""
                                                        }
                                                    `}
                                                    style={{
                                                        backgroundColor:
                                                            color,
                                                        borderColor:
                                                            selected
                                                                ? "white"
                                                                : "transparent",
                                                        boxShadow:
                                                            selected
                                                                ? `0 0 0 2px ${color}`
                                                                : "none",
                                                    }}
                                                    aria-label={`Select ${color} background`}
                                                >
                                                    {selected && (
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="white"
                                                            strokeWidth="3"
                                                            className="
                                                                absolute
                                                                left-1/2
                                                                top-1/2
                                                                h-4
                                                                w-4
                                                                -translate-x-1/2
                                                                -translate-y-1/2
                                                            "
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="m5 12 4 4L19 6"
                                                            />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================================================
                        MEDIA PREVIEW
                    ================================================== */}

                    {selectedFile && (
                        <div>
                            <div
                                className="
                                    group
                                    relative
                                    overflow-hidden
                                    rounded-[24px]
                                    border
                                    bg-black
                                    shadow-xl
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                {isVideo ? (
                                    <video
                                        src={
                                            previewUrl
                                        }
                                        controls
                                        className="
                                            max-h-[380px]
                                            min-h-[220px]
                                            w-full
                                            object-contain
                                        "
                                    />
                                ) : (
                                    <img
                                        src={
                                            previewUrl
                                        }
                                        alt="Status preview"
                                        className="
                                            max-h-[380px]
                                            min-h-[220px]
                                            w-full
                                            object-contain
                                        "
                                    />
                                )}

                                {/* MEDIA TYPE */}

                                <div
                                    className="
                                        absolute
                                        left-3
                                        top-3
                                        flex
                                        items-center
                                        gap-2
                                        rounded-full
                                        bg-black/60
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-medium
                                        text-white
                                        backdrop-blur-md
                                    "
                                >
                                    {isVideo ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-3.5 w-3.5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m8 5 11 7-11 7V5z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-3.5 w-3.5"
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
                                    )}

                                    {isVideo
                                        ? "Video"
                                        : "Photo"}
                                </div>

                                {/* REMOVE */}

                                <button
                                    type="button"
                                    onClick={
                                        handleRemoveFile
                                    }
                                    disabled={
                                        loading
                                    }
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
                                        text-white
                                        backdrop-blur-md
                                        transition
                                        hover:scale-105
                                        hover:bg-red-500
                                        active:scale-95
                                        disabled:opacity-50
                                    "
                                    aria-label="Remove media"
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
                                            d="M6 6l12 12M18 6 6 18"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* FILE INFO */}

                            <div
                                className="
                                    mt-3
                                    flex
                                    items-center
                                    justify-between
                                    gap-3
                                    rounded-xl
                                    border
                                    px-4
                                    py-3
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-tertiary)",
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                <div className="min-w-0">
                                    <p
                                        className="
                                            truncate
                                            text-xs
                                            font-medium
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        {
                                            selectedFile.name
                                        }
                                    </p>

                                    <p
                                        className="
                                            mt-0.5
                                            text-[11px]
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        {(
                                            selectedFile.size /
                                            (1024 *
                                                1024)
                                        ).toFixed(
                                            2
                                        )}{" "}
                                        MB
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="
                                        shrink-0
                                        rounded-lg
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-semibold
                                        transition
                                        hover:opacity-80
                                        disabled:opacity-50
                                    "
                                    style={{
                                        color:
                                            "var(--chat-accent)",
                                    }}
                                >
                                    Change
                                </button>
                            </div>

                            {/* CAPTION */}

                            <div className="mt-5">
                                <div className="mb-2 flex items-center justify-between">
                                    <label
                                        className="
                                            text-sm
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        Caption
                                    </label>

                                    <span
                                        className="
                                            text-xs
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        {
                                            contentLength
                                        }
                                        /700
                                    </span>
                                </div>

                                <textarea
                                    value={
                                        content
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setContent(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    maxLength={
                                        700
                                    }
                                    placeholder="Add a caption..."
                                    disabled={
                                        loading
                                    }
                                    className="
                                        min-h-[100px]
                                        w-full
                                        resize-none
                                        rounded-2xl
                                        border
                                        px-4
                                        py-3
                                        text-sm
                                        leading-6
                                        outline-none
                                        transition
                                        focus:ring-2
                                    "
                                    style={{
                                        background:
                                            "var(--chat-bg-primary)",
                                        borderColor:
                                            "var(--chat-border)",
                                        color:
                                            "var(--chat-text-primary)",
                                        outlineColor:
                                            "var(--chat-accent)",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ==================================================
                        ADD MEDIA
                    ================================================== */}

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
                            group
                            mt-5
                            flex
                            w-full
                            items-center
                            gap-4
                            rounded-2xl
                            border
                            px-4
                            py-4
                            text-left
                            transition
                            hover:-translate-y-0.5
                            hover:shadow-lg
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                            borderColor:
                                "var(--chat-border)",
                        }}
                    >
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
                                group-hover:scale-105
                            "
                            style={{
                                background:
                                    "var(--chat-accent-soft)",
                                color:
                                    "var(--chat-accent)",
                            }}
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
                        </div>

                        <div className="min-w-0 flex-1">
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
                                {selectedFile
                                    ? "Change media"
                                    : "Add photo or video"}
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
                                JPG, PNG, GIF, WEBP or video • Max 25 MB
                            </p>
                        </div>

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="
                                h-5
                                w-5
                                shrink-0
                                transition
                                group-hover:translate-x-1
                            "
                            style={{
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m9 18 6-6-6-6"
                            />
                        </svg>
                    </button>

                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {error && (
                        <div
                            className="
                                mt-4
                                flex
                                items-start
                                gap-3
                                rounded-2xl
                                border
                                px-4
                                py-3
                            "
                            style={{
                                background:
                                    "var(--chat-danger-bg)",
                                borderColor:
                                    "var(--chat-danger-border)",
                                color:
                                    "var(--chat-danger)",
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="
                                    mt-0.5
                                    h-4
                                    w-4
                                    shrink-0
                                "
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                />

                                <path
                                    strokeLinecap="round"
                                    d="M12 8v4"
                                />

                                <path
                                    strokeLinecap="round"
                                    d="M12 16h.01"
                                />
                            </svg>

                            <p className="text-xs leading-5">
                                {error}
                            </p>
                        </div>
                    )}
                </div>

                {/* ==================================================
                    FOOTER
                ================================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        px-5
                        py-4
                        sm:px-6
                    "
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div className="flex gap-3">
                        {/* CANCEL */}

                        <button
                            type="button"
                            onClick={
                                handleClose
                            }
                            disabled={
                                loading
                            }
                            className="
                                h-11
                                flex-1
                                rounded-xl
                                border
                                text-sm
                                font-semibold
                                transition
                                hover:-translate-y-0.5
                                hover:shadow-md
                                active:translate-y-0
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                                borderColor:
                                    "var(--chat-border)",
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Cancel
                        </button>

                        {/* POST */}

                        <button
                            type="button"
                            onClick={
                                handleCreateStatus
                            }
                            disabled={
                                loading ||
                                !canPost
                            }
                            className="
                                h-11
                                flex-1
                                rounded-xl
                                border
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                transition
                                hover:-translate-y-0.5
                                hover:shadow-xl
                                active:translate-y-0
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--chat-accent), #7c3aed)",
                                borderColor:
                                    "var(--chat-accent)",
                            }}
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

                                    {selectedFile
                                        ? "Uploading..."
                                        : "Posting..."}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Post Status

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
                                            d="m5 12 14-7-7 14-2-5-5-2z"
                                        />
                                    </svg>
                                </span>
                            )}
                        </button>
                    </div>

                    <p
                        className="
                            mt-3
                            text-center
                            text-[10px]
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        Your status will be visible to your ChatHub contacts for 24 hours.
                    </p>
                </div>
            </div>
        </div>
    );
}