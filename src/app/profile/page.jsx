import { Suspense } from "react";
import ProfilePage from "@/components/profile/ProfilePage";

function ProfileLoading() {
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

export default function Page() {
    return (
        <Suspense fallback={<ProfileLoading />}>
            <ProfilePage />
        </Suspense>
    );
}