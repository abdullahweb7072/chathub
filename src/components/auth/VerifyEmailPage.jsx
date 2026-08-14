"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const email = searchParams.get("email") || "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleVerify = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanCode = code.trim();

        if (!email) {
            setError("Verification email is missing.");
            return;
        }

        if (!/^\d{6}$/.test(cleanCode)) {
            setError(
                "Verification code must contain exactly 6 digits."
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "/api/auth/verify-email",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email,
                        code: cleanCode,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        "Email verification failed."
                );
            }

            setSuccess(
                "Email verified successfully! Redirecting..."
            );

            setTimeout(() => {
                router.push("/login");
            }, 1000);
        } catch (error) {
            console.error(
                "VERIFY EMAIL ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Unable to verify email."
            );
        } finally {
            setLoading(false);
        }
    };

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
            <div
                className="
                    w-full
                    max-w-md
                    rounded-3xl
                    border
                    border-border
                    bg-surface
                    p-6
                    shadow-xl
                    sm:p-8
                "
            >
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold">
                        Verify your email
                    </h1>

                    <p className="mt-2 text-sm text-muted">
                        Enter the 6-digit verification
                        code sent to:
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                        {email}
                    </p>
                </div>

                {error && (
                    <div
                        className="
                            mb-4
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

                {success && (
                    <div
                        className="
                            mb-4
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

                <form
                    onSubmit={handleVerify}
                    className="space-y-5"
                >
                    <div>
                        <label
                            htmlFor="code"
                            className="
                                mb-2
                                block
                                text-sm
                                font-medium
                            "
                        >
                            Verification Code
                        </label>

                        <input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={(event) =>
                                setCode(
                                    event.target.value.replace(
                                        /\D/g,
                                        ""
                                    )
                                )
                            }
                            disabled={loading}
                            placeholder="123456"
                            autoComplete="one-time-code"
                            className="
                                h-12
                                w-full
                                rounded-xl
                                border
                                border-border
                                bg-background
                                px-4
                                text-center
                                text-lg
                                font-semibold
                                tracking-[0.4em]
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

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            code.length !== 6
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
                            transition
                            hover:bg-blue-700
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
                </form>
            </div>
        </main>
    );
}