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
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

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

        if (
            !cleanUsername ||
            !cleanEmail ||
            !password ||
            !confirmPassword
        ) {
            setError("Please fill in all fields.");
            return;
        }

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

        const specialCharacterRegex = /[^a-zA-Z0-9\s]/;

        if (!specialCharacterRegex.test(cleanUsername)) {
            setError(
                "Username must contain at least one special character."
            );
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            setError(
                "Password must contain at least 6 characters."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

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

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        data?.error ||
                        "Registration failed."
                );
            }

            setSuccess(
                "Verification code sent to your email. Redirecting..."
            );

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
    // GOOGLE SIGNUP
    // ============================================================

    const handleGoogleSignup = async () => {
        setError("");
        setSuccess("");
        setGoogleLoading(true);

        try {
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
    // PASSWORD STRENGTH
    // ============================================================

    const passwordStrength =
        password.length === 0
            ? 0
            : password.length < 6
            ? 1
            : password.length < 10
            ? 2
            : /[A-Z]/.test(password) &&
              /[0-9]/.test(password) &&
              /[^a-zA-Z0-9]/.test(password)
            ? 4
            : 3;

    const passwordStrengthText =
        passwordStrength === 0
            ? ""
            : passwordStrength === 1
            ? "Weak"
            : passwordStrength === 2
            ? "Fair"
            : passwordStrength === 3
            ? "Good"
            : "Strong";

    // ============================================================
    // DISABLED
    // ============================================================

    const disabled = loading || googleLoading;

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
                bg-background
                px-4
                py-10
                text-foreground
                sm:px-6
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
                {/* Top glow */}

                <div
                    className="
                        absolute
                        left-1/2
                        top-[-220px]
                        h-[500px]
                        w-[500px]
                        -translate-x-1/2
                        rounded-full
                        bg-blue-600/10
                        blur-[110px]
                    "
                />

                {/* Bottom right */}

                <div
                    className="
                        absolute
                        bottom-[-220px]
                        right-[-160px]
                        h-[500px]
                        w-[500px]
                        rounded-full
                        bg-violet-600/10
                        blur-[110px]
                    "
                />

                {/* Bottom left */}

                <div
                    className="
                        absolute
                        bottom-[-180px]
                        left-[-160px]
                        h-[400px]
                        w-[400px]
                        rounded-full
                        bg-cyan-500/5
                        blur-[100px]
                    "
                />

                {/* Subtle grid */}

                <div
                    className="
                        absolute
                        inset-0
                        opacity-[0.025]
                    "
                    style={{
                        backgroundImage:
                            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            {/* ====================================================
                MAIN CONTAINER
            ==================================================== */}

            <div
                className="
                    relative
                    z-10
                    w-full
                    max-w-[470px]
                "
            >
                {/* =================================================
                    BRAND
                ================================================= */}

                <div className="mb-7 text-center">
                    {/* Logo */}

                    <div
                        className="
                            relative
                            mx-auto
                            mb-5
                            h-[72px]
                            w-[72px]
                        "
                    >
                        <div
                            className="
                                absolute
                                -inset-1
                                rounded-[22px]
                                bg-blue-500/20
                                blur-lg
                            "
                        />

                        <div
                            className="
                                relative
                                h-full
                                w-full
                                overflow-hidden
                                rounded-[20px]
                                border
                                border-white/10
                                bg-blue-600
                                shadow-2xl
                                shadow-blue-600/25
                            "
                        >
                            <Image
                                src="/chathub-icon.png"
                                alt="ChatHub"
                                width={72}
                                height={72}
                                priority
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />
                        </div>
                    </div>

                    {/* Heading */}

                    <h1
                        className="
                            text-[30px]
                            font-extrabold
                            tracking-[-0.03em]
                            sm:text-3xl
                        "
                    >
                        Create your account
                    </h1>

                    <p
                        className="
                            mx-auto
                            mt-2
                            max-w-sm
                            text-sm
                            leading-6
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
                        rounded-[28px]
                        border
                        border-border
                        bg-surface
                        shadow-[0_25px_70px_rgba(0,0,0,0.18)]
                    "
                >
                    {/* Top accent */}

                    <div
                        className="
                            h-1
                            w-full
                            bg-gradient-to-r
                            from-blue-600
                            via-violet-500
                            to-cyan-500
                        "
                    />

                    <form
                        onSubmit={handleSubmit}
                        className="
                            p-6
                            sm:p-8
                        "
                    >
                        {/* =================================================
                            ERROR
                        ================================================= */}

                        {error && (
                            <div
                                className="
                                    mb-5
                                    flex
                                    items-start
                                    gap-3
                                    rounded-2xl
                                    border
                                    border-red-500/20
                                    bg-red-500/10
                                    px-4
                                    py-3
                                    text-sm
                                    text-red-500
                                "
                            >
                                <div className="mt-0.5 shrink-0">
                                    <AlertIcon />
                                </div>

                                <p className="leading-5">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* =================================================
                            SUCCESS
                        ================================================= */}

                        {success && (
                            <div
                                className="
                                    mb-5
                                    flex
                                    items-start
                                    gap-3
                                    rounded-2xl
                                    border
                                    border-emerald-500/20
                                    bg-emerald-500/10
                                    px-4
                                    py-3
                                    text-sm
                                    text-emerald-500
                                "
                            >
                                <div className="mt-0.5 shrink-0">
                                    <CheckIcon />
                                </div>

                                <p className="leading-5">
                                    {success}
                                </p>
                            </div>
                        )}

                        {/* =================================================
                            GOOGLE
                        ================================================= */}

                        <button
                            type="button"
                            onClick={handleGoogleSignup}
                            disabled={disabled}
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
                                border-border
                                bg-background
                                px-4
                                text-sm
                                font-semibold
                                text-foreground
                                shadow-sm
                                transition-all
                                duration-200
                                hover:-translate-y-0.5
                                hover:border-blue-500/30
                                hover:bg-hover
                                hover:shadow-md
                                active:translate-y-0
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

                                    <span>
                                        Continue with Google
                                    </span>
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
                                    rounded-full
                                    border
                                    border-border
                                    bg-background
                                    px-3
                                    py-1
                                    text-[10px]
                                    font-bold
                                    uppercase
                                    tracking-[0.18em]
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
                            USERNAME
                        ================================================= */}

                        <div className="mb-5">
                            <label
                                htmlFor="username"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-semibold
                                "
                            >
                                Username
                            </label>

                            <div className="relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-muted
                                    "
                                >
                                    <UserIcon />
                                </div>

                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(event) =>
                                        setUsername(
                                            event.target.value
                                        )
                                    }
                                    disabled={disabled}
                                    maxLength={30}
                                    autoComplete="username"
                                    placeholder="Choose a username"
                                    className="
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        border-border
                                        bg-background
                                        pl-11
                                        pr-16
                                        text-sm
                                        text-foreground
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-muted
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                />

                                <span
                                    className="
                                        pointer-events-none
                                        absolute
                                        right-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-[11px]
                                        font-medium
                                        text-muted
                                    "
                                >
                                    {username.length}/30
                                </span>
                            </div>

                            <div
                                className="
                                    mt-2
                                    flex
                                    items-center
                                    gap-2
                                    text-[11px]
                                    text-muted
                                "
                            >
                                <InfoIcon />

                                <span>
                                    7–30 characters with at
                                    least one special character
                                </span>
                            </div>
                        </div>

                        {/* =================================================
                            EMAIL
                        ================================================= */}

                        <div className="mb-5">
                            <label
                                htmlFor="email"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-semibold
                                "
                            >
                                Email address
                            </label>

                            <div className="relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-muted
                                    "
                                >
                                    <MailIcon />
                                </div>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    disabled={disabled}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        border-border
                                        bg-background
                                        pl-11
                                        pr-4
                                        text-sm
                                        text-foreground
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-muted
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                />
                            </div>
                        </div>

                        {/* =================================================
                            PASSWORD
                        ================================================= */}

                        <div className="mb-5">
                            <div className="mb-2 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                    "
                                >
                                    Password
                                </label>

                                {passwordStrengthText && (
                                    <span
                                        className={`
                                            text-[11px]
                                            font-semibold
                                            ${
                                                passwordStrength <=
                                                1
                                                    ? "text-red-500"
                                                    : passwordStrength ===
                                                      2
                                                    ? "text-yellow-500"
                                                    : passwordStrength ===
                                                      3
                                                    ? "text-blue-500"
                                                    : "text-emerald-500"
                                            }
                                        `}
                                    >
                                        {passwordStrengthText}
                                    </span>
                                )}
                            </div>

                            <div className="relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-muted
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
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    disabled={disabled}
                                    autoComplete="new-password"
                                    placeholder="Create a password"
                                    className="
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        border-border
                                        bg-background
                                        pl-11
                                        pr-12
                                        text-sm
                                        text-foreground
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-muted
                                        focus:border-blue-500
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
                                    disabled={disabled}
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        flex
                                        h-9
                                        w-9
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-xl
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

                            {/* Strength bar */}

                            {password.length > 0 && (
                                <div className="mt-2.5">
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map(
                                            (level) => (
                                                <div
                                                    key={level}
                                                    className={`
                                                        h-1
                                                        flex-1
                                                        rounded-full
                                                        transition-all
                                                        duration-300
                                                        ${
                                                            passwordStrength >=
                                                            level
                                                                ? passwordStrength <=
                                                                  1
                                                                    ? "bg-red-500"
                                                                    : passwordStrength ===
                                                                      2
                                                                    ? "bg-yellow-500"
                                                                    : passwordStrength ===
                                                                      3
                                                                    ? "bg-blue-500"
                                                                    : "bg-emerald-500"
                                                                : "bg-border"
                                                        }
                                                    `}
                                                />
                                            )
                                        )}
                                    </div>

                                    <p
                                        className="
                                            mt-1.5
                                            text-[11px]
                                            text-muted
                                        "
                                    >
                                        Minimum 6 characters
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* =================================================
                            CONFIRM PASSWORD
                        ================================================= */}

                        <div className="mb-6">
                            <label
                                htmlFor="confirmPassword"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-semibold
                                "
                            >
                                Confirm password
                            </label>

                            <div className="relative">
                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-muted
                                    "
                                >
                                    <ShieldCheckIcon />
                                </div>

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
                                    disabled={disabled}
                                    autoComplete="new-password"
                                    placeholder="Confirm your password"
                                    className={`
                                        h-[52px]
                                        w-full
                                        rounded-2xl
                                        border
                                        bg-background
                                        pl-11
                                        pr-12
                                        text-sm
                                        text-foreground
                                        outline-none
                                        transition-all
                                        duration-200
                                        placeholder:text-muted
                                        focus:ring-4
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                        ${
                                            confirmPassword &&
                                            password ===
                                                confirmPassword
                                                ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10"
                                                : confirmPassword &&
                                                  password !==
                                                      confirmPassword
                                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                                                : "border-border focus:border-blue-500 focus:ring-blue-500/10"
                                        }
                                    `}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (value) =>
                                                !value
                                        )
                                    }
                                    disabled={disabled}
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        flex
                                        h-9
                                        w-9
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-xl
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

                            {confirmPassword && (
                                <div
                                    className={`
                                        mt-2
                                        flex
                                        items-center
                                        gap-1.5
                                        text-[11px]
                                        font-medium
                                        ${
                                            password ===
                                            confirmPassword
                                                ? "text-emerald-500"
                                                : "text-red-500"
                                        }
                                    `}
                                >
                                    {password ===
                                    confirmPassword ? (
                                        <>
                                            <CheckIcon />
                                            Passwords match
                                        </>
                                    ) : (
                                        <>
                                            <AlertIcon />
                                            Passwords do not
                                            match
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* =================================================
                            CREATE ACCOUNT
                        ================================================= */}

                        <button
                            type="submit"
                            disabled={disabled}
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
                                border-blue-500
                                bg-blue-600
                                px-4
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                shadow-blue-600/20
                                transition-all
                                duration-200
                                hover:-translate-y-0.5
                                hover:bg-blue-700
                                hover:shadow-xl
                                hover:shadow-blue-600/25
                                active:translate-y-0
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {/* Button shine */}

                            <span
                                className="
                                    pointer-events-none
                                    absolute
                                    inset-0
                                    -translate-x-full
                                    bg-gradient-to-r
                                    from-transparent
                                    via-white/10
                                    to-transparent
                                    transition-transform
                                    duration-700
                                    group-hover:translate-x-full
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
                                            border-white/30
                                            border-t-white
                                        "
                                    />

                                    Sending verification
                                    code...
                                </>
                            ) : (
                                <>
                                    Create Account

                                    <ArrowRightIcon />
                                </>
                            )}
                        </button>

                        {/* =================================================
                            LOGIN
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
                                Already have an account?{" "}

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/login"
                                        )
                                    }
                                    disabled={disabled}
                                    className="
                                        font-bold
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
                    TRUST FOOTER
                ================================================= */}

                <div
                    className="
                        mt-6
                        flex
                        items-center
                        justify-center
                        gap-2
                        text-center
                        text-[11px]
                        text-muted
                    "
                >
                    <ShieldCheckIcon />

                    <span>
                        Your account and conversations are
                        protected
                    </span>
                </div>

                <p
                    className="
                        mt-2
                        text-center
                        text-[10px]
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
// USER ICON
// ================================================================

function UserIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-[18px] w-[18px]"
        >
            <circle
                cx="12"
                cy="8"
                r="3.5"
            />

            <path
                strokeLinecap="round"
                d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5"
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
                height="10"
                rx="2"
            />

            <path
                strokeLinecap="round"
                d="M8 10V7a4 4 0 0 1 8 0v3"
            />

            <circle
                cx="12"
                cy="15"
                r="1"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}

// ================================================================
// SHIELD CHECK ICON
// ================================================================

function ShieldCheckIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 shrink-0"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 5 6v5c0 4.5 2.8 7.9 7 10 4.2-2.1 7-5.5 7-10V6l-7-3Z"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 12 2 2 4-4"
            />
        </svg>
    );
}

// ================================================================
// INFO ICON
// ================================================================

function InfoIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3.5 w-3.5 shrink-0"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
            />

            <path
                strokeLinecap="round"
                d="M12 11v5"
            />

            <path
                strokeLinecap="round"
                d="M12 8h.01"
            />
        </svg>
    );
}

// ================================================================
// CHECK ICON
// ================================================================

function CheckIcon() {
    return (
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
                d="m5 12 4 4L19 6"
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
            strokeWidth="1.8"
            className="h-4 w-4"
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
    );
}

// ================================================================
// ARROW RIGHT ICON
// ================================================================

function ArrowRightIcon() {
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