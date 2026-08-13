
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GoogleAuthPage() {
    const router = useRouter();

    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const completeGoogleLogin = async () => {
            try {
                // ====================================================
                // CONVERT AUTH.JS SESSION INTO CHATHUB TOKEN
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
                            "Unable to complete Google login."
                    );
                }

                if (cancelled) {
                    return;
                }

                // ====================================================
                // GOOGLE USER STILL NEEDS USERNAME
                // ====================================================

                if (data?.user?.needsUsername) {
                    router.replace("/complete-signup");
                    return;
                }

                // ====================================================
                // GOOGLE LOGIN COMPLETE
                // ====================================================

                router.replace("/chat");
                router.refresh();
            } catch (error) {
                console.error(
                    "GOOGLE LOGIN ERROR:",
                    error
                );

                if (!cancelled) {
                    setError(
                        error?.message ||
                            "Unable to complete Google login."
                    );
                }
            }
        };

        completeGoogleLogin();

        return () => {
            cancelled = true;
        };
    }, [router]);

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
                {!error ? (
                    <>
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
                            Signing you into ChatHub...
                        </h1>

                        <p className="mt-2 text-sm text-muted">
                            Please wait a moment.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-lg font-semibold">
                            Google login failed
                        </h1>

                        <p className="mt-2 text-sm text-red-500">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                router.replace("/login")
                            }
                            className="
                                mt-6
                                rounded-xl
                                bg-blue-600
                                px-5
                                py-3
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-blue-700
                            "
                        >
                            Back to login
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}

