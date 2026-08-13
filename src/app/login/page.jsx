
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const router = useRouter();

    // ============================================================
    // STATE
    // ============================================================

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const [error, setError] = useState("");

    // ============================================================
    // NORMAL EMAIL / PASSWORD LOGIN
    // ============================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        const cleanEmail = email.trim().toLowerCase();

        // ========================================================
        // VALIDATION
        // ========================================================

        if (!cleanEmail || !password) {
            setError("Email and password are required.");
            return;
        }

        // ========================================================
        // LOGIN
        // ========================================================

        try {
            setLoading(true);

            const response = await fetch("/api/auth/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },

                credentials: "include",

                body: JSON.stringify({
                    email: cleanEmail,
                    password,
                }),
            });

            const data = await response.json();

            // ====================================================
            // API ERROR
            // ====================================================

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        "Invalid email or password."
                );
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            router.push("/chat");
            router.refresh();
        } catch (error) {
            console.error("LOGIN ERROR:", error);

            setError(
                error?.message ||
                    "Unable to login. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // GOOGLE LOGIN
    // ============================================================

    const handleGoogleLogin = async () => {
        setError("");
        setGoogleLoading(true);

        try {
            /*
             * IMPORTANT
             * ------------------------------------------------------
             *
             * Do NOT send Google directly to /chat.
             *
             * The flow is:
             *
             * Google
             *   ↓
             * Auth.js
             *   ↓
             * /api/auth/google-complete
             *   ↓
             * Existing user:
             *      create ChatHub "Token" cookie
             *      → /chat
             *
             * New Google user:
             *      → /complete-signup
             *      → choose username
             *      → create ChatHub "Token" cookie
             *      → /chat
             *
             * Auth.js cookies such as:
             *
             * authjs.session-token
             * authjs.csrf-token
             * authjs.callback-url
             *
             * are still expected.
             *
             * Your application additionally gets:
             *
             * Token
             *
             * which is the JWT used by your existing
             * ChatHub API/socket authentication.
             */

            await signIn("google", {
                callbackUrl: "/api/auth/google-complete",
            });
        } catch (error) {
            console.error("GOOGLE LOGIN ERROR:", error);

            setGoogleLoading(false);

            setError(
                "Unable to sign in with Google. Please try again."
            );
        }
    };

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
            <div className="w-full max-w-md">

                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="mb-8 text-center">

                    {/* ChatHub Logo */}

                    <div
                        className="
                            mx-auto
                            mb-5
                            h-16
                            w-16
                            overflow-hidden
                            rounded-2xl
                            bg-blue-600
                            shadow-lg
                            shadow-blue-600/20
                        "
                    >
                        <Image
                            src="/chathub-icon.png"
                            alt="ChatHub"
                            width={64}
                            height={64}
                            priority
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <h1
                        className="
                            text-3xl
                            font-bold
                            tracking-tight
                        "
                    >
                        Welcome back
                    </h1>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-muted
                        "
                    >
                        Sign in to continue to ChatHub
                    </p>
                </div>

                {/* =================================================
                    CARD
                ================================================= */}

                <div
                    className="
                        rounded-3xl
                        border
                        border-border
                        bg-surface
                        p-6
                        shadow-xl
                        sm:p-8
                    "
                >

                    {/* =================================================
                        GOOGLE BUTTON
                    ================================================= */}

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={
                            loading ||
                            googleLoading
                        }
                        className="
                            flex
                            h-12
                            w-full
                            items-center
                            justify-center
                            gap-3
                            rounded-xl
                            border
                            border-border
                            bg-background
                            px-4
                            text-sm
                            font-semibold
                            text-foreground
                            shadow-sm
                            transition
                            hover:bg-hover
                            active:scale-[0.99]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {googleLoading ? (
                            <>
                                <span
                                    className="
                                        h-4
                                        w-4
                                        animate-spin
                                        rounded-full
                                        border-2
                                        border-muted/30
                                        border-t-foreground
                                    "
                                />

                                Connecting to Google...
                            </>
                        ) : (
                            <>
                                <GoogleIcon />

                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* =================================================
                        DIVIDER
                    ================================================= */}

                    <div
                        className="
                            my-6
                            flex
                            items-center
                            gap-4
                        "
                    >
                        <div
                            className="
                                h-px
                                flex-1
                                bg-border
                            "
                        />

                        <span
                            className="
                                text-xs
                                font-medium
                                uppercase
                                tracking-wider
                                text-muted
                            "
                        >
                            Or
                        </span>

                        <div
                            className="
                                h-px
                                flex-1
                                bg-border
                            "
                        />
                    </div>

                    {/* =================================================
                        LOGIN FORM
                    ================================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >

                        {/* =================================================
                            ERROR
                        ================================================= */}

                        {error && (
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-red-500/20
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

                        {/* =================================================
                            EMAIL
                        ================================================= */}

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
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                placeholder="you@example.com"
                                autoComplete="email"
                                disabled={
                                    loading ||
                                    googleLoading
                                }
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
                        </div>

                        {/* =================================================
                            PASSWORD
                        ================================================= */}

                        <div>
                            <label
                                htmlFor="password"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                "
                            >
                                Password
                            </label>

                            <div className="relative">

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    className="
                                        h-12
                                        w-full
                                        rounded-xl
                                        border
                                        border-border
                                        bg-background
                                        px-4
                                        pr-12
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
                                        setShowPassword(
                                            (value) => !value
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        flex
                                        h-8
                                        w-8
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-lg
                                        text-muted
                                        transition
                                        hover:bg-hover
                                        hover:text-foreground
                                    "
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* =================================================
                            LOGIN BUTTON
                        ================================================= */}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                googleLoading
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
                                px-4
                                text-sm
                                font-semibold
                                text-white
                                shadow-sm
                                transition
                                hover:bg-blue-700
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

                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* =================================================
                        REGISTER
                    ================================================= */}

                    <div
                        className="
                            mt-6
                            border-t
                            border-border
                            pt-6
                            text-center
                        "
                    >
                        <p
                            className="
                                text-sm
                                text-muted
                            "
                        >
                            Don't have an account?{" "}

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(
                                        "/register"
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                className="
                                    font-semibold
                                    text-blue-500
                                    transition
                                    hover:text-blue-400
                                    disabled:opacity-50
                                "
                            >
                                Create account
                            </button>
                        </p>
                    </div>
                </div>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <p
                    className="
                        mt-6
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

// ================================================================
// GOOGLE ICON
// ================================================================

function GoogleIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-5 w-5"
        >
            <path
                fill="#4285F4"
                d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
            />

            <path
                fill="#34A853"
                d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z"
            />

            <path
                fill="#FBBC05"
                d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z"
            />

            <path
                fill="#EA4335"
                d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.23 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z"
            />
        </svg>
    );
}

// ================================================================
// EYE ICON
// ================================================================

function EyeIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
            />

            <circle
                cx="12"
                cy="12"
                r="3"
            />
        </svg>
    );
}

// ================================================================
// EYE OFF ICON
// ================================================================

function EyeOffIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 8a11.6 11.6 0 0 1-2.1 4.2"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.6 6.6C4.4 8 3.1 10.2 2.5 12c1 4 4.5 8 9.5 8 1 0 2-.2 2.9-.5"
            />
        </svg>
    );
}

