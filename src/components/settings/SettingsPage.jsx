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
            description: "Manage your personal information",
            icon: (
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
                        d="M20 21a8 8 0 0 0-16 0"
                    />

                    <circle
                        cx="12"
                        cy="7"
                        r="4"
                    />
                </svg>
            ),
        },
        {
            id: "notifications",
            label: "Notifications",
            description: "Control alerts and sounds",
            icon: (
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
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                    />

                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 21h4"
                    />
                </svg>
            ),
        },
        {
            id: "privacy",
            label: "Privacy",
            description: "Control your privacy settings",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                >
                    <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                    />

                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 10V7a4 4 0 0 1 8 0v3"
                    />

                    <circle
                        cx="12"
                        cy="15"
                        r="1"
                    />
                </svg>
            ),
        },
    ];

    const activeSectionData =
        sections.find(
            (section) =>
                section.id === activeSection
        ) || sections[0];

    return (
        <main
            className="
                relative
                min-h-screen
                overflow-hidden
                px-4
                py-6
                sm:px-6
                sm:py-8
                lg:px-8
                lg:py-10
            "
            style={{
                background:
                    "var(--chat-bg-primary)",
                color:
                    "var(--chat-text-primary)",
            }}
        >
            {/* =====================================================
                BACKGROUND DECORATION
            ===================================================== */}

            <div
                className="
                    pointer-events-none
                    absolute
                    -left-32
                    -top-32
                    h-72
                    w-72
                    rounded-full
                    bg-blue-500/10
                    blur-3xl
                "
            />

            <div
                className="
                    pointer-events-none
                    absolute
                    -right-32
                    top-1/3
                    h-80
                    w-80
                    rounded-full
                    bg-purple-500/10
                    blur-3xl
                "
            />

            <div
                className="
                    pointer-events-none
                    absolute
                    bottom-[-150px]
                    left-1/3
                    h-80
                    w-80
                    rounded-full
                    bg-indigo-500/5
                    blur-3xl
                "
            />

            {/* =====================================================
                MAIN CONTAINER
            ===================================================== */}

            <div
                className="
                    relative
                    mx-auto
                    w-full
                    max-w-6xl
                "
            >
                {/* =================================================
                    HEADER
                ================================================= */}

                <header
                    className="
                        mb-7
                        overflow-hidden
                        rounded-3xl
                        border
                        shadow-sm
                    "
                    style={{
                        background:
                            "var(--chat-bg-secondary)",
                        borderColor:
                            "var(--chat-border)",
                    }}
                >
                    <div
                        className="
                            relative
                            px-5
                            py-5
                            sm:px-7
                            sm:py-6
                        "
                    >
                        {/* HEADER GLOW */}

                        <div
                            className="
                                pointer-events-none
                                absolute
                                right-0
                                top-0
                                h-32
                                w-32
                                rounded-full
                                bg-blue-500/10
                                blur-3xl
                            "
                        />

                        <div
                            className="
                                relative
                                flex
                                items-center
                                gap-4
                            "
                        >
                            {/* BACK BUTTON */}

                            <button
                                type="button"
                                onClick={() =>
                                    router.back()
                                }
                                className="
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    border
                                    transition
                                    duration-200
                                    hover:-translate-x-0.5
                                    hover:bg-[var(--chat-bg-tertiary)]
                                    active:scale-95
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-primary)",
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

                            {/* SETTINGS ICON */}

                            <div
                                className="
                                    hidden
                                    h-12
                                    w-12
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-gradient-to-br
                                    from-blue-500
                                    to-indigo-600
                                    text-white
                                    shadow-lg
                                    shadow-blue-500/20
                                    sm:flex
                                "
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-6 w-6"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.46 15a1.7 1.7 0 0 0-1.56-1.03H6.7v-2.4h.2A1.7 1.7 0 0 0 8.46 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.2A1.7 1.7 0 0 0 16.1 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.34 9a1.7 1.7 0 0 0 1.56 1.03h.2v2.4h-.2A1.7 1.7 0 0 0 19.34 14"
                                    />
                                </svg>
                            </div>

                            {/* TITLE */}

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
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

                                    <span
                                        className="
                                            hidden
                                            rounded-full
                                            border
                                            border-blue-500/20
                                            bg-blue-500/10
                                            px-2.5
                                            py-1
                                            text-[10px]
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-blue-500
                                            sm:inline-flex
                                        "
                                    >
                                        ChatHub
                                    </span>
                                </div>

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
                                    Manage your account,
                                    preferences and
                                    privacy.
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* =================================================
                    SETTINGS LAYOUT
                ================================================= */}

                <div
                    className="
                        grid
                        gap-5
                        lg:grid-cols-[290px_1fr]
                        lg:items-start
                    "
                >
                    {/* =================================================
                        SETTINGS NAVIGATION
                    ================================================= */}

                    <aside
                        className="
                            overflow-hidden
                            rounded-3xl
                            border
                            shadow-sm
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
                                py-5
                            "
                            style={{
                                borderColor:
                                    "var(--chat-border)",
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        Preferences
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        Customize your
                                        experience
                                    </p>
                                </div>

                                <div
                                    className="
                                        flex
                                        h-8
                                        w-8
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-blue-500/10
                                        text-blue-500
                                    "
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                                        />

                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.46 15a1.7 1.7 0 0 0-1.56-1.03H6.7v-2.4h.2A1.7 1.7 0 0 0 8.46 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.2A1.7 1.7 0 0 0 16.1 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.34 9a1.7 1.7 0 0 0 1.56 1.03h.2"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* NAVIGATION */}

                        <nav className="p-3">
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
                                            className={`
                                                group
                                                relative
                                                mb-2
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                overflow-hidden
                                                rounded-2xl
                                                px-3
                                                py-3.5
                                                text-left
                                                transition-all
                                                duration-200
                                                ${
                                                    active
                                                        ? "shadow-sm"
                                                        : "hover:translate-x-0.5"
                                                }
                                            `}
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
                                            {/* ACTIVE BAR */}

                                            {active && (
                                                <span
                                                    className="
                                                        absolute
                                                        left-0
                                                        top-3
                                                        bottom-3
                                                        w-1
                                                        rounded-r-full
                                                        bg-blue-500
                                                    "
                                                />
                                            )}

                                            {/* ICON */}

                                            <span
                                                className="
                                                    flex
                                                    h-11
                                                    w-11
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-2xl
                                                    transition
                                                "
                                                style={{
                                                    background:
                                                        active
                                                            ? "rgba(59,130,246,0.14)"
                                                            : "var(--chat-bg-tertiary)",
                                                    color:
                                                        active
                                                            ? "#3b82f6"
                                                            : "var(--chat-text-secondary)",
                                                }}
                                            >
                                                {
                                                    section.icon
                                                }
                                            </span>

                                            {/* TEXT */}

                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className="
                                                        block
                                                        text-sm
                                                        font-semibold
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
                                                        mt-1
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

                                            {/* ARROW */}

                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                className={`
                                                    h-4
                                                    w-4
                                                    shrink-0
                                                    transition-all
                                                    ${
                                                        active
                                                            ? "translate-x-0 opacity-100"
                                                            : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"
                                                    }
                                                `}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="m9 18 6-6-6-6"
                                                />
                                            </svg>
                                        </button>
                                    );
                                }
                            )}
                        </nav>

                        {/* SIDEBAR FOOTER */}

                        <div
                            className="
                                border-t
                                px-4
                                py-4
                            "
                            style={{
                                borderColor:
                                    "var(--chat-border)",
                            }}
                        >
                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                    rounded-2xl
                                    border
                                    px-3
                                    py-3
                                "
                                style={{
                                    background:
                                        "var(--chat-bg-primary)",
                                    borderColor:
                                        "var(--chat-border)",
                                }}
                            >
                                <div
                                    className="
                                        flex
                                        h-8
                                        w-8
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-green-500/10
                                        text-green-500
                                    "
                                >
                                    <span className="h-2 w-2 rounded-full bg-green-500" />
                                </div>

                                <div className="min-w-0">
                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        Your settings
                                    </p>

                                    <p
                                        className="
                                            mt-0.5
                                            truncate
                                            text-[11px]
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        Changes are saved
                                        automatically
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* =================================================
                        CONTENT CARD
                    ================================================= */}

                    <section
                        className="
                            min-w-0
                            overflow-hidden
                            rounded-3xl
                            border
                            shadow-sm
                        "
                        style={{
                            background:
                                "var(--chat-bg-secondary)",
                            borderColor:
                                "var(--chat-border)",
                        }}
                    >
                        {/* CONTENT HEADER */}

                        <div
                            className="
                                border-b
                                px-5
                                py-5
                                sm:px-7
                            "
                            style={{
                                borderColor:
                                    "var(--chat-border)",
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-blue-500/10
                                        text-blue-500
                                    "
                                >
                                    {activeSectionData.icon}
                                </div>

                                <div className="min-w-0">
                                    <h2
                                        className="
                                            text-base
                                            font-semibold
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-primary)",
                                        }}
                                    >
                                        {
                                            activeSectionData.label
                                        }
                                    </h2>

                                    <p
                                        className="
                                            mt-0.5
                                            text-xs
                                        "
                                        style={{
                                            color:
                                                "var(--chat-text-muted)",
                                        }}
                                    >
                                        {
                                            activeSectionData.description
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0">
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
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}