
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CompleteGoogleProfilePage() {
    const router = useRouter();

    const {
        data: session,
        status,
        update,
    } = useSession();

    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ============================================================
    // AUTH CHECK
    // ============================================================

    useEffect(() => {
        if (status === "loading") {
            return;
        }

        if (status === "unauthenticated") {
            router.replace("/login");
            return;
        }

        // Existing account already has a proper username.
        if (
            status === "authenticated" &&
            session?.user?.username &&
            !session.user.needsUsername
        ) {
            router.replace("/chat");
        }
    }, [status, session, router]);

    // ============================================================
    // USERNAME VALIDATION
    // ============================================================

    function validateUsername(value) {
        const cleanUsername = value.trim();

        if (!cleanUsername) {
            return "Username is required.";
        }

        if (cleanUsername.length < 7) {
            return "Username must contain at least 7 characters.";
        }

        if (cleanUsername.length > 30) {
            return "Username cannot exceed 30 characters.";
        }

        // Same rule as your normal registration page.
        const specialCharacterRegex =
            /[^a-zA-Z0-9\s]/;

        if (
            !specialCharacterRegex.test(
                cleanUsername
            )
        ) {
            return "Username must contain at least one special character.";
        }

        return "";
    }

    // ============================================================
    // CHECK USERNAME AVAILABILITY
    // ============================================================

    async function checkUsername(value) {
        const cleanUsername = value.trim();

        setError("");
        setSuccess("");

        const validationError =
            validateUsername(cleanUsername);

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setChecking(true);

            const response =
                await fetch(
                    `/api/auth/check-username?username=${encodeURIComponent(
                        cleanUsername
                    )}`,
                    {
                        method: "GET",
                        credentials: "include",
                        headers: {
                            Accept:
                                "application/json",
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        "Unable to check username."
                );
            }

            if (!data.available) {
                setError(
                    "This username is already taken."
                );
                return;
            }

            setSuccess(
                "Username is available."
            );
        } catch (error) {
            console.error(
                "USERNAME CHECK ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Unable to check username."
            );
        } finally {
            setChecking(false);
        }
    }

    // ============================================================
    // SAVE USERNAME
    // ============================================================

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanUsername =
            username.trim();

        const validationError =
            validateUsername(cleanUsername);

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);

            const response =
                await fetch(
                    "/api/auth/google-profile",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json",
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            username:
                                cleanUsername,
                        }),
                    }
                );

            const data =
                await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        "Unable to save username."
                );
            }

            setSuccess(
                "Username saved successfully. Redirecting..."
            );

            /*
             * Refresh the NextAuth session so that:
             *
             * session.user.username
             *
             * and
             *
             * session.user.needsUsername
             *
             * contain the new values.
             */

            await update();

            setTimeout(() => {
                router.replace("/chat");
                router.refresh();
            }, 500);
        } catch (error) {
            console.error(
                "GOOGLE PROFILE ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Unable to save your username."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // LOADING
    // ============================================================

    if (
        status === "loading" ||
        !session?.user
    ) {
        return (
            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-background
                    text-foreground
                "
            >
                <div
                    className="
                        h-8
                        w-8
                        animate-spin
                        rounded-full
                        border-2
                        border-border
                        border-t-blue-500
                    "
                />
            </main>
        );
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <main
            className="
                flex
                min-h-screen
                items-center
                justify-center
                bg-background
                px-4
                py-8
                text-foreground
            "
        >
            {/* ====================================================
                BACKGROUND
            ==================================================== */}

            <div
                className="
                    pointer-events-none
                    fixed
                    inset-0
                    overflow-hidden
                "
            >
                <div
                    className="
                        absolute
                        left-1/2
                        top-[-180px]
                        h-[400px]
                        w-[400px]
                        -translate-x-1/2
                        rounded-full
                        bg-blue-500/10
                        blur-3xl
                    "
                />

                <div
                    className="
                        absolute
                        bottom-[-200px]
                        right-[-100px]
                        h-[400px]
                        w-[400px]
                        rounded-full
                        bg-purple-500/10
                        blur-3xl
                    "
                />
            </div>

            {/* ====================================================
                CARD
            ==================================================== */}

            <div
                className="
                    relative
                    z-10
                    w-full
                    max-w-md
                "
            >
                <div
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-border
                        bg-surface
                        shadow-2xl
                    "
                >
                    {/* =================================================
                        HEADER
                    ================================================= */}

                    <div
                        className="
                            px-6
                            pb-5
                            pt-8
                            text-center
                            sm:px-8
                        "
                    >
                        {/* LOGO */}

                        <div
                            className="
                                mx-auto
                                mb-5
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-2xl
                                bg-blue-600
                                text-xl
                                font-bold
                                text-white
                                shadow-lg
                                shadow-blue-600/20
                            "
                        >
                            C
                        </div>

                        <h1
                            className="
                                text-2xl
                                font-bold
                                tracking-tight
                            "
                        >
                            Choose your username
                        </h1>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-muted
                            "
                        >
                            One last step before
                            you start using ChatHub.
                        </p>
                    </div>

                    {/* =================================================
                        FORM
                    ================================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="
                            space-y-5
                            px-6
                            pb-8
                            sm:px-8
                        "
                    >
                        {/* ACCOUNT */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-border
                                bg-background
                                px-4
                                py-3
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    text-muted
                                "
                            >
                                Signed in as
                            </p>

                            <p
                                className="
                                    mt-1
                                    truncate
                                    text-sm
                                    font-medium
                                "
                            >
                                {session.user.email}
                            </p>
                        </div>

                        {/* ERROR */}

                        {error && (
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-red-500/30
                                    bg-red-500/10
                                    px-4
                                    py-3
                                    text-sm
                                    text-red-500
                                "
                            >
                                {error}
                            </div>
                        )}

                        {/* SUCCESS */}

                        {success && (
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-green-500/30
                                    bg-green-500/10
                                    px-4
                                    py-3
                                    text-sm
                                    text-green-500
                                "
                            >
                                {success}
                            </div>
                        )}

                        {/* USERNAME */}

                        <div>
                            <label
                                htmlFor="username"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                "
                            >
                                Username
                            </label>

                            <div
                                className="
                                    flex
                                    gap-2
                                "
                            >
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(event) => {
                                        setUsername(
                                            event.target
                                                .value
                                        );

                                        setError("");
                                        setSuccess("");
                                    }}
                                    disabled={
                                        loading ||
                                        checking
                                    }
                                    maxLength={30}
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="Choose your username"
                                    className="
                                        h-12
                                        min-w-0
                                        flex-1
                                        rounded-xl
                                        border
                                        border-border
                                        bg-background
                                        px-4
                                        text-sm
                                        text-foreground
                                        outline-none
                                        transition
                                        placeholder:text-muted
                                        focus:border-blue-500
                                        focus:ring-2
                                        focus:ring-blue-500/20
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        checkUsername(
                                            username
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        checking ||
                                        !username.trim()
                                    }
                                    className="
                                        h-12
                                        shrink-0
                                        rounded-xl
                                        border
                                        border-border
                                        bg-background
                                        px-4
                                        text-sm
                                        font-semibold
                                        transition
                                        hover:bg-hover
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    {checking
                                        ? "Checking..."
                                        : "Check"}
                                </button>
                            </div>

                            <div
                                className="
                                    mt-1.5
                                    flex
                                    justify-between
                                    text-xs
                                    text-muted
                                "
                            >
                                <span>
                                    7–30 characters +
                                    special character
                                </span>

                                <span>
                                    {username.length}/30
                                </span>
                            </div>
                        </div>

                        {/* SUBMIT */}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                checking
                            }
                            className="
                                flex
                                h-12
                                w-full
                                items-center
                                justify-center
                                rounded-xl
                                border
                                border-blue-500
                                bg-blue-600
                                px-5
                                text-sm
                                font-semibold
                                text-white
                                shadow-lg
                                shadow-blue-600/20
                                transition
                                hover:bg-blue-700
                                hover:shadow-blue-600/30
                                active:scale-[0.99]
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {loading ? (
                                <>
                                    <span
                                        className="
                                            mr-2
                                            h-4
                                            w-4
                                            animate-spin
                                            rounded-full
                                            border-2
                                            border-white/30
                                            border-t-white
                                        "
                                    />

                                    Saving username...
                                </>
                            ) : (
                                "Continue to ChatHub"
                            )}
                        </button>

                        {/* INFO */}

                        <p
                            className="
                                text-center
                                text-xs
                                leading-relaxed
                                text-muted
                            "
                        >
                            Your username will be used
                            by other ChatHub users to
                            identify and find you.
                        </p>
                    </form>
                </div>

                {/* FOOTER */}

                <p
                    className="
                        mt-5
                        text-center
                        text-xs
                        text-muted
                    "
                >
                    ChatHub · Connect. Chat. Stay connected.
                </p>
            </div>
        </main>
    );
}

