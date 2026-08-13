"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

// ================================================================
// CONFIGURATION
// ================================================================

const CODE_LENGTH = 6;

// ================================================================
// PAGE
// ================================================================

export default function VerifyEmailPage() {
    const router = useRouter();

    const searchParams =
        useSearchParams();

    const email =
        searchParams.get("email") || "";

    // ============================================================
    // STATE
    // ============================================================

    const [code, setCode] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    // ============================================================
    // INPUT REF
    // ============================================================

    const inputRef =
        useRef(null);

    // ============================================================
    // AUTO FOCUS
    // ============================================================

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ============================================================
    // VERIFY EMAIL
    // ============================================================

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        // ========================================================
        // EMAIL CHECK
        // ========================================================

        if (!email) {
            setError(
                "Email address is missing. Please register again."
            );

            return;
        }

        // ========================================================
        // CODE CHECK
        // ========================================================

        if (code.length !== CODE_LENGTH) {
            setError(
                "Please enter the 6-digit verification code."
            );

            return;
        }

        // ========================================================
        // API REQUEST
        // ========================================================

        try {
            setLoading(true);

            const response =
                await fetch(
                    "/api/auth/verify-email",
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

                        body:
                            JSON.stringify({
                                email,
                                code,
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
                        "Verification failed."
                );
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            setSuccess(
                "Email verified successfully! Redirecting to login..."
            );

            // ====================================================
            // REDIRECT
            // ====================================================

            setTimeout(() => {
                router.push(
                    "/login"
                );
            }, 1200);

        } catch (error) {
            console.error(
                "VERIFY EMAIL ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Something went wrong. Please try again."
            );

        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // CODE CHANGE
    // ============================================================

    function handleCodeChange(event) {
        const value =
            event.target.value
                .replace(/\D/g, "")
                .slice(
                    0,
                    CODE_LENGTH
                );

        setCode(value);

        setError("");
        setSuccess("");
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
                            Verify your email
                        </h1>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-muted
                            "
                        >
                            We sent a 6-digit verification
                            code to
                        </p>

                        {/* EMAIL */}

                        <p
                            className="
                                mt-1
                                break-all
                                text-sm
                                font-semibold
                                text-foreground
                            "
                        >
                            {email ||
                                "your email address"}
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
                            pb-7
                            sm:px-8
                        "
                    >
                        {/* =================================================
                            ERROR
                        ================================================= */}

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

                        {/* =================================================
                            SUCCESS
                        ================================================= */}

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

                        {/* =================================================
                            CODE INPUT
                        ================================================= */}

                        <div>
                            <label
                                htmlFor="verification-code"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                "
                            >
                                Verification code
                            </label>

                            <input
                                ref={inputRef}
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="one-time-code"
                                value={code}
                                onChange={handleCodeChange}
                                disabled={loading}
                                maxLength={CODE_LENGTH}
                                placeholder="000000"
                                className="
                                    h-14
                                    w-full
                                    rounded-xl
                                    border
                                    border-border
                                    bg-background
                                    px-4
                                    text-center
                                    text-2xl
                                    font-semibold
                                    tracking-[0.5em]
                                    text-foreground
                                    outline-none
                                    transition
                                    placeholder:text-muted
                                    placeholder:tracking-[0.5em]
                                    focus:border-blue-500
                                    focus:ring-2
                                    focus:ring-blue-500/20
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            />
                        </div>

                        {/* =================================================
                            CODE INFO
                        ================================================= */}

                        <p
                            className="
                                text-center
                                text-xs
                                text-muted
                            "
                        >
                            The verification code expires
                            in 10 minutes.
                        </p>

                        {/* =================================================
                            VERIFY BUTTON
                        ================================================= */}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                code.length !== CODE_LENGTH
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

                                    Verifying...
                                </>
                            ) : (
                                "Verify Email"
                            )}
                        </button>

                        {/* =================================================
                            BACK TO REGISTER
                        ================================================= */}

                        <div
                            className="
                                pt-1
                                text-center
                            "
                        >
                            <p
                                className="
                                    text-sm
                                    text-muted
                                "
                            >
                                Entered the wrong email?{" "}

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/register"
                                        )
                                    }
                                    disabled={loading}
                                    className="
                                        font-semibold
                                        text-blue-500
                                        transition
                                        hover:text-blue-400
                                        hover:underline
                                        disabled:opacity-50
                                    "
                                >
                                    Register again
                                </button>
                            </p>
                        </div>
                    </form>
                </div>

                {/* ====================================================
                    FOOTER
                ==================================================== */}

                <p
                    className="
                        mt-5
                        text-center
                        text-xs
                        text-muted
                    "
                >
                    ChatHub keeps your account secure
                    with email verification.
                </p>
            </div>
        </main>
    );
}