"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useTheme,
} from "@/components/ThemeProvider";

export default function ProfileSettings() {
    // ============================================================
    // THEME
    // ============================================================

    const {
        theme,
        changeTheme,
    } = useTheme();

    // ============================================================
    // STATE
    // ============================================================

    const [user, setUser] = useState(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [uploadingAvatar, setUploadingAvatar] =
        useState(false);

    const [removingAvatar, setRemovingAvatar] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [username, setUsername] =
        useState("");

    const [bio, setBio] =
        useState("");

    const fileInputRef =
        useRef(null);

    // ============================================================
    // FETCH PROFILE
    // ============================================================

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            setLoading(true);
            setError("");

            const response =
                await fetch(
                    "/api/profile",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
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
                        "Failed to load profile."
                );
            }

            setUser(data.user);

            setUsername(
                data.user?.username || ""
            );

            setBio(
                data.user?.bio || ""
            );
        } catch (error) {
            console.error(
                "❌ SETTINGS PROFILE ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to load profile."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // OPEN FILE SELECTOR
    // ============================================================

    function handleChangePhotoClick() {
        if (
            uploadingAvatar ||
            removingAvatar
        ) {
            return;
        }

        fileInputRef.current?.click();
    }

    // ============================================================
    // AVATAR CHANGE
    // ============================================================

    async function handleAvatarChange(event) {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

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
            setError(
                "Only JPG, PNG, WEBP, and GIF images are allowed."
            );

            setSuccess("");

            return;
        }

        const maxFileSize =
            5 * 1024 * 1024;

        if (
            file.size >
            maxFileSize
        ) {
            setError(
                "Avatar image cannot exceed 5 MB."
            );

            setSuccess("");

            return;
        }

        try {
            setUploadingAvatar(true);
            setError("");
            setSuccess("");

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

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.error ||
                        "Failed to upload profile picture."
                );
            }

            setUser(data.user);

            setUsername(
                data.user?.username || ""
            );

            setBio(
                data.user?.bio || ""
            );

            showSuccess(
                "Profile picture updated successfully."
            );
        } catch (error) {
            console.error(
                "❌ AVATAR UPLOAD ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to upload profile picture."
            );
        } finally {
            setUploadingAvatar(false);
        }
    }

    // ============================================================
    // REMOVE AVATAR
    // ============================================================

    async function handleRemoveAvatar() {
        if (
            removingAvatar ||
            uploadingAvatar
        ) {
            return;
        }

        try {
            setRemovingAvatar(true);
            setError("");
            setSuccess("");

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

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.error ||
                        "Failed to remove profile picture."
                );
            }

            setUser(data.user);

            setUsername(
                data.user?.username || ""
            );

            setBio(
                data.user?.bio || ""
            );

            showSuccess(
                "Profile picture removed successfully."
            );
        } catch (error) {
            console.error(
                "❌ AVATAR REMOVE ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to remove profile picture."
            );
        } finally {
            setRemovingAvatar(false);
        }
    }

    // ============================================================
    // SUCCESS MESSAGE
    // ============================================================

    function showSuccess(message) {
        setSuccess(message);

        setTimeout(() => {
            setSuccess("");
        }, 3000);
    }

    // ============================================================
    // SAVE PROFILE
    // ============================================================

    async function handleSave(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response =
                await fetch(
                    "/api/profile",
                    {
                        method: "PUT",
                        credentials: "include",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json",
                        },
                        body: JSON.stringify({
                            username:
                                username.trim(),
                            bio:
                                bio.trim(),
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
                        "Failed to update profile."
                );
            }

            setUser(data.user);

            setUsername(
                data.user?.username || ""
            );

            setBio(
                data.user?.bio || ""
            );

            showSuccess(
                "Profile updated successfully."
            );
        } catch (error) {
            console.error(
                "❌ PROFILE SETTINGS SAVE ERROR:",
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
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <div className="p-5 sm:p-8">
                <div className="animate-pulse space-y-5">

                    <div
                        className="h-32 rounded-2xl"
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                        }}
                    />

                    <div
                        className="h-28 rounded-2xl"
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                        }}
                    />

                    <div
                        className="h-20 rounded-2xl"
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                        }}
                    />

                    <div
                        className="h-32 rounded-2xl"
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                        }}
                    />
                </div>
            </div>
        );
    }

    // ============================================================
    // ERROR
    // ============================================================

    if (!user) {
        return (
            <div className="p-5 sm:p-8">

                <div
                    className="
                        rounded-2xl
                        border
                        p-5
                    "
                    style={{
                        borderColor:
                            "var(--chat-danger-border)",
                        background:
                            "var(--chat-danger-bg)",
                        color:
                            "var(--chat-danger)",
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
                                bg-red-500/10
                            "
                        >
                            ⚠️
                        </div>

                        <div>
                            <p className="font-semibold">
                                Unable to load profile
                            </p>

                            <p className="mt-1 text-sm opacity-80">
                                {error ||
                                    "Something went wrong."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={fetchProfile}
                        className="
                            mt-4
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
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const displayName =
        user.displayName?.trim() ||
        username.trim() ||
        user.username?.trim() ||
        "User";

    const initial =
        displayName
            .charAt(0)
            .toUpperCase() || "?";

    // ============================================================
    // MAIN
    // ============================================================

    return (
        <div
            className="relative"
            style={{
                color:
                    "var(--chat-text-primary)",
            }}
        >

            {/* =====================================================
                TOP PROFILE HERO
            ===================================================== */}

            <div
                className="
                    relative
                    overflow-hidden
                    border-b
                    px-5
                    py-7
                    sm:px-8
                "
                style={{
                    borderColor:
                        "var(--chat-border)",
                    background:
                        "linear-gradient(135deg, var(--chat-accent-soft), transparent 60%)",
                }}
            >

                {/* Decorative glow */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-20
                        -top-20
                        h-48
                        w-48
                        rounded-full
                        blur-3xl
                    "
                    style={{
                        background:
                            "var(--chat-accent-soft)",
                    }}
                />

                <div
                    className="
                        relative
                        flex
                        flex-col
                        gap-5
                        sm:flex-row
                        sm:items-center
                    "
                >

                    {/* Avatar */}

                    <div className="relative shrink-0">

                        <div
                            className="
                                flex
                                h-24
                                w-24
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-3xl
                                text-3xl
                                font-bold
                                text-white
                                shadow-xl
                                ring-4
                            "
                            style={{
                                background:
                                    user.avatar
                                        ? "var(--chat-bg-tertiary)"
                                        : "var(--chat-accent)",
                                ringColor:
                                    "var(--chat-bg-secondary)",
                            }}
                        >
                            {user.avatar ? (
                                <img
                                    src={
                                        user.avatar
                                    }
                                    alt={
                                        displayName
                                    }
                                    className="
                                        h-full
                                        w-full
                                        object-cover
                                    "
                                />
                            ) : (
                                initial
                            )}
                        </div>

                        {/* ONLINE DOT */}

                        <span
                            className="
                                absolute
                                bottom-1
                                right-1
                                h-5
                                w-5
                                rounded-full
                                border-4
                            "
                            style={{
                                background:
                                    "#22c55e",
                                borderColor:
                                    "var(--chat-bg-secondary)",
                            }}
                            title="Online"
                        />
                    </div>

                    {/* Profile info */}

                    <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                            <h2
                                className="
                                    truncate
                                    text-xl
                                    font-bold
                                    sm:text-2xl
                                "
                            >
                                {displayName}
                            </h2>

                            <span
                                className="
                                    rounded-full
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wider
                                "
                                style={{
                                    background:
                                        "var(--chat-accent-soft)",
                                    color:
                                        "var(--chat-accent)",
                                }}
                            >
                                Profile
                            </span>
                        </div>

                        <p
                            className="
                                mt-1
                                truncate
                                text-sm
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            @{user.username ||
                                "username"}
                        </p>

                        <p
                            className="
                                mt-3
                                max-w-xl
                                text-sm
                                leading-6
                            "
                            style={{
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            {bio.trim() ||
                                "Tell people something interesting about yourself."}
                        </p>
                    </div>
                </div>
            </div>

            {/* =====================================================
                FORM
            ===================================================== */}

            <form
                onSubmit={handleSave}
                className="p-5 sm:p-8"
            >

                {/* =================================================
                    PROFILE PHOTO CARD
                ================================================= */}

                <SettingsCard
                    icon="🖼️"
                    title="Profile picture"
                    description="Choose a picture that represents you on ChatHub."
                >

                    <div
                        className="
                            mt-5
                            flex
                            flex-col
                            gap-5
                            sm:flex-row
                            sm:items-center
                        "
                    >

                        <div className="relative shrink-0">

                            <div
                                className="
                                    flex
                                    h-20
                                    w-20
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-2xl
                                    text-2xl
                                    font-bold
                                    text-white
                                    shadow-lg
                                "
                                style={{
                                    background:
                                        user.avatar
                                            ? "var(--chat-bg-tertiary)"
                                            : "var(--chat-accent)",
                                }}
                            >
                                {user.avatar ? (
                                    <img
                                        src={
                                            user.avatar
                                        }
                                        alt={
                                            displayName
                                        }
                                        className="
                                            h-full
                                            w-full
                                            object-cover
                                        "
                                    />
                                ) : (
                                    initial
                                )}
                            </div>

                            {(uploadingAvatar ||
                                removingAvatar) && (
                                <div
                                    className="
                                        absolute
                                        inset-0
                                        flex
                                        items-center
                                        justify-center
                                        rounded-2xl
                                    "
                                    style={{
                                        background:
                                            "rgba(0,0,0,0.65)",
                                    }}
                                >
                                    <div
                                        className="
                                            h-6
                                            w-6
                                            animate-spin
                                            rounded-full
                                            border-2
                                            border-white/30
                                        "
                                        style={{
                                            borderTopColor:
                                                "white",
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">

                            <p
                                className="
                                    text-sm
                                    font-semibold
                                "
                            >
                                Change your photo
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
                                JPG, PNG, WEBP or GIF.
                                Maximum 5 MB.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={
                                    handleAvatarChange
                                }
                                className="hidden"
                            />

                            <div className="mt-4 flex flex-wrap gap-2">

                                <button
                                    type="button"
                                    onClick={
                                        handleChangePhotoClick
                                    }
                                    disabled={
                                        uploadingAvatar ||
                                        removingAvatar
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        px-4
                                        py-2.5
                                        text-xs
                                        font-semibold
                                        text-white
                                        shadow-sm
                                        transition
                                        hover:-translate-y-0.5
                                        hover:opacity-90
                                        active:translate-y-0
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                    style={{
                                        background:
                                            "var(--chat-accent)",
                                    }}
                                >
                                    📷
                                    {uploadingAvatar
                                        ? "Uploading..."
                                        : "Change Photo"}
                                </button>

                                {user.avatar && (
                                    <button
                                        type="button"
                                        onClick={
                                            handleRemoveAvatar
                                        }
                                        disabled={
                                            uploadingAvatar ||
                                            removingAvatar
                                        }
                                        className="
                                            rounded-xl
                                            border
                                            px-4
                                            py-2.5
                                            text-xs
                                            font-semibold
                                            transition
                                            hover:bg-red-500/10
                                            disabled:opacity-50
                                        "
                                        style={{
                                            borderColor:
                                                "var(--chat-border)",
                                            color:
                                                "var(--chat-text-secondary)",
                                        }}
                                    >
                                        🗑️
                                        {" "}
                                        {removingAvatar
                                            ? "Removing..."
                                            : "Remove"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                {/* =================================================
                    APPEARANCE
                ================================================= */}

                <SettingsCard
                    icon="✨"
                    title="Appearance"
                    description="Customize how ChatHub looks on your device."
                    className="mt-5"
                >

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">

                        <ThemeButton
                            selected={
                                theme === "dark"
                            }
                            onClick={() =>
                                changeTheme(
                                    "dark"
                                )
                            }
                            icon="🌙"
                            title="Dark"
                            description="Easy on the eyes"
                        />

                        <ThemeButton
                            selected={
                                theme === "light"
                            }
                            onClick={() =>
                                changeTheme(
                                    "light"
                                )
                            }
                            icon="☀️"
                            title="Light"
                            description="Bright and clean"
                        />

                        <ThemeButton
                            selected={
                                theme === "system"
                            }
                            onClick={() =>
                                changeTheme(
                                    "system"
                                )
                            }
                            icon="🖥️"
                            title="System"
                            description="Follow your device"
                        />
                    </div>
                </SettingsCard>

                {/* =================================================
                    ACCOUNT INFORMATION
                ================================================= */}

                <SettingsCard
                    icon="👤"
                    title="Account information"
                    description="Your basic ChatHub account details."
                    className="mt-5"
                >

                    {/* EMAIL */}

                    <div className="mt-5">

                        <FieldLabel>
                            Email address
                        </FieldLabel>

                        <div className="relative">

                            <input
                                type="email"
                                value={
                                    user.email ||
                                    ""
                                }
                                disabled
                                className="
                                    h-12
                                    w-full
                                    rounded-xl
                                    border
                                    px-4
                                    pr-11
                                    text-sm
                                    outline-none
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-border)",
                                    background:
                                        "var(--chat-bg-tertiary)",
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            />

                            <span
                                className="
                                    absolute
                                    right-4
                                    top-1/2
                                    -translate-y-1/2
                                    text-sm
                                "
                            >
                                🔒
                            </span>
                        </div>

                        <p
                            className="
                                mt-2
                                text-xs
                            "
                            style={{
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            Email changes are
                            currently disabled.
                        </p>
                    </div>

                    {/* USERNAME */}

                    <div className="mt-5">

                        <FieldLabel>
                            Username
                        </FieldLabel>

                        <div className="relative">

                            <span
                                className="
                                    pointer-events-none
                                    absolute
                                    left-4
                                    top-1/2
                                    -translate-y-1/2
                                    text-sm
                                "
                                style={{
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            >
                                @
                            </span>

                            <input
                                type="text"
                                value={
                                    username
                                }
                                onChange={(
                                    event
                                ) =>
                                    setUsername(
                                        event.target
                                            .value
                                    )
                                }
                                minLength={3}
                                maxLength={30}
                                className="
                                    h-12
                                    w-full
                                    rounded-xl
                                    border
                                    pl-9
                                    pr-4
                                    text-sm
                                    outline-none
                                    transition
                                    focus:ring-2
                                "
                                style={{
                                    borderColor:
                                        "var(--chat-border)",
                                    background:
                                        "var(--chat-bg-primary)",
                                    color:
                                        "var(--chat-text-primary)",
                                    "--tw-ring-color":
                                        "var(--chat-accent-soft)",
                                }}
                                placeholder="your_username"
                            />
                        </div>

                        <div className="mt-2 flex justify-between">

                            <p
                                className="text-xs"
                                style={{
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            >
                                3–30 characters
                            </p>

                            <p
                                className="text-xs"
                                style={{
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            >
                                {username.length}/30
                            </p>
                        </div>
                    </div>

                    {/* BIO */}

                    <div className="mt-5">

                        <div className="mb-2 flex items-center justify-between">

                            <FieldLabel>
                                About you
                            </FieldLabel>

                            <span
                                className="
                                    text-xs
                                    font-medium
                                "
                                style={{
                                    color:
                                        bio.length >
                                        140
                                            ? "var(--chat-danger)"
                                            : "var(--chat-text-muted)",
                                }}
                            >
                                {bio.length}/160
                            </span>
                        </div>

                        <textarea
                            value={bio}
                            onChange={(
                                event
                            ) =>
                                setBio(
                                    event.target
                                        .value
                                )
                            }
                            maxLength={160}
                            rows={5}
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
                                focus:ring-2
                            "
                            style={{
                                borderColor:
                                    "var(--chat-border)",
                                background:
                                    "var(--chat-bg-primary)",
                                color:
                                    "var(--chat-text-primary)",
                                "--tw-ring-color":
                                    "var(--chat-accent-soft)",
                            }}
                        />
                    </div>
                </SettingsCard>

                {/* =================================================
                    MESSAGES
                ================================================= */}

                {error && (
                    <div
                        className="
                            mt-5
                            flex
                            items-start
                            gap-3
                            rounded-2xl
                            border
                            p-4
                        "
                        style={{
                            borderColor:
                                "var(--chat-danger-border)",
                            background:
                                "var(--chat-danger-bg)",
                            color:
                                "var(--chat-danger)",
                        }}
                    >
                        <span className="text-lg">
                            ⚠️
                        </span>

                        <p className="text-sm leading-5">
                            {error}
                        </p>
                    </div>
                )}

                {success && (
                    <div
                        className="
                            mt-5
                            flex
                            items-center
                            gap-3
                            rounded-2xl
                            border
                            p-4
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
                        <span className="text-lg">
                            ✓
                        </span>

                        <p className="text-sm font-medium">
                            {success}
                        </p>
                    </div>
                )}

                {/* =================================================
                    SAVE BAR
                ================================================= */}

                <div
                    className="
                        sticky
                        bottom-4
                        z-10
                        mt-7
                        flex
                        flex-col
                        gap-3
                        rounded-2xl
                        border
                        p-3
                        backdrop-blur-xl
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                    style={{
                        background:
                            "color-mix(in srgb, var(--chat-bg-secondary) 90%, transparent)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >

                    <div className="hidden sm:block">

                        <p
                            className="
                                text-xs
                                font-medium
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Keep your profile up to date
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
                            Your changes will be visible
                            across ChatHub.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="
                            inline-flex
                            h-11
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            px-6
                            text-sm
                            font-semibold
                            text-white
                            shadow-lg
                            transition
                            hover:-translate-y-0.5
                            hover:opacity-90
                            active:translate-y-0
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                "var(--chat-accent)",
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
                                    "
                                    style={{
                                        borderTopColor:
                                            "white",
                                    }}
                                />

                                Saving...
                            </>
                        ) : (
                            <>
                                ✓
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ============================================================
// SETTINGS CARD
// ============================================================

function SettingsCard({
    icon,
    title,
    description,
    children,
    className = "",
}) {
    return (
        <section
            className={`
                rounded-2xl
                border
                p-5
                sm:p-6
                ${className}
            `}
            style={{
                background:
                    "var(--chat-bg-primary)",
                borderColor:
                    "var(--chat-border)",
            }}
        >
            <div className="flex items-start gap-3">

                <div
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        text-lg
                    "
                    style={{
                        background:
                            "var(--chat-accent-soft)",
                    }}
                >
                    {icon}
                </div>

                <div className="min-w-0">

                    <h3
                        className="
                            text-sm
                            font-bold
                        "
                    >
                        {title}
                    </h3>

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
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

// ============================================================
// FIELD LABEL
// ============================================================

function FieldLabel({
    children,
}) {
    return (
        <label
            className="
                mb-2
                block
                text-sm
                font-semibold
            "
            style={{
                color:
                    "var(--chat-text-secondary)",
            }}
        >
            {children}
        </label>
    );
}

// ============================================================
// THEME BUTTON
// ============================================================

function ThemeButton({
    selected,
    onClick,
    icon,
    title,
    description,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                group
                relative
                overflow-hidden
                rounded-2xl
                border
                p-4
                text-left
                transition-all
                duration-200
                hover:-translate-y-0.5
                active:translate-y-0
            "
            style={{
                borderColor:
                    selected
                        ? "var(--chat-accent)"
                        : "var(--chat-border)",

                background:
                    selected
                        ? "var(--chat-accent-soft)"
                        : "var(--chat-bg-secondary)",
            }}
        >

            {/* Selected glow */}

            {selected && (
                <div
                    className="
                        absolute
                        -right-8
                        -top-8
                        h-20
                        w-20
                        rounded-full
                        blur-2xl
                    "
                    style={{
                        background:
                            "var(--chat-accent-soft)",
                    }}
                />
            )}

            <div className="relative flex items-center gap-3">

                <div
                    className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        text-xl
                        transition-transform
                        group-hover:scale-105
                    "
                    style={{
                        background:
                            selected
                                ? "var(--chat-accent-soft)"
                                : "var(--chat-bg-tertiary)",
                    }}
                >
                    {icon}
                </div>

                <div className="min-w-0">

                    <p
                        className="
                            text-sm
                            font-bold
                        "
                    >
                        {title}
                    </p>

                    <p
                        className="
                            mt-0.5
                            truncate
                            text-xs
                        "
                        style={{
                            color:
                                "var(--chat-text-muted)",
                        }}
                    >
                        {description}
                    </p>
                </div>
            </div>

            {selected && (
                <div
                    className="
                        relative
                        mt-4
                        flex
                        items-center
                        gap-1.5
                        text-[11px]
                        font-bold
                    "
                    style={{
                        color:
                            "var(--chat-accent)",
                    }}
                >
                    <span
                        className="
                            flex
                            h-4
                            w-4
                            items-center
                            justify-center
                            rounded-full
                        "
                        style={{
                            background:
                                "var(--chat-accent)",
                            color: "white",
                        }}
                    >
                        ✓
                    </span>

                    Currently selected
                </div>
            )}
        </button>
    );
}