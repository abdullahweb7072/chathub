"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const router = useRouter();

    // ============================================================
    // STATE
    // ============================================================

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ============================================================
    // REGISTER WITH EMAIL + PASSWORD
    // ============================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        // ========================================================
        // REQUIRED FIELDS
        // ========================================================

        if (
            !cleanUsername ||
            !cleanEmail ||
            !password ||
            !confirmPassword
        ) {
            setError("Please fill in all fields.");
            return;
        }

        // ========================================================
        // USERNAME VALIDATION
        // ========================================================

        if (cleanUsername.length < 7) {
            setError(
                "Username must contain at least 7 characters."
            );
            return;
        }

        if (cleanUsername.length > 30) {
            setError(
                "Username cannot exceed 30 characters."
            );
            return;
        }

        // At least one special character
        const specialCharacterRegex = /[^a-zA-Z0-9\s]/;

        if (!specialCharacterRegex.test(cleanUsername)) {
            setError(
                "Username must contain at least one special character."
            );
            return;
        }

        // ========================================================
        // EMAIL VALIDATION
        // ========================================================

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        // ========================================================
        // PASSWORD VALIDATION
        // ========================================================

        if (password.length < 6) {
            setError(
                "Password must contain at least 6 characters."
            );
            return;
        }

        // ========================================================
        // CONFIRM PASSWORD
        // ========================================================

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        // ========================================================
        // API REQUEST
        // ========================================================

        try {
            setLoading(true);

            const response = await fetch("/api/auth/register", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },

                credentials: "include",

                body: JSON.stringify({
                    username: cleanUsername,
                    email: cleanEmail,
                    password,
                }),
            });

            // ====================================================
            // SAFELY READ RESPONSE
            // ====================================================

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            // ====================================================
            // API ERROR
            // ====================================================

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        data?.error ||
                        "Registration failed."
                );
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            setSuccess(
                "Verification code sent to your email. Redirecting..."
            );

            // ====================================================
            // REDIRECT TO VERIFY EMAIL
            // ====================================================

            setTimeout(() => {
                router.push(
                    `/verify-email?email=${encodeURIComponent(
                        cleanEmail
                    )}`
                );
            }, 800);
        } catch (error) {
            console.error("REGISTER ERROR:", error);

            setError(
                error?.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // CONTINUE WITH GOOGLE
    // ============================================================

    const handleGoogleSignup = async () => {
        setError("");
        setSuccess("");
        setGoogleLoading(true);

        try {
            /*
             * Google signup flow:
             *
             * New Google users are sent to:
             *
             * /complete-signup
             *
             * Existing Google users can continue through
             * the normal authentication flow.
             */

            await signIn("google", {
                callbackUrl: "/complete-signup",
            });
        } catch (error) {
            console.error("GOOGLE SIGNUP ERROR:", error);

            setGoogleLoading(false);

            setError(
                error?.message ||
                    "Unable to continue with Google."
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
                REGISTER CONTAINER
            ==================================================== */}

            <div
                className="
                    relative
                    z-10
                    w-full
                    max-w-md
                "
            >
                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="mb-7 text-center">
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
                        Create your account
                    </h1>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-muted
                        "
                    >
                        Join ChatHub and start connecting
                        with people.
                    </p>
                </div>

                {/* =================================================
                    CARD
                ================================================= */}

                <div
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-border
                        bg-surface
                        shadow-xl
                    "
                >
                    <form
                        onSubmit={handleSubmit}
                        className="
                            space-y-5
                            p-6
                            sm:p-8
                        "
                    >
                        {/* ==========================================
                            ERROR
                        ========================================== */}

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

                        {/* ==========================================
                            SUCCESS
                        ========================================== */}

                        {success && (
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-green-500/20
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

                        {/* ==========================================
                            GOOGLE
                        ========================================== */}

                        <button
                            type="button"
                            onClick={handleGoogleSignup}
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

                        {/* ==========================================
                            DIVIDER
                        ========================================== */}

                        <div
                            className="
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

                        {/* ==========================================
                            USERNAME
                        ========================================== */}

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
                                onChange={(event) =>
                                    setUsername(
                                        event.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                maxLength={30}
                                autoComplete="username"
                                placeholder="Enter your username"
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

                        {/* ==========================================
                            EMAIL
                        ========================================== */}

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
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                autoComplete="email"
                                placeholder="you@example.com"
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

                        {/* ==========================================
                            PASSWORD
                        ========================================== */}

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
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    autoComplete="new-password"
                                    placeholder="Create a password"
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
                                            (value) =>
                                                !value
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

                            <p
                                className="
                                    mt-1.5
                                    text-xs
                                    text-muted
                                "
                            >
                                Minimum 6 characters
                            </p>
                        </div>

                        {/* ==========================================
                            CONFIRM PASSWORD
                        ========================================== */}

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                "
                            >
                                Confirm Password
                            </label>

                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    autoComplete="new-password"
                                    placeholder="Confirm your password"
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
                                        setShowConfirmPassword(
                                            (value) =>
                                                !value
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
                                        showConfirmPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ==========================================
                            REGISTER BUTTON
                        ========================================== */}

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

                                    Sending verification code...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>

                        {/* ==========================================
                            LOGIN
                        ========================================== */}

                        <div
                            className="
                                border-t
                                border-border
                                pt-5
                                text-center
                            "
                        >
                            <p
                                className="
                                    text-sm
                                    text-muted
                                "
                            >
                                Already have an account?{" "}

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/login"
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
                                        hover:underline
                                        disabled:opacity-50
                                    "
                                >
                                    Sign in
                                </button>
                            </p>
                        </div>
                    </form>
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