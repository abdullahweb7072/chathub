
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteSignupPage() {
    const router = useRouter();

    // ============================================================
    // STATE
    // ============================================================

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ============================================================
    // LOAD GOOGLE USER
    // ============================================================

    useEffect(() => {
        let cancelled = false;

        async function loadUser() {
            try {
                setLoading(true);
                setError("");

                // ====================================================
                // GET CURRENT GOOGLE/CHATHUB USER
                // ====================================================

                const response = await fetch(
                    "/api/auth/google-token",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                    }
                );

                const data = await response.json();

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Unable to load your account."
                    );
                }

                if (cancelled) {
                    return;
                }

                // ====================================================
                // USER ALREADY COMPLETED SIGNUP
                // ====================================================

                if (
                    !data?.user?.needsUsername &&
                    data?.user?.username &&
                    !data.user.username.startsWith(
                        "__google_"
                    )
                ) {
                    router.replace("/chat");
                    return;
                }

                // ====================================================
                // SET GOOGLE EMAIL
                // ====================================================

                setEmail(
                    data?.user?.email || ""
                );
            } catch (error) {
                console.error(
                    "COMPLETE SIGNUP LOAD ERROR:",
                    error
                );

                if (!cancelled) {
                    setError(
                        error?.message ||
                            "Unable to load your account."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadUser();

        return () => {
            cancelled = true;
        };
    }, [router]);

    // ============================================================
    // USERNAME VALIDATION
    // ============================================================

    function validateUsername(value) {
        const cleanUsername =
            value.trim();

        // --------------------------------------------------------
        // REQUIRED
        // --------------------------------------------------------

        if (!cleanUsername) {
            return "Please enter a username.";
        }

        // --------------------------------------------------------
        // MINIMUM LENGTH
        // --------------------------------------------------------

        if (cleanUsername.length < 7) {
            return "Username must contain at least 7 characters.";
        }

        // --------------------------------------------------------
        // MAXIMUM LENGTH
        // --------------------------------------------------------

        if (cleanUsername.length > 30) {
            return "Username cannot exceed 30 characters.";
        }

        // --------------------------------------------------------
        // SPECIAL CHARACTER
        // --------------------------------------------------------

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
    // SUBMIT
    // ============================================================

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanUsername =
            username.trim();

        // ========================================================
        // VALIDATE USERNAME
        // ========================================================

        const validationError =
            validateUsername(
                cleanUsername
            );

        if (validationError) {
            setError(validationError);
            return;
        }

        // ========================================================
        // API REQUEST
        // ========================================================

        try {
            setSaving(true);

            const response =
                await fetch(
                    "/api/auth/complete-signup",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json",
                        },

                        credentials:
                            "include",

                        body: JSON.stringify({
                            username:
                                cleanUsername,
                        }),
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
                    data?.message ||
                        "Unable to complete signup."
                );
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            setSuccess(
                "Username saved successfully. Redirecting..."
            );

            // ====================================================
            // IMPORTANT
            // ====================================================
            //
            // The API has already:
            //
            // 1. Saved the username
            // 2. Created a new ChatHub JWT
            // 3. Set the "Token" HTTP-only cookie
            //
            // We intentionally DO NOT:
            //
            // - save the token in localStorage
            // - save the token in sessionStorage
            // - put the token into React state
            //
            // The browser will automatically keep the
            // HTTP-only cookie.
            //
            // ====================================================

            setTimeout(() => {
                router.replace("/chat");
                router.refresh();
            }, 700);
        } catch (error) {
            console.error(
                "COMPLETE SIGNUP ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setSaving(false);
        }
    }

    // ============================================================
    // LOADING SCREEN
    // ============================================================

    if (loading) {
        return (
            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-background
                    px-4
                    text-foreground
                "
            >
                <div className="text-center">
                    <div
                        className="
                            mx-auto
                            mb-4
                            h-8
                            w-8
                            animate-spin
                            rounded-full
                            border-2
                            border-border
                            border-t-blue-500
                        "
                    />

                    <h1 className="text-lg font-semibold">
                        Preparing your account...
                    </h1>

                    <p className="mt-2 text-sm text-muted">
                        Please wait a moment.
                    </p>
                </div>
            </main>
        );
    }

    // ============================================================
    // ERROR SCREEN
    // ============================================================

    if (error && !email) {
        return (
            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-background
                    px-4
                    text-foreground
                "
            >
                <div
                    className="
                        w-full
                        max-w-md
                        rounded-3xl
                        border
                        border-border
                        bg-surface
                        p-8
                        text-center
                        shadow-2xl
                    "
                >
                    {/* ERROR ICON */}

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
                            bg-red-500/10
                            text-xl
                            font-bold
                            text-red-500
                        "
                    >
                        !
                    </div>

                    <h1 className="text-xl font-bold">
                        Unable to continue
                    </h1>

                    <p className="mt-3 text-sm text-red-500">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.replace(
                                "/login"
                            )
                        }
                        className="
                            mt-6
                            h-11
                            w-full
                            rounded-xl
                            bg-blue-600
                            px-5
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-blue-700
                        "
                    >
                        Back to Login
                    </button>
                </div>
            </main>
        );
    }

    // ============================================================
    // MAIN PAGE
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
                BACKGROUND DECORATION
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
                            you enter ChatHub.
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
                            px-6
                            pb-8
                            sm:px-8
                        "
                    >
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

                        {/* EMAIL */}

                        <div>
                            <label
                                htmlFor="email"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                "
                            >
                                Google Account
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                disabled
                                className="
                                    h-12
                                    w-full
                                    rounded-xl
                                    border
                                    border-border
                                    bg-background
                                    px-4
                                    text-sm
                                    text-muted
                                    outline-none
                                    disabled:cursor-not-allowed
                                    disabled:opacity-70
                                "
                            />

                            <p
                                className="
                                    mt-1.5
                                    text-xs
                                    text-muted
                                "
                            >
                                Your Google email is
                                already connected to
                                this account.
                            </p>
                        </div>

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

                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(event) => {
                                    setUsername(
                                        event.target
                                            .value
                                    );

                                    if (error) {
                                        setError("");
                                    }

                                    if (success) {
                                        setSuccess("");
                                    }
                                }}
                                disabled={saving}
                                maxLength={30}
                                autoComplete="username"
                                autoFocus
                                placeholder="Choose your username"
                                className="
                                    h-12
                                    w-full
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

                        {/* CONTINUE BUTTON */}

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                !username.trim()
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
                            {saving ? (
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
                                text-muted
                            "
                        >
                            Your username will be
                            visible to other ChatHub
                            users.
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
                    Welcome to ChatHub.
                </p>
            </div>
        </main>
    );
}

