import { Suspense } from "react";
import ChatPageClient from "./ChatPageClient";

function ChatLoading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b141a] text-white">
            <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#202c33] border-t-[#00a884]" />

                <p className="text-sm text-gray-400">
                    Loading ChatHub...
                </p>
            </div>
        </main>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<ChatLoading />}>
            <ChatPageClient />
        </Suspense>
    );
}