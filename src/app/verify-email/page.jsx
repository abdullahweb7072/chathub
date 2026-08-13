import { Suspense } from "react";
import VerifyEmailPage from "@/components/auth/VerifyEmailPage";

export default function Page() {
    return (
        <Suspense
            fallback={
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
            }
        >
            <VerifyEmailPage />
        </Suspense>
    );
}