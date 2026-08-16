"use client";

import Image from "next/image";
import { useState } from "react";

// ============================================================
// HARD-CODED FRIEND REQUEST UI CONFIG
// ============================================================

const COLORS = {
    background: "#ffffff",
    backgroundSecondary: "#f8fafc",
    backgroundTertiary: "#f1f5f9",

    border: "#e2e8f0",
    borderHover: "#cbd5e1",

    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",

    accent: "#2563eb",
    accentHover: "#1d4ed8",

    success: "#059669",
    successHover: "#047857",

    danger: "#dc2626",
    dangerBackground: "#fef2f2",

    white: "#ffffff",
    offline: "#94a3b8",
};

const SIZES = {
    avatar: "56px",
    onlineIndicator: "16px",
    borderRadius: "16px",
    buttonRadius: "12px",
    padding: "16px",
};

// ============================================================
// COMPONENT
// ============================================================

export default function FriendRequestCard({
    request,
    onAccepted,
    onRejected,
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ========================================================
    // SAFETY CHECKS
    // ========================================================

    if (!request) {
        return null;
    }

    const sender = request.sender;

    if (!sender) {
        return null;
    }

    // ========================================================
    // HANDLE FRIEND REQUEST
    // ========================================================

    const handleRequest = async (action) => {
        // ----------------------------------------------------
        // Prevent duplicate requests
        // ----------------------------------------------------

        if (loading) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/friends/request/${request.id}/${action}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    cache: "no-store",
                }
            );

            // ------------------------------------------------
            // Read response safely
            // ------------------------------------------------

            const responseText =
                await response.text();

            let data = null;

            try {
                data = responseText
                    ? JSON.parse(responseText)
                    : null;
            } catch (parseError) {
                console.error(
                    "❌ FRIEND REQUEST INVALID JSON:",
                    responseText
                );
            }

            console.log(
                "FRIEND REQUEST RESPONSE:",
                {
                    action,
                    requestId: request.id,
                    status: response.status,
                    ok: response.ok,
                    data,
                }
            );

            // ------------------------------------------------
            // SERVER ERROR
            // ------------------------------------------------

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                        `Failed to ${action} friend request`
                );
            }

            // ------------------------------------------------
            // API SUCCESS CHECK
            // ------------------------------------------------

            if (
                data &&
                data.success === false
            ) {
                throw new Error(
                    data.message ||
                        `Failed to ${action} friend request`
                );
            }

            // ------------------------------------------------
            // ACCEPTED
            // ------------------------------------------------

            if (action === "accept") {
                onAccepted?.(request);
            }

            // ------------------------------------------------
            // REJECTED
            // ------------------------------------------------

            if (action === "reject") {
                onRejected?.(request);
            }
        } catch (error) {
            console.error(
                "❌ FRIEND REQUEST ACTION ERROR:",
                {
                    requestId: request.id,
                    action,
                    error,
                }
            );

            setError(
                error?.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className="
                rounded-2xl
                border
                p-4
                shadow-sm
                transition
            "
            style={{
                background:
                    COLORS.background,
                borderColor:
                    COLORS.border,
                color:
                    COLORS.textPrimary,
            }}
        >
            <div className="flex items-center gap-4">

                {/* ==================================================
                    AVATAR
                ================================================== */}

                <div
                    className="relative shrink-0"
                    style={{
                        width:
                            SIZES.avatar,
                        height:
                            SIZES.avatar,
                    }}
                >
                    {sender.avatar ? (
                        <Image
                            src={sender.avatar}
                            alt={
                                sender.username ||
                                "User"
                            }
                            width={56}
                            height={56}
                            className="
                                h-14
                                w-14
                                rounded-full
                                object-cover
                            "
                        />
                    ) : (
                        <div
                            className="
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-full
                                text-lg
                                font-bold
                            "
                            style={{
                                background:
                                    COLORS.accent,
                                color:
                                    COLORS.white,
                            }}
                        >
                            {sender.username
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "U"}
                        </div>
                    )}

                    {/* ==================================================
                        ONLINE INDICATOR
                    ================================================== */}

                    <span
                        className="
                            absolute
                            bottom-0
                            right-0
                            rounded-full
                            border-2
                        "
                        style={{
                            width:
                                SIZES.onlineIndicator,
                            height:
                                SIZES.onlineIndicator,

                            background:
                                sender.isOnline
                                    ? COLORS.success
                                    : COLORS.offline,

                            borderColor:
                                COLORS.background,
                        }}
                    />
                </div>

                {/* ==================================================
                    USER INFORMATION
                ================================================== */}

                <div className="min-w-0 flex-1">
                    <h3
                        className="
                            truncate
                            text-base
                            font-semibold
                        "
                        style={{
                            color:
                                COLORS.textPrimary,
                        }}
                    >
                        {sender.username}
                    </h3>

                    <p
                        className="
                            truncate
                            text-sm
                        "
                        style={{
                            color:
                                sender.isOnline
                                    ? COLORS.success
                                    : COLORS.textSecondary,
                        }}
                    >
                        {sender.isOnline
                            ? "Online"
                            : "Wants to be your friend"}
                    </p>

                    {sender.bio && (
                        <p
                            className="
                                mt-1
                                truncate
                                text-xs
                            "
                            style={{
                                color:
                                    COLORS.textMuted,
                            }}
                        >
                            {sender.bio}
                        </p>
                    )}
                </div>

                {/* ==================================================
                    ACTIONS
                ================================================== */}

                <div className="flex shrink-0 gap-2">

                    {/* ==================================================
                        ACCEPT
                    ================================================== */}

                    <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                            handleRequest(
                                "accept"
                            )
                        }
                        className="
                            rounded-xl
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-white
                            transition
                            hover:opacity-90
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                COLORS.success,
                        }}
                    >
                        {loading
                            ? "..."
                            : "Accept"}
                    </button>

                    {/* ==================================================
                        REJECT
                    ================================================== */}

                    <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                            handleRequest(
                                "reject"
                            )
                        }
                        className="
                            rounded-xl
                            border
                            px-4
                            py-2
                            text-sm
                            font-medium
                            transition
                            hover:opacity-80
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        style={{
                            background:
                                COLORS.backgroundTertiary,

                            borderColor:
                                COLORS.border,

                            color:
                                COLORS.textPrimary,
                        }}
                    >
                        Reject
                    </button>
                </div>
            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <p
                    className="
                        mt-3
                        rounded-lg
                        px-3
                        py-2
                        text-sm
                    "
                    style={{
                        background:
                            COLORS.dangerBackground,

                        color:
                            COLORS.danger,
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}