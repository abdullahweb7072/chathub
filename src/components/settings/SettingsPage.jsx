"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ProfileSettings from "./ProfileSettings";
import PrivacySettings from "./PrivacySettings";
import NotificationSettings from "./NotificationSettings";

export default function SettingsPage() {
    const router = useRouter();

    const [activeSection, setActiveSection] =
        useState("profile");

    const sections = [
        {
            id: "profile",
            label: "Profile",
            description: "Manage your profile",
            icon: "👤",
        },
        {
            id: "notifications",
            label: "Notifications",
            description: "Manage notifications",
            icon: "🔔",
        },
        {
            id: "privacy",
            label: "Privacy",
            description: "Control your privacy",
            icon: "🔒",
        },
    ];

    return (
        <main
            className="
                min-h-screen
                px-4
                py-6
                sm:px-6
                lg:px-8
            "
            style={{
                background:
                    "var(--chat-bg-primary)",
                color:
                    "var(--chat-text-primary)",
            }}
        >
            <div
                className="
                    mx-auto
                    w-full
                    max-w-6xl
                "
            >
                {/* =====================================================
                    HEADER
                ===================================================== */}

                <div className="mb-6">

                    {/* =================================================
                        BACK BUTTON
                    ================================================= */}

                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="
                            mb-5
                            inline-flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            border
                            transition
                            hover:opacity-80
                            active:scale-95
                        "
                        style={{
                            background:
                                "var(--chat-bg-secondary)",
                            borderColor:
                                "var(--chat-border)",
                            color:
                                "var(--chat-text-primary)",
                        }}
                        aria-label="Go back"
                        title="Go back"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>

                    {/* PAGE TITLE */}

                    <h1
                        className="
                            text-2xl
                            font-bold
                            tracking-tight
                            sm:text-3xl
                        "
                        style={{
                            color:
                                "var(--chat-text-primary)",
                        }}
                    >
                        Settings
                    </h1>

                    <p
                        className="
                            mt-1
                            text-sm
                        "
                        style={{
                            color:
                                "var(--chat-text-secondary)",
                        }}
                    >
                        Manage your ChatHub account
                        and preferences.
                    </p>
                </div>

                {/* =====================================================
                    SETTINGS LAYOUT
                ===================================================== */}

                <div
                    className="
                        grid
                        gap-5
                        lg:grid-cols-[280px_1fr]
                    "
                >
                    {/* =================================================
                        SIDEBAR
                    ================================================= */}

                    <aside
                        className="
                            h-fit
                            overflow-hidden
                            rounded-2xl
                            border
                        "
                        style={{
                            background:
                                "var(--chat-bg-secondary)",
                            borderColor:
                                "var(--chat-border)",
                        }}
                    >
                        {/* SIDEBAR HEADER */}

                        <div
                            className="
                                border-b
                                px-5
                                py-4
                            "
                            style={{
                                borderColor:
                                    "var(--chat-border)",
                            }}
                        >
                            <p
                                className="
                                    text-xs
                                    font-semibold
                                    uppercase
                                    tracking-wider
                                "
                                style={{
                                    color:
                                        "var(--chat-text-muted)",
                                }}
                            >
                                Settings
                            </p>
                        </div>

                        {/* NAVIGATION */}

                        <nav className="p-2">
                            {sections.map(
                                (section) => {
                                    const active =
                                        activeSection ===
                                        section.id;

                                    return (
                                        <button
                                            key={
                                                section.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setActiveSection(
                                                    section.id
                                                )
                                            }
                                            className="
                                                mb-1
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                rounded-xl
                                                px-3
                                                py-3
                                                text-left
                                                transition
                                                hover:opacity-90
                                            "
                                            style={{
                                                background:
                                                    active
                                                        ? "var(--chat-accent-soft)"
                                                        : "transparent",

                                                color:
                                                    active
                                                        ? "var(--chat-text-primary)"
                                                        : "var(--chat-text-secondary)",
                                            }}
                                        >
                                            {/* ICON */}

                                            <span
                                                className="
                                                    flex
                                                    h-10
                                                    w-10
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    text-lg
                                                "
                                                style={{
                                                    background:
                                                        active
                                                            ? "var(--chat-accent-soft)"
                                                            : "var(--chat-bg-tertiary)",
                                                }}
                                            >
                                                {
                                                    section.icon
                                                }
                                            </span>

                                            {/* TEXT */}

                                            <span
                                                className="
                                                    min-w-0
                                                    flex-1
                                                "
                                            >
                                                <span
                                                    className="
                                                        block
                                                        text-sm
                                                        font-medium
                                                    "
                                                    style={{
                                                        color:
                                                            active
                                                                ? "var(--chat-text-primary)"
                                                                : "var(--chat-text-secondary)",
                                                    }}
                                                >
                                                    {
                                                        section.label
                                                    }
                                                </span>

                                                <span
                                                    className="
                                                        mt-0.5
                                                        block
                                                        truncate
                                                        text-xs
                                                    "
                                                    style={{
                                                        color:
                                                            "var(--chat-text-muted)",
                                                    }}
                                                >
                                                    {
                                                        section.description
                                                    }
                                                </span>
                                            </span>

                                            {/* ACTIVE DOT */}

                                            {active && (
                                                <span
                                                    className="
                                                        h-2.5
                                                        w-2.5
                                                        shrink-0
                                                        rounded-full
                                                        bg-blue-500
                                                        shadow-[0_0_0_3px_rgba(59,130,246,0.15)]
                                                    "
                                                />
                                            )}
                                        </button>
                                    );
                                }
                            )}
                        </nav>
                    </aside>

                    {/* =================================================
                        CONTENT
                    ================================================= */}

                    <section
                        className="
                            min-w-0
                            overflow-hidden
                            rounded-2xl
                            border
                        "
                        style={{
                            background:
                                "var(--chat-bg-secondary)",
                            borderColor:
                                "var(--chat-border)",
                        }}
                    >
                        {activeSection ===
                            "profile" && (
                            <ProfileSettings />
                        )}

                        {activeSection ===
                            "notifications" && (
                            <NotificationSettings />
                        )}

                        {activeSection ===
                            "privacy" && (
                            <PrivacySettings />
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}