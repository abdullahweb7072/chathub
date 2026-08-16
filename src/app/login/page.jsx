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

    const [showPassword, setShowPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [googleLoading, setGoogleLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    // ============================================================
    // NORMAL EMAIL / PASSWORD LOGIN
    // ============================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        const cleanEmail =
            email.trim().toLowerCase();

        // ========================================================
        // VALIDATION
        // ========================================================

        if (!cleanEmail || !password) {
            setError(
                "Email and password are required."
            );

            return;
        }

        // ========================================================
        // LOGIN
        // ========================================================

        try {
            setLoading(true);

            const response =
                await fetch(
                    "/api/auth/login",
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
                            email:
                                cleanEmail,
                            password,
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
                        "Invalid email or password."
                );
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            router.push("/chat");
            router.refresh();
        } catch (error) {
            console.error(
                "LOGIN ERROR:",
                error
            );

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
            await signIn("google", {
                callbackUrl:
                    "/api/auth/google-complete",
            });
        } catch (error) {
            console.error(
                "GOOGLE LOGIN ERROR:",
                error
            );

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
                relative
                flex
                min-h-screen
                items-center
                justify-center
                overflow-hidden
                bg-[#080b14]
                px-4
                py-8
                text-white
            "
        >
            {/* ==================================================
                BACKGROUND
            ================================================== */}

            <div
                className="
                    pointer-events-none
                    absolute
                    inset-0
                    overflow-hidden
                "
            >
                {/* TOP LEFT GLOW */}

                <div
                    className="
                        absolute
                        -left-32
                        -top-32
                        h-[420px]
                        w-[420px]
                        rounded-full
                        bg-blue-600/20
                        blur-[120px]
                    "
                />

                {/* TOP RIGHT GLOW */}

                <div
                    className="
                        absolute
                        -right-32
                        top-20
                        h-[380px]
                        w-[380px]
                        rounded-full
                        bg-violet-600/20
                        blur-[120px]
                    "
                />

                {/* BOTTOM GLOW */}

                <div
                    className="
                        absolute
                        -bottom-40
                        left-1/2
                        h-[420px]
                        w-[520px]
                        -translate-x-1/2
                        rounded-full
                        bg-blue-500/10
                        blur-[130px]
                    "
                />

                {/* GRID */}

                <div
                    className="
                        absolute
                        inset-0
                        opacity-[0.025]
                    "
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
                        backgroundSize:
                            "50px 50px",
                    }}
                />
            </div>

            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <div
                className="
                    relative
                    z-10
                    w-full
                    max-w-[460px]
                "
            >
                {/* ==================================================
                    BRAND
                ================================================== */}

                <div
                    className="
                        mb-8
                        flex
                        flex-col
                        items-center
                        text-center
                    "
                >
                    {/* LOGO */}

                    <div
                        className="
                            relative
                            mb-5
                        "
                    >
                        {/* LOGO GLOW */}

                        <div
                            className="
                                absolute
                                inset-0
                                rounded-[22px]
                                bg-blue-500/40
                                blur-2xl
                            "
                        />

                        {/* LOGO */}

                        <div
                            className="
                                relative
                                h-[76px]
                                w-[76px]
                                overflow-hidden
                                rounded-[22px]
                                border
                                border-white/10
                                bg-[#111827]
                                shadow-[0_20px_50px_rgba(37,99,235,0.3)]
                            "
                        >
                            <Image
                                src="/chathub-icon.png"
                                alt="ChatHub"
                                width={76}
                                height={76}
                                priority
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />
                        </div>
                    </div>

                    {/* TITLE */}

                    <h1
                        className="
                            text-[30px]
                            font-bold
                            tracking-[-0.03em]
                            sm:text-[34px]
                        "
                    >
                        Welcome back
                    </h1>

                    {/* SUBTITLE */}

                    <p
                        className="
                            mt-2
                            max-w-[320px]
                            text-sm
                            leading-6
                            text-slate-400
                        "
                    >
                        Sign in to continue your
                        conversations on{" "}
                        <span className="font-semibold text-slate-300">
                            ChatHub
                        </span>
                    </p>
                </div>

                {/* ==================================================
                    CARD
                ================================================== */}

                <div
                    className="
                        relative
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-white/[0.08]
                        bg-[#111521]/95
                        p-5
                        shadow-[0_30px_90px_rgba(0,0,0,0.45)]
                        backdrop-blur-xl
                        sm:p-7
                    "
                >
                    {/* CARD TOP ACCENT */}

                    <div
                        className="
                            absolute
                            left-1/2
                            top-0
                            h-px
                            w-2/3
                            -translate-x-1/2
                            bg-gradient-to-r
                            from-transparent
                            via-blue-500
                            to-transparent
                            opacity-70
                        "
                    />

                    {/* ==================================================
                        GOOGLE BUTTON
                    ================================================== */}

                    <button
                        type="button"
                        onClick={
                            handleGoogleLogin
                        }
                        disabled={
                            loading ||
                            googleLoading
                        }
                        className="
                            group
                            flex
                            h-[52px]
                            w-full
                            items-center
                            justify-center
                            gap-3
                            rounded-2xl
                            border
                            border-white/[0.09]
                            bg-white/[0.035]
                            px-4
                            text-sm
                            font-semibold
                            text-slate-100
                            transition-all
                            duration-200
                            hover:border-white/[0.15]
                            hover:bg-white/[0.07]
                            hover:shadow-lg
                            active:scale-[0.99]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
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
                                        border-white/20
                                        border-t-white
                                    "
                                />

                                <span>
                                    Connecting to Google...
                                </span>
                            </>
                        ) : (
                            <>
                                <span
                                    className="
                                        flex
                                        h-7
                                        w-7
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-white
                                        shadow-sm
                                        transition-transform
                                        duration-200
                                        group-hover:scale-105
                                    "
                                >
                                    <GoogleIcon />
                                </span>

                                <span>
                                    Continue with Google
                                </span>
                            </>
                        )}
                    </button>

                    {/* ==================================================
                        DIVIDER
                    ================================================== */}

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
                                bg-white/[0.07]
                            "
                        />

                        <span
                            className="
                                rounded-full
                                border
                                border-white/[0.07]
                                bg-white/[0.025]
                                px-3
                                py-1
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.16em]
                                text-slate-500
                            "
                        >
                            Or
                        </span>

                        <div
                            className="
                                h-px
                                flex-1
                                bg-white/[0.07]
                            "
                        />
                    </div>

                    {/* ==================================================
                        LOGIN FORM
                    ================================================== */}

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="space-y-5"
                    >
                        {/* ==================================================
                            ERROR
                        ================================================== */}

                        {error && (
                            <div
                                className="
                                    flex
                                    items-start
                                    gap-3
                                    rounded-2xl
                                    border
                                    border-red-500/20
                                    bg-red-500/[0.08]
                                    px-4
                                    py-3.5
                                    text-sm
                                    text-red-300
                                "
                            >
                                <div
                                    className="
                                        mt-0.5
                                        flex
                                        h-5
                                        w-5
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-red-500/15
                                        text-red-400
                                    "
                                >
                                    <AlertIcon />
                                </div>

                                <p className="leading-5">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* ==================================================
                            EMAIL
                        ================================================== */}

                        <div>
                            <label
                                htmlFor="email"
                                className="
                                    mb-2.5
                                    block
                                    text-[13px]
                                    font-semibold
                                    text-slate-300
                                "
                            >
                                Email address
                            </label>

                            <div className="group relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        z-10
                                        flex
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        text-slate-500
                                        transition-colors
                                        group-focus-within:text-blue-400
                                    "
                                >
                                    <MailIcon />
                                </div>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(
                                        event
                                    ) =>
                                        setEmail(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    className="
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        border-white/[0.08]
                                        bg-black/20
                                        pl-11
                                        pr-4
                                        text-sm
                                        text-white
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-slate-600
                                        hover:border-white/[0.13]
                                        focus:border-blue-500/60
                                        focus:bg-blue-500/[0.025]
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                />
                            </div>
                        </div>

                        {/* ==================================================
                            PASSWORD
                        ================================================== */}

                        <div>
                            <div
                                className="
                                    mb-2.5
                                    flex
                                    items-center
                                    justify-between
                                "
                            >
                                <label
                                    htmlFor="password"
                                    className="
                                        text-[13px]
                                        font-semibold
                                        text-slate-300
                                    "
                                >
                                    Password
                                </label>
                            </div>

                            <div className="group relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        z-10
                                        flex
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        text-slate-500
                                        transition-colors
                                        group-focus-within:text-blue-400
                                    "
                                >
                                    <LockIcon />
                                </div>

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        password
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setPassword(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    className="
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        border-white/[0.08]
                                        bg-black/20
                                        pl-11
                                        pr-12
                                        text-sm
                                        text-white
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-slate-600
                                        hover:border-white/[0.13]
                                        focus:border-blue-500/60
                                        focus:bg-blue-500/[0.025]
                                        focus:ring-4
                                        focus:ring-blue-500/10
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
                                        right-2
                                        top-1/2
                                        flex
                                        h-9
                                        w-9
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-xl
                                        text-slate-500
                                        transition-all
                                        hover:bg-white/[0.06]
                                        hover:text-slate-200
                                        disabled:opacity-40
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

                        {/* ==================================================
                            LOGIN BUTTON
                        ================================================== */}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                googleLoading
                            }
                            className="
                                group
                                relative
                                flex
                                h-[52px]
                                w-full
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-2xl
                                border
                                border-blue-400/20
                                bg-gradient-to-r
                                from-blue-600
                                to-indigo-600
                                px-4
                                text-sm
                                font-bold
                                text-white
                                shadow-[0_10px_30px_rgba(37,99,235,0.22)]
                                transition-all
                                duration-200
                                hover:-translate-y-0.5
                                hover:from-blue-500
                                hover:to-indigo-500
                                hover:shadow-[0_14px_35px_rgba(37,99,235,0.3)]
                                active:translate-y-0
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                                disabled:hover:translate-y-0
                            "
                        >
                            {/* BUTTON SHINE */}

                            <span
                                className="
                                    pointer-events-none
                                    absolute
                                    inset-y-0
                                    -left-20
                                    w-16
                                    rotate-[20deg]
                                    bg-white/20
                                    blur-md
                                    transition-all
                                    duration-700
                                    group-hover:left-[110%]
                                "
                            />

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
                                            border-white/25
                                            border-t-white
                                        "
                                    />

                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <span>
                                        Sign in to ChatHub
                                    </span>

                                    <ArrowIcon />
                                </>
                            )}
                        </button>
                    </form>

                    {/* ==================================================
                        REGISTER
                    ================================================== */}

                    <div
                        className="
                            mt-7
                            border-t
                            border-white/[0.07]
                            pt-6
                            text-center
                        "
                    >
                        <p
                            className="
                                text-sm
                                text-slate-500
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
                                    text-blue-400
                                    transition-colors
                                    hover:text-blue-300
                                    disabled:opacity-50
                                "
                            >
                                Create account
                            </button>
                        </p>
                    </div>
                </div>

                {/* ==================================================
                    TRUST / FOOTER
                ================================================== */}

                <div
                    className="
                        mt-6
                        flex
                        items-center
                        justify-center
                        gap-2
                        text-center
                    "
                >
                    <div
                        className="
                            flex
                            h-5
                            w-5
                            items-center
                            justify-center
                            rounded-full
                            bg-emerald-500/10
                            text-emerald-400
                        "
                    >
                        <ShieldIcon />
                    </div>

                    <p
                        className="
                            text-[11px]
                            font-medium
                            text-slate-600
                        "
                    >
                        Secure authentication · ChatHub
                    </p>
                </div>
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
            className="h-4 w-4"
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
// MAIL ICON
// ================================================================

function MailIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-[18px] w-[18px]"
        >
            <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3 7 9 6 9-6"
            />
        </svg>
    );
}

// ================================================================
// LOCK ICON
// ================================================================

function LockIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-[18px] w-[18px]"
        >
            <rect
                x="4"
                y="10"
                width="16"
                height="11"
                rx="2"
            />

            <path
                strokeLinecap="round"
                d="M8 10V7a4 4 0 0 1 8 0v3"
            />

            <circle
                cx="12"
                cy="15.5"
                r="1"
                fill="currentColor"
                stroke="none"
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

// ================================================================
// ARROW ICON
// ================================================================

function ArrowIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="
                ml-1
                h-4
                w-4
                transition-transform
                duration-200
                group-hover:translate-x-1
            "
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m13 6 6 6-6 6"
            />
        </svg>
    );
}

// ================================================================
// ALERT ICON
// ================================================================

function AlertIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5"
        >
            <path
                strokeLinecap="round"
                d="M12 7v5"
            />

            <path
                strokeLinecap="round"
                d="M12 16h.01"
            />
        </svg>
    );
}

// ================================================================
// SHIELD ICON
// ================================================================

function ShieldIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3 w-3"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 12 2 2 4-4"
            />
        </svg>
    );
}