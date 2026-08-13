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

    // IMPORTANT:
    // Do not render/group statuses until we know
    // exactly who the current user is.
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
                        Number.isInteger(
                            userId
                        ) &&
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
    // GROUP STATUSES BY USER
    // ============================================================

    const groupedStatuses = useMemo(() => {
        /*
         * VERY IMPORTANT
         *
         * Do not group anything until we know
         * the current user's ID.
         */
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

            const userId =
                Number(
                    user?.id ??
                    status?.userId ??
                    0
                );

            if (
                !Number.isInteger(
                    userId
                ) ||
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
                const ownerId =
                    Number(
                        status?.user?.id ??
                        status?.userId ??
                        0
                    );

                return (
                    ownerId ===
                    Number(
                        currentUserId
                    )
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
                const ownerId =
                    Number(
                        group?.user?.id ??
                        0
                    );

                return (
                    ownerId !==
                    Number(
                        currentUserId
                    )
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

        /*
         * Extra safety:
         *
         * Never open a status here unless
         * it actually belongs to the current user.
         */

        const ownerId =
            Number(
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

        const ownerId =
            Number(
                group?.user?.id ??
                0
            );

        /*
         * CRITICAL SAFETY CHECK
         *
         * Never allow an own status to be
         * opened through the friend-status path.
         */

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

        setSelectedStatusIndex(
            0
        );
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
            setShowCreateModal(
                false
            );

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
                            method:
                                "DELETE",
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

                // ------------------------------------------------
                // REMOVE FROM MAIN STATUS LIST
                // ------------------------------------------------

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

                // ------------------------------------------------
                // REMOVE FROM CURRENT VIEWER
                // ------------------------------------------------

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
                        Number(
                            statusId
                        )
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
                        Number(
                            statusId
                        )
                            ? {
                                  ...status,
                                  viewed: true,
                              }
                            : status
                )
        );
    };

    // ============================================================
    // BACK TO CHAT
    // ============================================================

    const handleBack = () => {
        router.replace("/chat");
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <main className="min-h-screen bg-background text-foreground">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <header
                className="
                    sticky
                    top-0
                    z-20
                    flex
                    h-16
                    items-center
                    justify-between
                    border-b
                    border-border
                    bg-surface
                    px-4
                    md:px-6
                "
            >
                <div className="flex items-center gap-3">

                    {/* BACK */}

                    <button
                        type="button"
                        onClick={
                            handleBack
                        }
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            text-muted
                            transition
                            hover:bg-hover
                            hover:text-foreground
                        "
                        aria-label="Back to ChatHub"
                        title="Back to ChatHub"
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
                        <h1 className="text-lg font-semibold">
                            Status
                        </h1>

                        <p className="text-xs text-muted">
                            Updates from you and your friends
                        </p>
                    </div>
                </div>

                {/* NEW STATUS */}

                <button
                    type="button"
                    onClick={() =>
                        setShowCreateModal(
                            true
                        )
                    }
                    className="
                        flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-foreground
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-background
                        transition
                        hover:opacity-90
                    "
                >
                    <span className="text-lg leading-none">
                        +
                    </span>

                    New Status
                </button>
            </header>

            {/* ====================================================
                CONTENT
            ==================================================== */}

            <div
                className="
                    mx-auto
                    w-full
                    max-w-3xl
                    px-4
                    py-6
                "
            >

                {/* ERROR */}

                {error && (
                    <div
                        className="
                            mb-5
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

                {/* =================================================
                    MY STATUS
                ================================================= */}

                <section className="mb-8">

                    <div
                        className="
                            mb-3
                            flex
                            items-center
                            justify-between
                        "
                    >
                        <h2 className="text-sm font-semibold">
                            My Status
                        </h2>

                        {myStatuses.length >
                            0 && (
                            <span className="text-xs text-muted">
                                {
                                    myStatuses.length
                                }{" "}
                                active{" "}
                                {myStatuses.length ===
                                1
                                    ? "update"
                                    : "updates"}
                            </span>
                        )}
                    </div>

                    {!currentUserLoaded ? (
                        <div
                            className="
                                rounded-2xl
                                border
                                border-border
                                bg-surface
                                px-5
                                py-8
                                text-center
                                text-sm
                                text-muted
                            "
                        >
                            Loading...
                        </div>
                    ) : myStatuses.length >
                      0 ? (
                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-border
                                bg-surface
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
                                            flex
                                            w-full
                                            items-center
                                            gap-4
                                            border-b
                                            border-border
                                            px-4
                                            py-4
                                            text-left
                                            transition
                                            last:border-b-0
                                            hover:bg-hover
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

                                            <p className="mt-1 text-xs text-muted">
                                                Tap to view
                                            </p>
                                        </div>

                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-5 w-5 text-muted"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m9 18 6-6-6-6"
                                            />
                                        </svg>
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
                                flex
                                w-full
                                items-center
                                gap-4
                                rounded-2xl
                                border
                                border-dashed
                                border-border
                                bg-surface
                                p-5
                                text-left
                                transition
                                hover:bg-hover
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-foreground
                                    text-2xl
                                    text-background
                                "
                            >
                                +
                            </div>

                            <div>
                                <p className="text-sm font-semibold">
                                    Add a status
                                </p>

                                <p className="mt-1 text-xs text-muted">
                                    Share a photo, video, or text
                                </p>
                            </div>
                        </button>
                    )}
                </section>

                {/* =================================================
                    FRIEND STATUSES
                ================================================= */}

                <section>

                    <div className="mb-3">
                        <h2 className="text-sm font-semibold">
                            Recent Updates
                        </h2>
                    </div>

                    {loading ||
                    !currentUserLoaded ? (
                        <div
                            className="
                                rounded-2xl
                                border
                                border-border
                                bg-surface
                                px-5
                                py-8
                                text-center
                                text-sm
                                text-muted
                            "
                        >
                            Loading statuses...
                        </div>
                    ) : friendGroups.length ===
                      0 ? (
                        <div
                            className="
                                rounded-2xl
                                border
                                border-border
                                bg-surface
                                px-5
                                py-10
                                text-center
                            "
                        >
                            <div className="text-3xl">
                                ◌
                            </div>

                            <p className="mt-3 text-sm font-medium">
                                No friend updates
                            </p>

                            <p className="mt-1 text-xs text-muted">
                                Your friends' active statuses
                                will appear here.
                            </p>
                        </div>
                    ) : (
                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-border
                                bg-surface
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
                                                flex
                                                w-full
                                                items-center
                                                gap-4
                                                border-b
                                                border-border
                                                px-4
                                                py-4
                                                text-left
                                                transition
                                                last:border-b-0
                                                hover:bg-hover
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
                                                <p className="truncate text-sm font-semibold">
                                                    {group
                                                        .user
                                                        .displayName ||
                                                        group
                                                            .user
                                                            .username ||
                                                        "User"}
                                                </p>

                                                <p className="mt-1 text-xs text-muted">
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
                                                </p>
                                            </div>

                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                className="h-5 w-5 text-muted"
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
                        </div>
                    )}
                </section>
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
            <img
                src={status.mediaUrl}
                alt=""
                className="
                    h-12
                    w-12
                    shrink-0
                    rounded-xl
                    object-cover
                "
            />
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
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-xl
                    bg-black
                    text-white
                "
            >
                ▶
            </div>
        );
    }

    return (
        <div
            className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                px-1
                text-center
                text-[9px]
                font-semibold
                text-white
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
                      12
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
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border-2
                ${
                    hasUnviewed
                        ? "border-green-500"
                        : "border-border"
                }
                bg-surface
            `}
        >
            {user?.avatar ? (
                <img
                    src={
                        user.avatar
                    }
                    alt={
                        displayName
                    }
                    className="
                        h-full
                        w-full
                        object-cover
                    "
                />
            ) : (
                <span className="text-sm font-bold">
                    {initial}
                </span>
            )}
        </div>
    );
}