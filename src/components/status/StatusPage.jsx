"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import CreateStatusModal from "./CreateStatusModal";
import StatusViewer from "./StatusViewer";

export default function StatusPage() {
    const router = useRouter();

    // ============================================================
    // STATE
    // ============================================================

    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    const [selectedStatuses, setSelectedStatuses] =
        useState([]);

    const [selectedStatusIndex, setSelectedStatusIndex] =
        useState(0);

    const [currentUserId, setCurrentUserId] =
        useState(null);

    const [currentUserLoaded, setCurrentUserLoaded] =
        useState(false);

    // ============================================================
    // FETCH STATUSES
    // ============================================================

    const fetchStatuses = useCallback(async () => {
        try {
            setError("");

            const response = await fetch("/api/status", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                        "Failed to load statuses"
                );
            }

            setStatuses(
                Array.isArray(data.statuses)
                    ? data.statuses
                    : []
            );
        } catch (error) {
            console.error(
                "❌ STATUS FETCH ERROR:",
                error
            );

            setError(
                error?.message ||
                    "Failed to load statuses"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================================
    // FETCH CURRENT USER
    // ============================================================

    useEffect(() => {
        let cancelled = false;

        const loadCurrentUser = async () => {
            try {
                const response = await fetch(
                    "/api/auth/me",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                        headers: {
                            Accept:
                                "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    return;
                }

                const data =
                    await response.json();

                const user =
                    data?.user ||
                    data?.data ||
                    null;

                if (
                    !cancelled &&
                    user?.id
                ) {
                    const userId =
                        Number(user.id);

                    if (
                        Number.isInteger(userId) &&
                        userId > 0
                    ) {
                        setCurrentUserId(
                            userId
                        );
                    }
                }
            } catch (error) {
                console.error(
                    "❌ CURRENT USER ERROR:",
                    error
                );
            } finally {
                if (!cancelled) {
                    setCurrentUserLoaded(
                        true
                    );
                }
            }
        };

        loadCurrentUser();

        return () => {
            cancelled = true;
        };
    }, []);

    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    // ============================================================
    // GROUP STATUSES
    // ============================================================

    const groupedStatuses = useMemo(() => {
        if (
            !currentUserLoaded ||
            !currentUserId
        ) {
            return [];
        }

        const groups = new Map();

        for (const status of statuses) {
            const user =
                status?.user || null;

            const userId = Number(
                user?.id ??
                    status?.userId ??
                    0
            );

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                continue;
            }

            if (!groups.has(userId)) {
                groups.set(userId, {
                    user,
                    statuses: [],
                });
            }

            groups
                .get(userId)
                .statuses
                .push(status);
        }

        return Array.from(
            groups.values()
        );
    }, [
        statuses,
        currentUserId,
        currentUserLoaded,
    ]);

    // ============================================================
    // MY STATUSES
    // ============================================================

    const myStatuses = useMemo(() => {
        if (
            !currentUserLoaded ||
            !currentUserId
        ) {
            return [];
        }

        return statuses.filter(
            (status) => {
                const ownerId = Number(
                    status?.user?.id ??
                        status?.userId ??
                        0
                );

                return (
                    ownerId ===
                    Number(currentUserId)
                );
            }
        );
    }, [
        statuses,
        currentUserId,
        currentUserLoaded,
    ]);

    // ============================================================
    // FRIEND STATUSES
    // ============================================================

    const friendGroups = useMemo(() => {
        if (
            !currentUserLoaded ||
            !currentUserId
        ) {
            return [];
        }

        return groupedStatuses.filter(
            (group) => {
                const ownerId = Number(
                    group?.user?.id ?? 0
                );

                return (
                    ownerId !==
                    Number(currentUserId)
                );
            }
        );
    }, [
        groupedStatuses,
        currentUserId,
        currentUserLoaded,
    ]);

    // ============================================================
    // OPEN MY STATUS
    // ============================================================

    const handleOpenMyStatus = (
        index
    ) => {
        if (!currentUserId) {
            return;
        }

        const status =
            myStatuses[index];

        if (!status) {
            return;
        }

        const ownerId = Number(
            status?.user?.id ??
                status?.userId ??
                0
        );

        if (
            ownerId !==
            Number(currentUserId)
        ) {
            console.warn(
                "STATUS: attempted to open invalid own status."
            );

            return;
        }

        setSelectedStatuses(
            myStatuses
        );

        setSelectedStatusIndex(
            index
        );
    };

    // ============================================================
    // OPEN FRIEND STATUS
    // ============================================================

    const handleOpenFriendStatus = (
        group
    ) => {
        if (
            !currentUserId ||
            !group?.statuses?.length
        ) {
            return;
        }

        const ownerId = Number(
            group?.user?.id ?? 0
        );

        if (
            ownerId ===
            Number(currentUserId)
        ) {
            console.warn(
                "STATUS: attempted to open own status as friend."
            );

            return;
        }

        setSelectedStatuses(
            group.statuses
        );

        setSelectedStatusIndex(0);
    };

    // ============================================================
    // CLOSE VIEWER
    // ============================================================

    const handleCloseViewer = () => {
        setSelectedStatuses([]);
        setSelectedStatusIndex(0);
    };

    // ============================================================
    // STATUS CREATED
    // ============================================================

    const handleStatusCreated =
        async () => {
            setShowCreateModal(false);
            await fetchStatuses();
        };

    // ============================================================
    // DELETE STATUS
    // ============================================================

    const handleDeleteStatus =
        async (statusId) => {
            try {
                const response =
                    await fetch(
                        `/api/status/${statusId}`,
                        {
                            method: "DELETE",
                            credentials:
                                "include",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Failed to delete status"
                    );
                }

                setStatuses(
                    (previous) =>
                        previous.filter(
                            (status) =>
                                Number(
                                    status.id
                                ) !==
                                Number(
                                    statusId
                                )
                        )
                );

                setSelectedStatuses(
                    (previous) => {
                        const updated =
                            previous.filter(
                                (status) =>
                                    Number(
                                        status.id
                                    ) !==
                                    Number(
                                        statusId
                                    )
                            );

                        if (
                            updated.length ===
                            0
                        ) {
                            setSelectedStatusIndex(
                                0
                            );
                        }

                        return updated;
                    }
                );
            } catch (error) {
                console.error(
                    "❌ DELETE STATUS ERROR:",
                    error
                );

                alert(
                    error?.message ||
                        "Failed to delete status"
                );
            }
        };

    // ============================================================
    // STATUS VIEWED
    // ============================================================

    const handleStatusViewed = (
        statusId
    ) => {
        setStatuses(
            (previous) =>
                previous.map(
                    (status) =>
                        Number(
                            status.id
                        ) ===
                        Number(statusId)
                            ? {
                                  ...status,
                                  viewed: true,
                              }
                            : status
                )
        );

        setSelectedStatuses(
            (previous) =>
                previous.map(
                    (status) =>
                        Number(
                            status.id
                        ) ===
                        Number(statusId)
                            ? {
                                  ...status,
                                  viewed: true,
                              }
                            : status
                )
        );
    };

    // ============================================================
    // BACK
    // ============================================================

    const handleBack = () => {
        router.replace("/chat");
    };

    // ============================================================
    // CURRENT USER DISPLAY
    // ============================================================

    const currentUser =
        statuses.find(
            (status) =>
                Number(
                    status?.user?.id ??
                        status?.userId
                ) ===
                Number(currentUserId)
        )?.user || null;

    const currentUserName =
        currentUser?.displayName ||
        currentUser?.username ||
        "You";

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* ====================================================
                BACKGROUND DECORATION
            ==================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -right-32 top-80 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
            </div>

            {/* ====================================================
                HEADER
            ==================================================== */}

            <header
                className="
                    sticky
                    top-0
                    z-40
                    border-b
                    border-border/70
                    bg-surface/85
                    backdrop-blur-xl
                "
            >
                <div
                    className="
                        mx-auto
                        flex
                        h-[72px]
                        w-full
                        max-w-4xl
                        items-center
                        justify-between
                        px-4
                        md:px-6
                    "
                >
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={
                                handleBack
                            }
                            className="
                                group
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                border
                                border-border
                                bg-background/50
                                text-muted
                                transition-all
                                duration-200
                                hover:-translate-x-0.5
                                hover:bg-hover
                                hover:text-foreground
                            "
                            aria-label="Back to ChatHub"
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
                                    d="M15 18l-6-6 6-6"
                                />
                            </svg>
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold tracking-tight">
                                    Status
                                </h1>

                                {statuses.length >
                                    0 && (
                                    <span
                                        className="
                                            rounded-full
                                            bg-foreground/10
                                            px-2
                                            py-0.5
                                            text-[10px]
                                            font-semibold
                                            text-muted
                                        "
                                    >
                                        {
                                            statuses.length
                                        }
                                    </span>
                                )}
                            </div>

                            <p className="hidden text-xs text-muted sm:block">
                                Updates from you and your friends
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowCreateModal(
                                true
                            )
                        }
                        className="
                            group
                            flex
                            items-center
                            gap-2
                            rounded-xl
                            bg-foreground
                            px-3.5
                            py-2.5
                            text-sm
                            font-semibold
                            text-background
                            shadow-lg
                            transition-all
                            duration-200
                            hover:-translate-y-0.5
                            hover:opacity-90
                            hover:shadow-xl
                            active:translate-y-0
                            sm:px-4
                        "
                    >
                        <span
                            className="
                                flex
                                h-5
                                w-5
                                items-center
                                justify-center
                                rounded-full
                                bg-background/15
                                text-base
                                leading-none
                            "
                        >
                            +
                        </span>

                        <span className="hidden sm:inline">
                            New Status
                        </span>

                        <span className="sm:hidden">
                            Status
                        </span>
                    </button>
                </div>
            </header>

            {/* ====================================================
                CONTENT
            ==================================================== */}

            <div
                className="
                    relative
                    mx-auto
                    w-full
                    max-w-4xl
                    px-4
                    py-6
                    md:px-6
                    md:py-8
                "
            >
                {/* ERROR */}

                {error && (
                    <div
                        className="
                            mb-6
                            flex
                            items-start
                            gap-3
                            rounded-2xl
                            border
                            border-red-500/20
                            bg-red-500/10
                            px-4
                            py-3.5
                            text-sm
                            text-red-500
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="mt-0.5 h-5 w-5 shrink-0"
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

                        <span>{error}</span>
                    </div>
                )}

                {/* =================================================
                    MY STATUS
                ================================================= */}

                <section className="mb-8">
                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                Your updates
                            </p>

                            <h2 className="text-xl font-bold tracking-tight">
                                My Status
                            </h2>
                        </div>

                        {myStatuses.length >
                            0 && (
                            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                                {
                                    myStatuses.length
                                }{" "}
                                {myStatuses.length ===
                                1
                                    ? "update"
                                    : "updates"}
                            </span>
                        )}
                    </div>

                    {!currentUserLoaded ? (
                        <LoadingCard />
                    ) : myStatuses.length >
                      0 ? (
                        <div
                            className="
                                overflow-hidden
                                rounded-3xl
                                border
                                border-border
                                bg-surface/80
                                shadow-sm
                                backdrop-blur
                            "
                        >
                            {myStatuses.map(
                                (
                                    status,
                                    index
                                ) => (
                                    <button
                                        key={
                                            status.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleOpenMyStatus(
                                                index
                                            )
                                        }
                                        className="
                                            group
                                            flex
                                            w-full
                                            items-center
                                            gap-4
                                            border-b
                                            border-border
                                            px-4
                                            py-4
                                            text-left
                                            transition-all
                                            duration-200
                                            last:border-b-0
                                            hover:bg-hover
                                            md:px-5
                                        "
                                    >
                                        <StatusThumbnail
                                            status={
                                                status
                                            }
                                        />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">
                                                {status.content ||
                                                    (status.mediaType ===
                                                    "IMAGE"
                                                        ? "Photo status"
                                                        : status.mediaType ===
                                                            "VIDEO"
                                                        ? "Video status"
                                                        : "Status update")}
                                            </p>

                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="h-1 w-1 rounded-full bg-muted/50" />

                                                <p className="text-xs text-muted">
                                                    Tap to view
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className="
                                                flex
                                                h-9
                                                w-9
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-full
                                                text-muted
                                                transition-all
                                                group-hover:bg-background
                                                group-hover:text-foreground
                                            "
                                        >
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
                                                    d="m9 18 6-6-6-6"
                                                />
                                            </svg>
                                        </div>
                                    </button>
                                )
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setShowCreateModal(
                                    true
                                )
                            }
                            className="
                                group
                                flex
                                w-full
                                items-center
                                gap-4
                                rounded-3xl
                                border
                                border-dashed
                                border-border
                                bg-surface/70
                                p-5
                                text-left
                                transition-all
                                duration-200
                                hover:border-foreground/20
                                hover:bg-hover
                                md:p-6
                            "
                        >
                            <div
                                className="
                                    relative
                                    flex
                                    h-14
                                    w-14
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-foreground
                                    text-2xl
                                    text-background
                                    shadow-lg
                                    transition-transform
                                    duration-200
                                    group-hover:scale-105
                                "
                            >
                                +

                                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">
                                    Share a new status
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-muted">
                                    Share a photo, video, or
                                    thought with your friends.
                                </p>
                            </div>

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5 text-muted transition-transform duration-200 group-hover:translate-x-1"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m9 18 6-6-6-6"
                                />
                            </svg>
                        </button>
                    )}
                </section>

                {/* =================================================
                    RECENT UPDATES
                ================================================= */}

                <section>
                    <div className="mb-4">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                            From your people
                        </p>

                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight">
                                Recent Updates
                            </h2>

                            {friendGroups.length >
                                0 && (
                                <span className="text-xs text-muted">
                                    {
                                        friendGroups.length
                                    }{" "}
                                    {friendGroups.length ===
                                    1
                                        ? "person"
                                        : "people"}
                                </span>
                            )}
                        </div>
                    </div>

                    {loading ||
                    !currentUserLoaded ? (
                        <LoadingCard />
                    ) : friendGroups.length ===
                      0 ? (
                        <EmptyUpdates />
                    ) : (
                        <div
                            className="
                                overflow-hidden
                                rounded-3xl
                                border
                                border-border
                                bg-surface/80
                                shadow-sm
                                backdrop-blur
                            "
                        >
                            {friendGroups.map(
                                (
                                    group
                                ) => {
                                    const hasUnviewed =
                                        group.statuses.some(
                                            (
                                                status
                                            ) =>
                                                !status.viewed
                                        );

                                    return (
                                        <button
                                            key={
                                                group
                                                    .user
                                                    .id
                                            }
                                            type="button"
                                            onClick={() =>
                                                handleOpenFriendStatus(
                                                    group
                                                )
                                            }
                                            className="
                                                group
                                                flex
                                                w-full
                                                items-center
                                                gap-4
                                                border-b
                                                border-border
                                                px-4
                                                py-4
                                                text-left
                                                transition-all
                                                duration-200
                                                last:border-b-0
                                                hover:bg-hover
                                                md:px-5
                                            "
                                        >
                                            <StatusAvatar
                                                user={
                                                    group.user
                                                }
                                                hasUnviewed={
                                                    hasUnviewed
                                                }
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-semibold">
                                                        {group
                                                            .user
                                                            .displayName ||
                                                            group
                                                                .user
                                                                .username ||
                                                            "User"}
                                                    </p>

                                                    {hasUnviewed && (
                                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                                                    )}
                                                </div>

                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="text-xs text-muted">
                                                        {
                                                            group
                                                                .statuses
                                                                .length
                                                        }{" "}
                                                        {group
                                                            .statuses
                                                            .length ===
                                                        1
                                                            ? "update"
                                                            : "updates"}
                                                    </span>

                                                    {hasUnviewed && (
                                                        <>
                                                            <span className="h-1 w-1 rounded-full bg-muted/50" />
                                                            <span className="text-xs font-medium text-green-500">
                                                                New
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className="
                                                    flex
                                                    h-9
                                                    w-9
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    text-muted
                                                    transition-all
                                                    group-hover:bg-background
                                                    group-hover:text-foreground
                                                "
                                            >
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
                                                        d="m9 18 6-6-6-6"
                                                    />
                                                </svg>
                                            </div>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    )}
                </section>

                {/* BOTTOM SPACE */}

                <div className="h-8" />
            </div>

            {/* ====================================================
                CREATE STATUS MODAL
            ==================================================== */}

            <CreateStatusModal
                open={
                    showCreateModal
                }
                onClose={() =>
                    setShowCreateModal(
                        false
                    )
                }
                onCreated={
                    handleStatusCreated
                }
            />

            {/* ====================================================
                STATUS VIEWER
            ==================================================== */}

            {selectedStatuses.length >
                0 &&
                currentUserLoaded &&
                currentUserId && (
                    <StatusViewer
                        open={true}
                        statuses={
                            selectedStatuses
                        }
                        initialIndex={
                            selectedStatusIndex
                        }
                        currentUserId={
                            currentUserId
                        }
                        onClose={
                            handleCloseViewer
                        }
                        onDelete={
                            handleDeleteStatus
                        }
                        onViewed={
                            handleStatusViewed
                        }
                    />
                )}
        </main>
    );
}

// ============================================================
// LOADING CARD
// ============================================================

function LoadingCard() {
    return (
        <div
            className="
                overflow-hidden
                rounded-3xl
                border
                border-border
                bg-surface
            "
        >
            <div className="flex items-center gap-4 p-5">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-foreground/5" />

                <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 animate-pulse rounded-full bg-foreground/5" />
                    <div className="h-2.5 w-20 animate-pulse rounded-full bg-foreground/5" />
                </div>
            </div>
        </div>
    );
}

// ============================================================
// EMPTY UPDATES
// ============================================================

function EmptyUpdates() {
    return (
        <div
            className="
                relative
                overflow-hidden
                rounded-3xl
                border
                border-border
                bg-surface/80
                px-6
                py-14
                text-center
            "
        >
            <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

            <div
                className="
                    relative
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-border
                    bg-background
                    text-muted
                    shadow-sm
                "
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-7 w-7"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 12a8 8 0 1 1-2.34-5.66"
                    />

                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 5v5h-5"
                    />
                </svg>
            </div>

            <h3 className="relative mt-5 text-sm font-bold">
                No recent updates
            </h3>

            <p className="relative mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted">
                When your friends share a status,
                their updates will appear here.
            </p>
        </div>
    );
}

// ============================================================
// STATUS THUMBNAIL
// ============================================================

function StatusThumbnail({
    status,
}) {
    if (
        status?.mediaUrl &&
        status?.mediaType ===
            "IMAGE"
    ) {
        return (
            <div
                className="
                    relative
                    h-14
                    w-14
                    shrink-0
                    overflow-hidden
                    rounded-2xl
                    bg-background
                    shadow-sm
                "
            >
                <img
                    src={status.mediaUrl}
                    alt=""
                    className="
                        h-full
                        w-full
                        object-cover
                        transition-transform
                        duration-300
                        group-hover:scale-105
                    "
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
        );
    }

    if (
        status?.mediaUrl &&
        status?.mediaType ===
            "VIDEO"
    ) {
        return (
            <div
                className="
                    relative
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-2xl
                    bg-black
                    text-white
                    shadow-sm
                "
            >
                <video
                    src={status.mediaUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                />

                <span
                    className="
                        relative
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        bg-black/50
                        backdrop-blur-sm
                    "
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="ml-0.5 h-4 w-4"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </span>
            </div>
        );
    }

    return (
        <div
            className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                px-1.5
                text-center
                text-[10px]
                font-bold
                leading-tight
                text-white
                shadow-sm
            "
            style={{
                background:
                    status?.backgroundColor ||
                    "#6366f1",
            }}
        >
            {status?.content
                ? status.content.slice(
                      0,
                      18
                  )
                : "Status"}
        </div>
    );
}

// ============================================================
// STATUS AVATAR
// ============================================================

function StatusAvatar({
    user,
    hasUnviewed,
}) {
    const displayName =
        user?.displayName ||
        user?.username ||
        "User";

    const initial =
        displayName
            .charAt(0)
            .toUpperCase() ||
        "?";

    return (
        <div
            className={`
                relative
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-full
                p-[2px]
                ${
                    hasUnviewed
                        ? "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500"
                        : "bg-border"
                }
            `}
        >
            <div
                className="
                    flex
                    h-full
                    w-full
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    border-2
                    border-surface
                    bg-surface
                "
            >
                {user?.avatar ? (
                    <img
                        src={user.avatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-sm font-bold">
                        {initial}
                    </span>
                )}
            </div>

            {hasUnviewed && (
                <span
                    className="
                        absolute
                        bottom-0
                        right-0
                        h-3.5
                        w-3.5
                        rounded-full
                        border-2
                        border-surface
                        bg-green-500
                    "
                />
            )}
        </div>
    );
}