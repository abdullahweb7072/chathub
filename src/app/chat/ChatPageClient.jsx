"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChatLayout from "@/components/chat/ChatLayout";

export default function ChatPageClient() {
    // ==================================================
    // QUERY PARAMS
    // ==================================================

    const searchParams = useSearchParams();

    const conversationParam =
        searchParams.get("conversation");

    const initialConversationId =
        conversationParam
            ? Number(conversationParam)
            : null;

    // ==================================================
    // STATE
    // ==================================================

    const [conversations, setConversations] =
        useState([]);

    const [currentUser, setCurrentUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // ==================================================
    // LOAD CONVERSATIONS
    // ==================================================

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                "/api/conversations",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                }
            );

            const data =
                await response.json();

            // ==================================================
            // ERROR
            // ==================================================

            if (!response.ok) {
                if (response.status === 401) {
                    setError(
                        "Please login first."
                    );
                } else {
                    setError(
                        data?.message ||
                            "Failed to load conversations."
                    );
                }

                return;
            }

            // ==================================================
            // CONVERSATIONS
            // ==================================================

            const loadedConversations =
                Array.isArray(
                    data?.conversations
                )
                    ? data.conversations
                    : [];

            setConversations(
                loadedConversations
            );

            // ==================================================
            // CURRENT USER
            // ==================================================

            setCurrentUser(
                data?.currentUser || null
            );
        } catch (error) {
            console.error(
                "CHAT PAGE ERROR:",
                error
            );

            setError(
                "Unable to load ChatHub."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {
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

    // ==================================================
    // ERROR
    // ==================================================

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#0b141a] px-4 text-white">
                <div className="w-full max-w-md rounded-2xl border border-[#202c33] bg-[#111b21] p-8 text-center shadow-2xl">
                    <div className="mb-4 text-5xl">
                        💬
                    </div>

                    <h1 className="mb-2 text-2xl font-semibold">
                        ChatHub
                    </h1>

                    <p className="mb-6 text-sm text-gray-400">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={loadConversations}
                        className="rounded-lg bg-[#00a884] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#06cf9c]"
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    // ==================================================
    // CURRENT USER NOT FOUND
    // ==================================================

    if (!currentUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#0b141a] text-white">
                <div className="text-center">
                    <div className="mb-4 text-5xl">
                        👤
                    </div>

                    <p className="text-sm text-gray-400">
                        Unable to identify current
                        user.
                    </p>

                    <button
                        type="button"
                        onClick={loadConversations}
                        className="mt-4 rounded-lg bg-[#00a884] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#06cf9c]"
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    // ==================================================
    // CHAT
    // ==================================================

    return (
        <main className="h-screen overflow-hidden bg-[#0b141a]">
            <ChatLayout
                initialConversations={
                    conversations
                }
                currentUser={
                    currentUser
                }
                initialConversationId={
                    Number.isInteger(
                        initialConversationId
                    ) &&
                    initialConversationId > 0
                        ? initialConversationId
                        : null
                }
            />
        </main>
    );
}