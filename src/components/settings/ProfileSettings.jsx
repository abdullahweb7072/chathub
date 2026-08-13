
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
                data.user?.username ||
                    ""
            );

            setBio(
                data.user?.bio ||
                    ""
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
    // AVATAR FILE SELECTED
    // ============================================================

    async function handleAvatarChange(event) {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

        // --------------------------------------------------------
        // VALIDATE FILE TYPE
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // VALIDATE FILE SIZE
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // UPLOAD AVATAR
        // --------------------------------------------------------

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
                data.user?.username ||
                    ""
            );

            setBio(
                data.user?.bio ||
                    ""
            );

            setSuccess(
                "Profile picture updated successfully."
            );

            setTimeout(() => {
                setSuccess("");
            }, 3000);
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
                data.user?.username ||
                    ""
            );

            setBio(
                data.user?.bio ||
                    ""
            );

            setSuccess(
                "Profile picture removed successfully."
            );

            setTimeout(() => {
                setSuccess("");
            }, 3000);
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
                data.user?.username ||
                    ""
            );

            setBio(
                data.user?.bio ||
                    ""
            );

            setSuccess(
                "Profile updated successfully."
            );

            setTimeout(() => {
                setSuccess("");
            }, 3000);
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
            <div className="p-6 sm:p-8">
                <div className="animate-pulse">
                    <div
                        className="
                            h-7
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
                            h-4
                            w-64
                            rounded
                        "
                        style={{
                            background:
                                "var(--chat-bg-tertiary)",
                        }}
                    />

                    <div className="mt-8 space-y-5">
                        <div
                            className="
                                h-20
                                rounded-xl
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                h-12
                                rounded-xl
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />

                        <div
                            className="
                                h-32
                                rounded-xl
                            "
                            style={{
                                background:
                                    "var(--chat-bg-tertiary)",
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // ERROR / USER NOT LOADED
    // ============================================================

    if (!user) {
        return (
            <div className="p-6 sm:p-8">
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
                            "var(--chat-danger-border)",
                        background:
                            "var(--chat-danger-bg)",
                        color:
                            "var(--chat-danger)",
                    }}
                >
                    {error ||
                        "Unable to load your profile."}
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
    // MAIN
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
                    border-b
                    px-5
                    py-5
                    sm:px-8
                "
                style={{
                    borderColor:
                        "var(--chat-border)",
                }}
            >
                <h2
                    className="
                        text-lg
                        font-semibold
                    "
                    style={{
                        color:
                            "var(--chat-text-primary)",
                    }}
                >
                    Profile Settings
                </h2>

                <p
                    className="
                        mt-1
                        text-sm
                    "
                    style={{
                        color:
                            "var(--chat-text-secondary)",
                    }}
                >
                    Update your ChatHub profile
                    information.
                </p>
            </div>

            <form
                onSubmit={handleSave}
                className="p-5 sm:p-8"
            >
                {/* =================================================
                    AVATAR
                ================================================= */}

                <div
                    className="
                        rounded-2xl
                        border
                        p-5
                    "
                    style={{
                        background:
                            "var(--chat-bg-primary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div
                        className="
                            flex
                            flex-col
                            gap-5
                            sm:flex-row
                            sm:items-center
                        "
                    >
                        {/* AVATAR */}

                        <div className="relative shrink-0">
                            <div
                                className="
                                    flex
                                    h-20
                                    w-20
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-full
                                    text-2xl
                                    font-semibold
                                    text-white
                                    ring-4
                                "
                                style={{
                                    background:
                                        "var(--chat-accent)",
                                    ringColor:
                                        "var(--chat-bg-secondary)",
                                }}
                            >
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={
                                            user.username ||
                                            "User"
                                        }
                                        className="
                                            h-full
                                            w-full
                                            object-cover
                                        "
                                    />
                                ) : (
                                    user.username
                                        ?.charAt(0)
                                        ?.toUpperCase() ||
                                    "?"
                                )}
                            </div>

                            {/* UPLOAD SPINNER */}

                            {uploadingAvatar && (
                                <div
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
                                            "rgba(0,0,0,0.6)",
                                    }}
                                >
                                    <div
                                        className="
                                            h-7
                                            w-7
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

                            {/* REMOVE SPINNER */}

                            {removingAvatar && (
                                <div
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
                                            "rgba(0,0,0,0.6)",
                                    }}
                                >
                                    <div
                                        className="
                                            h-7
                                            w-7
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

                        {/* AVATAR DETAILS */}

                        <div className="min-w-0 flex-1">
                            <p
                                className="
                                    text-sm
                                    font-medium
                                "
                                style={{
                                    color:
                                        "var(--chat-text-primary)",
                                }}
                            >
                                Profile picture
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
                                Upload a JPG, PNG, WEBP,
                                or GIF image. Maximum
                                file size is 5 MB.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={
                                        handleAvatarChange
                                    }
                                    className="hidden"
                                />

                                {/* =================================================
                                    CHANGE PHOTO
                                    Same style as Remove Photo
                                ================================================= */}

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
                                        rounded-xl
                                        border
                                        px-4
                                        py-2
                                        text-xs
                                        font-semibold
                                        transition
                                        hover:opacity-90
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                    style={{
                                        borderColor:
                                            "var(--chat-border)",
                                        background:
                                            "var(--chat-bg-secondary)",
                                        color:
                                            "var(--chat-text-secondary)",
                                    }}
                                >
                                    {uploadingAvatar
                                        ? "Uploading..."
                                        : "Change Photo"}
                                </button>

                                {/* =================================================
                                    REMOVE PHOTO
                                ================================================= */}

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
                                            py-2
                                            text-xs
                                            font-semibold
                                            transition
                                            hover:opacity-90
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                        style={{
                                            borderColor:
                                                "var(--chat-border)",
                                            background:
                                                "var(--chat-bg-secondary)",
                                            color:
                                                "var(--chat-text-secondary)",
                                        }}
                                    >
                                        {removingAvatar
                                            ? "Removing..."
                                            : "Remove Photo"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* =================================================
                    THEME
                ================================================= */}

                <div
                    className="
                        mt-5
                        rounded-2xl
                        border
                        p-5
                    "
                    style={{
                        background:
                            "var(--chat-bg-primary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div>
                        <p
                            className="
                                text-sm
                                font-medium
                            "
                            style={{
                                color:
                                    "var(--chat-text-primary)",
                            }}
                        >
                            Appearance
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
                            Choose how ChatHub looks
                            on your device.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {/* DARK */}

                        <ThemeButton
                            selected={theme === "dark"}
                            onClick={() =>
                                changeTheme("dark")
                            }
                            icon="🌙"
                            title="Dark"
                            description="Dark appearance"
                        />

                        {/* LIGHT */}

                        <ThemeButton
                            selected={theme === "light"}
                            onClick={() =>
                                changeTheme("light")
                            }
                            icon="☀️"
                            title="Light"
                            description="Light appearance"
                        />

                        {/* SYSTEM */}

                        <ThemeButton
                            selected={theme === "system"}
                            onClick={() =>
                                changeTheme("system")
                            }
                            icon="🖥️"
                            title="System"
                            description="Use device setting"
                        />
                    </div>
                </div>

                {/* =================================================
                    EMAIL
                ================================================= */}

                <div className="mt-5">
                    <label
                        className="
                            mb-2
                            block
                            text-sm
                            font-medium
                        "
                        style={{
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        Email
                    </label>

                    <input
                        type="email"
                        value={
                            user.email || ""
                        }
                        disabled
                        className="
                            h-11
                            w-full
                            rounded-xl
                            border
                            px-4
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

                {/* =================================================
                    USERNAME
                ================================================= */}

                <div className="mt-5">
                    <label
                        className="
                            mb-2
                            block
                            text-sm
                            font-medium
                        "
                        style={{
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        Username
                    </label>

                    <input
                        type="text"
                        value={username}
                        onChange={(event) =>
                            setUsername(
                                event.target.value
                            )
                        }
                        minLength={3}
                        maxLength={30}
                        className="
                            h-11
                            w-full
                            rounded-xl
                            border
                            px-4
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
                        placeholder="Enter username"
                    />

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
                        Username must contain
                        3–30 characters.
                    </p>
                </div>

                {/* =================================================
                    BIO
                ================================================= */}

                <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                        <label
                            className="
                                block
                                text-sm
                                font-medium
                            "
                            style={{
                                color:
                                    "var(--chat-text-secondary)",
                            }}
                        >
                            Bio
                        </label>

                        <span
                            className="text-xs"
                            style={{
                                color:
                                    "var(--chat-text-muted)",
                            }}
                        >
                            {bio.length}/160
                        </span>
                    </div>

                    <textarea
                        value={bio}
                        onChange={(event) =>
                            setBio(
                                event.target.value
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

                {/* =================================================
                    MESSAGES
                ================================================= */}

                {error && (
                    <div
                        className="
                            mt-5
                            rounded-xl
                            border
                            px-4
                            py-3
                            text-sm
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
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        className="
                            mt-5
                            rounded-xl
                            border
                            px-4
                            py-3
                            text-sm
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
                        {success}
                    </div>
                )}

                {/* =================================================
                    SAVE
                ================================================= */}

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="
                            rounded-xl
                            px-5
                            py-2.5
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:opacity-90
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                "var(--chat-accent)",
                        }}
                    >
                        {saving
                            ? "Saving..."
                            : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
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
                rounded-xl
                border
                p-4
                text-left
                transition
                hover:opacity-90
            "
            style={{
                borderColor: selected
                    ? "var(--chat-accent)"
                    : "var(--chat-border)",

                background: selected
                    ? "var(--chat-accent-soft)"
                    : "var(--chat-bg-secondary)",

                color:
                    "var(--chat-text-primary)",
            }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-lg
                        text-lg
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
                        {title}
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
                        {description}
                    </p>
                </div>
            </div>

            {selected && (
                <div
                    className="
                        mt-3
                        text-xs
                        font-medium
                    "
                    style={{
                        color:
                            "var(--chat-accent)",
                    }}
                >
                    ✓ Selected
                </div>
            )}
        </button>
    );
}

