"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const STATUS_REACTIONS = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
];

export default function StatusViewer({
    open,
    statuses = [],
    initialIndex = 0,
    currentUserId,
    onClose,
    onDelete,
    onViewed,
    onReplySent,
}) {
    // ============================================================
    // VIEWER STATE
    // ============================================================

    const [currentIndex, setCurrentIndex] =
        useState(initialIndex);

    const [progress, setProgress] =
        useState(0);

    const [loadingView, setLoadingView] =
        useState(false);

    const [showMenu, setShowMenu] =
        useState(false);

    // ============================================================
    // VIEWERS
    // ============================================================

    const [statusViewers, setStatusViewers] =
        useState([]);

    const [loadingViewers, setLoadingViewers] =
        useState(false);

    const [showViewers, setShowViewers] =
        useState(false);

    const loadingViewersRef =
        useRef(false);

    // ============================================================
    // VIEW REQUEST TRACKER
    // ============================================================

    const viewedStatusIdsRef =
        useRef(new Set());

    // ============================================================
    // REACTION
    // ============================================================

    const [currentReaction, setCurrentReaction] =
        useState(null);

    const [loadingReaction, setLoadingReaction] =
        useState(false);

    // ============================================================
    // REPLY
    // ============================================================

    const [replyMessage, setReplyMessage] =
        useState("");

    const [sendingReply, setSendingReply] =
        useState(false);

    // ============================================================
    // CURRENT STATUS
    // ============================================================

    const currentStatus =
        statuses[currentIndex] || null;

    // ============================================================
    // OWNER
    // ============================================================

    const owner =
        currentStatus?.user || {};

    const ownerId =
        owner?.id ??
        currentStatus?.userId ??
        null;

    const normalizedOwnerId =
        Number(ownerId);

    const normalizedCurrentUserId =
        Number(currentUserId);

    const isOwnStatus =
        Number.isInteger(
            normalizedOwnerId
        ) &&
        Number.isInteger(
            normalizedCurrentUserId
        ) &&
        normalizedOwnerId > 0 &&
        normalizedCurrentUserId > 0 &&
        normalizedOwnerId ===
            normalizedCurrentUserId;

    // ============================================================
    // OWNER NAME
    // ============================================================

    const ownerName =
        owner?.displayName ||
        owner?.username ||
        "User";

    const ownerInitial =
        ownerName
            .charAt(0)
            .toUpperCase() ||
        "?";

    // ============================================================
    // STATUS TIME
    // ============================================================

    const statusTime = useMemo(() => {
        if (!currentStatus?.createdAt) {
            return "";
        }

        const date =
            new Date(
                currentStatus.createdAt
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }

        return date.toLocaleTimeString(
            [],
            {
                hour: "numeric",
                minute: "2-digit",
            }
        );
    }, [
        currentStatus?.createdAt,
    ]);

    // ============================================================
    // VIEWER COUNT
    // ============================================================

    const viewerCount =
        statusViewers.length;

    // ============================================================
    // LOAD VIEWERS
    // ============================================================

    const loadViewers = useCallback(
        async (statusId) => {
            if (
                !statusId ||
                !currentUserId ||
                loadingViewersRef.current
            ) {
                return;
            }

            const status =
                statuses.find(
                    (item) =>
                        Number(item.id) ===
                        Number(statusId)
                );

            if (!status) {
                setStatusViewers([]);
                return;
            }

            const statusOwnerId =
                status?.user?.id ??
                status?.userId ??
                null;

            if (
                Number(statusOwnerId) !==
                Number(currentUserId)
            ) {
                setStatusViewers([]);
                return;
            }

            try {
                loadingViewersRef.current =
                    true;

                setLoadingViewers(true);

                const response =
                    await fetch(
                        `/api/status/${statusId}/viewers`,
                        {
                            method: "GET",
                            credentials:
                                "include",
                            cache: "no-store",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(
                            () => null
                        );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    setStatusViewers([]);
                    return;
                }

                const viewers =
                    Array.isArray(
                        data.viewers
                    )
                        ? data.viewers
                        : [];

                setStatusViewers(
                    viewers
                );
            } catch (error) {
                console.error(
                    "STATUS VIEWERS LOAD ERROR:",
                    error
                );

                setStatusViewers([]);
            } finally {
                loadingViewersRef.current =
                    false;

                setLoadingViewers(false);
            }
        },
        [
            currentUserId,
            statuses,
        ]
    );

    // ============================================================
    // RESET WHEN OPENING
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        const safeIndex =
            Math.min(
                Math.max(
                    Number(
                        initialIndex
                    ) || 0,
                    0
                ),
                Math.max(
                    statuses.length - 1,
                    0
                )
            );

        setCurrentIndex(
            safeIndex
        );

        setProgress(0);
        setShowMenu(false);
        setShowViewers(false);
        setReplyMessage("");
        setCurrentReaction(null);
        setStatusViewers([]);

        loadingViewersRef.current =
            false;

        viewedStatusIdsRef.current =
            new Set();
    }, [
        open,
        initialIndex,
        statuses.length,
    ]);

    // ============================================================
    // CURRENT STATUS CHANGED
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus?.id
        ) {
            return;
        }

        setProgress(0);
        setShowMenu(false);
        setShowViewers(false);
        setReplyMessage("");
        setCurrentReaction(null);
        setStatusViewers([]);

        loadingViewersRef.current =
            false;
    }, [
        open,
        currentStatus?.id,
    ]);

    // ============================================================
    // LOAD VIEWERS FOR OWNER
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus?.id ||
            !isOwnStatus
        ) {
            return;
        }

        loadViewers(
            currentStatus.id
        );
    }, [
        open,
        currentStatus?.id,
        isOwnStatus,
        loadViewers,
    ]);

    // ============================================================
    // TOGGLE VIEWERS
    // ============================================================

    const handleToggleViewers =
        useCallback(() => {
            if (
                !isOwnStatus ||
                !currentStatus?.id
            ) {
                return;
            }

            setShowMenu(false);

            if (showViewers) {
                setShowViewers(false);
                return;
            }

            setShowViewers(true);

            loadViewers(
                currentStatus.id
            );
        }, [
            isOwnStatus,
            currentStatus?.id,
            showViewers,
            loadViewers,
        ]);

    // ============================================================
    // LOAD CURRENT REACTION
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus?.id
        ) {
            return;
        }

        if (isOwnStatus) {
            setCurrentReaction(null);
            return;
        }

        let cancelled = false;

        const loadReaction =
            async () => {
                try {
                    const response =
                        await fetch(
                            `/api/status/${currentStatus.id}/reaction`,
                            {
                                method: "GET",
                                credentials:
                                    "include",
                                cache: "no-store",
                                headers: {
                                    Accept:
                                        "application/json",
                                },
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (
                        !response.ok ||
                        !data?.success
                    ) {
                        return;
                    }

                    if (
                        !cancelled
                    ) {
                        setCurrentReaction(
                            data?.reaction
                                ?.reaction ||
                                null
                        );
                    }
                } catch (error) {
                    if (
                        !cancelled
                    ) {
                        console.error(
                            "STATUS REACTION LOAD ERROR:",
                            error
                        );
                    }
                }
            };

        loadReaction();

        return () => {
            cancelled = true;
        };
    }, [
        open,
        currentStatus?.id,
        isOwnStatus,
    ]);

    // ============================================================
    // MARK STATUS VIEWED
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus?.id ||
            !currentUserId ||
            isOwnStatus
        ) {
            return;
        }

        const statusId =
            Number(
                currentStatus.id
            );

        if (
            viewedStatusIdsRef.current.has(
                statusId
            )
        ) {
            return;
        }

        viewedStatusIdsRef.current.add(
            statusId
        );

        let cancelled = false;

        const markViewed =
            async () => {
                try {
                    setLoadingView(true);

                    const response =
                        await fetch(
                            `/api/status/${statusId}/view`,
                            {
                                method: "POST",
                                credentials:
                                    "include",
                                headers: {
                                    Accept:
                                        "application/json",
                                },
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (
                        !response.ok ||
                        !data?.success
                    ) {
                        viewedStatusIdsRef.current.delete(
                            statusId
                        );

                        return;
                    }

                    if (
                        !cancelled &&
                        onViewed
                    ) {
                        onViewed(
                            statusId
                        );
                    }
                } catch (error) {
                    viewedStatusIdsRef.current.delete(
                        statusId
                    );

                    if (
                        !cancelled
                    ) {
                        console.error(
                            "STATUS VIEW ERROR:",
                            error
                        );
                    }
                } finally {
                    if (
                        !cancelled
                    ) {
                        setLoadingView(
                            false
                        );
                    }
                }
            };

        markViewed();

        return () => {
            cancelled = true;
        };
    }, [
        open,
        currentStatus?.id,
        isOwnStatus,
        currentUserId,
        ownerId,
        onViewed,
    ]);

    // ============================================================
    // NEXT
    // ============================================================

    const goNext =
        useCallback(() => {
            if (
                currentIndex <
                statuses.length - 1
            ) {
                setCurrentIndex(
                    (previous) =>
                        previous + 1
                );

                setProgress(0);
                setShowMenu(false);
                setShowViewers(false);
                setReplyMessage("");
                setCurrentReaction(null);
                setStatusViewers([]);

                return;
            }

            onClose?.();
        }, [
            currentIndex,
            statuses.length,
            onClose,
        ]);

    // ============================================================
    // PREVIOUS
    // ============================================================

    const goPrevious =
        useCallback(() => {
            if (
                currentIndex > 0
            ) {
                setCurrentIndex(
                    (previous) =>
                        previous - 1
                );

                setProgress(0);
                setShowMenu(false);
                setShowViewers(false);
                setReplyMessage("");
                setCurrentReaction(null);
                setStatusViewers([]);
            }
        }, [
            currentIndex,
        ]);

    // ============================================================
    // REACTION
    // ============================================================

    const handleReaction =
        async (reaction) => {
            if (
                !currentStatus?.id ||
                loadingReaction ||
                sendingReply ||
                isOwnStatus
            ) {
                return;
            }

            if (
                currentReaction ===
                reaction
            ) {
                try {
                    setLoadingReaction(
                        true
                    );

                    const response =
                        await fetch(
                            `/api/status/${currentStatus.id}/reaction`,
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
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (
                        !response.ok ||
                        !data?.success
                    ) {
                        return;
                    }

                    setCurrentReaction(
                        null
                    );
                } catch (error) {
                    console.error(
                        "STATUS REACTION DELETE ERROR:",
                        error
                    );
                } finally {
                    setLoadingReaction(
                        false
                    );
                }

                return;
            }

            try {
                setLoadingReaction(
                    true
                );

                const response =
                    await fetch(
                        `/api/status/${currentStatus.id}/reaction`,
                        {
                            method: "POST",
                            credentials:
                                "include",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                Accept:
                                    "application/json",
                            },
                            body: JSON.stringify(
                                {
                                    reaction,
                                    message: "",
                                }
                            ),
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(
                            () => null
                        );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    return;
                }

                setCurrentReaction(
                    data?.reaction
                        ?.reaction ||
                        reaction
                );

                const createdMessage =
                    data?.chatMessage ||
                    null;

                const statusPreview =
                    data?.status ||
                    currentStatus;

                if (
                    onReplySent &&
                    createdMessage
                ) {
                    onReplySent({
                        message:
                            createdMessage,
                        status:
                            statusPreview,
                        kind: "REACTION",
                    });
                }
            } catch (error) {
                console.error(
                    "STATUS REACTION ERROR:",
                    error
                );
            } finally {
                setLoadingReaction(
                    false
                );
            }
        };

    // ============================================================
    // SEND REPLY
    // ============================================================

    const handleSendReply =
        async () => {
            const trimmedMessage =
                replyMessage.trim();

            if (
                !currentStatus?.id ||
                !trimmedMessage ||
                sendingReply ||
                isOwnStatus
            ) {
                return;
            }

            try {
                setSendingReply(true);

                const response =
                    await fetch(
                        `/api/status/${currentStatus.id}/reaction`,
                        {
                            method: "POST",
                            credentials:
                                "include",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                Accept:
                                    "application/json",
                            },
                            body: JSON.stringify(
                                {
                                    reaction:
                                        currentReaction ||
                                        "👍",
                                    message:
                                        trimmedMessage,
                                }
                            ),
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(
                            () => null
                        );

                if (
                    !response.ok ||
                    !data?.success
                ) {
                    return;
                }

                const createdMessage =
                    data?.chatMessage ||
                    null;

                const statusPreview =
                    data?.status ||
                    currentStatus;

                if (
                    onReplySent &&
                    createdMessage
                ) {
                    onReplySent({
                        message:
                            createdMessage,
                        status:
                            statusPreview,
                        kind: "TEXT",
                    });
                }

                setReplyMessage("");
            } catch (error) {
                console.error(
                    "STATUS REPLY ERROR:",
                    error
                );
            } finally {
                setSendingReply(false);
            }
        };

    // ============================================================
    // REPLY KEYBOARD
    // ============================================================

    const handleReplyKeyDown =
        (event) => {
            if (
                event.key ===
                    "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();
                handleSendReply();
            }
        };

    // ============================================================
    // AUTO PROGRESS
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus ||
            currentStatus.mediaType ===
                "VIDEO"
        ) {
            return;
        }

        const duration = 7000;
        const intervalTime = 50;

        const interval =
            setInterval(() => {
                setProgress(
                    (previous) => {
                        const next =
                            previous +
                            (intervalTime /
                                duration) *
                                100;

                        return Math.min(
                            next,
                            100
                        );
                    }
                );
            }, intervalTime);

        const timeout =
            setTimeout(() => {
                goNext();
            }, duration);

        return () => {
            clearInterval(
                interval
            );

            clearTimeout(
                timeout
            );
        };
    }, [
        open,
        currentStatus?.id,
        currentStatus?.mediaType,
        goNext,
    ]);

    // ============================================================
    // VIDEO PROGRESS
    // ============================================================

    const handleVideoTimeUpdate =
        (event) => {
            const video =
                event.currentTarget;

            if (
                !video.duration ||
                Number.isNaN(
                    video.duration
                )
            ) {
                return;
            }

            setProgress(
                Math.min(
                    100,
                    Math.max(
                        0,
                        (video.currentTime /
                            video.duration) *
                            100
                    )
                )
            );
        };

    // ============================================================
    // VIDEO ENDED
    // ============================================================

    const handleVideoEnded =
        () => {
            goNext();
        };

    // ============================================================
    // KEYBOARD
    // ============================================================

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown =
            (event) => {
                const activeElement =
                    document.activeElement;

                const isTyping =
                    activeElement?.tagName ===
                        "INPUT" ||
                    activeElement?.tagName ===
                        "TEXTAREA";

                if (
                    event.key ===
                    "Escape"
                ) {
                    if (
                        showViewers
                    ) {
                        setShowViewers(
                            false
                        );
                        return;
                    }

                    if (showMenu) {
                        setShowMenu(
                            false
                        );
                        return;
                    }

                    onClose?.();
                    return;
                }

                if (isTyping) {
                    return;
                }

                if (
                    event.key ===
                    "ArrowRight"
                ) {
                    goNext();
                }

                if (
                    event.key ===
                    "ArrowLeft"
                ) {
                    goPrevious();
                }
            };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [
        open,
        showViewers,
        showMenu,
        onClose,
        goNext,
        goPrevious,
    ]);

    // ============================================================
    // FORMAT VIEW TIME
    // ============================================================

    const formatViewedTime =
        (viewedAt) => {
            if (!viewedAt) {
                return "";
            }

            const date =
                new Date(
                    viewedAt
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return "";
            }

            return date.toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit",
                }
            );
        };

    // ============================================================
    // DELETE
    // ============================================================

    const handleDelete =
        async () => {
            if (
                !isOwnStatus ||
                !onDelete ||
                !currentStatus?.id
            ) {
                return;
            }

            setShowMenu(false);
            setShowViewers(false);

            await onDelete(
                currentStatus.id
            );
        };

    // ============================================================
    // NOTHING TO RENDER
    // ============================================================

    if (
        !open ||
        !currentStatus
    ) {
        return null;
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className="
                fixed
                inset-0
                z-[300]
                flex
                items-center
                justify-center
                bg-black
            "
        >
            {/* OUTER DESKTOP BACKDROP */}

            <div
                className="
                    absolute
                    inset-0
                    hidden
                    bg-black/90
                    md:block
                "
            />

            <div
                className="
                    relative
                    flex
                    h-full
                    w-full
                    flex-col
                    overflow-hidden
                    bg-black
                    shadow-2xl
                    md:h-[96vh]
                    md:max-h-[900px]
                    md:w-[520px]
                    md:rounded-3xl
                    md:ring-1
                    md:ring-white/10
                "
            >
                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <div
                    className="
                        absolute
                        left-4
                        right-4
                        top-3
                        z-[80]
                        flex
                        gap-1
                    "
                >
                    {statuses.map(
                        (
                            status,
                            index
                        ) => (
                            <div
                                key={
                                    status.id
                                }
                                className="
                                    h-[3px]
                                    flex-1
                                    overflow-hidden
                                    rounded-full
                                    bg-white/25
                                "
                            >
                                <div
                                    className="
                                        h-full
                                        rounded-full
                                        bg-white
                                        shadow-[0_0_8px_rgba(255,255,255,0.45)]
                                        transition-[width]
                                        duration-75
                                    "
                                    style={{
                                        width:
                                            index <
                                            currentIndex
                                                ? "100%"
                                                : index ===
                                                  currentIndex
                                                ? `${progress}%`
                                                : "0%",
                                    }}
                                />
                            </div>
                        )
                    )}
                </div>

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div
                    className="
                        absolute
                        left-0
                        right-0
                        top-0
                        z-50
                        flex
                        items-center
                        justify-between
                        bg-gradient-to-b
                        from-black/90
                        via-black/55
                        to-transparent
                        px-4
                        pb-10
                        pt-7
                    "
                >
                    {/* OWNER */}

                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="
                                h-11
                                w-11
                                shrink-0
                                rounded-full
                                bg-gradient-to-br
                                from-white/40
                                to-white/10
                                p-[2px]
                            "
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
                                    bg-[#202020]
                                    text-sm
                                    font-bold
                                    text-white
                                "
                            >
                                {owner.avatar ? (
                                    <img
                                        src={
                                            owner.avatar
                                        }
                                        alt={
                                            ownerName
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    ownerInitial
                                )}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                    {
                                        ownerName
                                    }
                                </p>

                                {isOwnStatus && (
                                    <span
                                        className="
                                            rounded-full
                                            border
                                            border-white/10
                                            bg-white/10
                                            px-2
                                            py-0.5
                                            text-[9px]
                                            font-semibold
                                            uppercase
                                            tracking-wide
                                            text-white/70
                                        "
                                    >
                                        You
                                    </span>
                                )}
                            </div>

                            <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-white/40" />

                                <p className="text-[11px] text-white/55">
                                    {statusTime}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* HEADER ACTIONS */}

                    <div className="flex items-center gap-1">
                        {isOwnStatus && (
                            <button
                                type="button"
                                onClick={
                                    handleToggleViewers
                                }
                                className="
                                    flex
                                    h-10
                                    items-center
                                    gap-1.5
                                    rounded-full
                                    border
                                    border-white/10
                                    bg-white/5
                                    px-3
                                    text-white
                                    backdrop-blur-xl
                                    transition-all
                                    hover:bg-white/10
                                "
                                aria-label="View status viewers"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-4.5 w-4.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
                                    />

                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="2.75"
                                    />
                                </svg>

                                <span className="text-xs font-semibold">
                                    {
                                        viewerCount
                                    }
                                </span>
                            </button>
                        )}

                        {isOwnStatus && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMenu(
                                            (
                                                previous
                                            ) =>
                                                !previous
                                        );

                                        setShowViewers(
                                            false
                                        );
                                    }}
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-white/10
                                        bg-white/5
                                        text-white
                                        backdrop-blur-xl
                                        transition-all
                                        hover:bg-white/10
                                    "
                                    aria-label="Status options"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-5 w-5"
                                    >
                                        <circle
                                            cx="5"
                                            cy="12"
                                            r="1.6"
                                        />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="1.6"
                                        />

                                        <circle
                                            cx="19"
                                            cy="12"
                                            r="1.6"
                                        />
                                    </svg>
                                </button>

                                {showMenu && (
                                    <div
                                        className="
                                            absolute
                                            right-0
                                            top-12
                                            z-[100]
                                            w-44
                                            overflow-hidden
                                            rounded-2xl
                                            border
                                            border-white/10
                                            bg-[#171717]/95
                                            p-1
                                            shadow-2xl
                                            backdrop-blur-2xl
                                        "
                                    >
                                        <button
                                            type="button"
                                            onClick={
                                                handleDelete
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                rounded-xl
                                                px-3
                                                py-3
                                                text-left
                                                text-sm
                                                font-medium
                                                text-red-400
                                                transition
                                                hover:bg-red-500/10
                                            "
                                        >
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
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
                                                        d="M3 6h18"
                                                    />

                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M8 6V4h8v2"
                                                    />

                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M19 6l-1 14H6L5 6"
                                                    />
                                                </svg>
                                            </span>

                                            Delete status
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-white/10
                                bg-white/5
                                text-white
                                backdrop-blur-xl
                                transition-all
                                hover:bg-white/10
                            "
                            aria-label="Close status"
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
                                    d="M6 6l12 12M18 6 6 18"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ==================================================
                    VIEWERS PANEL
                ================================================== */}

                {isOwnStatus &&
                    showViewers && (
                        <div
                            className="
                                absolute
                                left-3
                                right-3
                                top-[82px]
                                z-[100]
                                max-h-[62vh]
                                overflow-hidden
                                rounded-3xl
                                border
                                border-white/10
                                bg-[#111111]/95
                                shadow-2xl
                                backdrop-blur-2xl
                            "
                        >
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    border-b
                                    border-white/10
                                    px-4
                                    py-4
                                "
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            className="h-5 w-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
                                            />

                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="2.75"
                                            />
                                        </svg>
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Viewed by
                                        </p>

                                        <p className="mt-0.5 text-[11px] text-white/45">
                                            {
                                                viewerCount
                                            }{" "}
                                            {viewerCount ===
                                            1
                                                ? "viewer"
                                                : "viewers"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowViewers(
                                            false
                                        )
                                    }
                                    className="
                                        flex
                                        h-8
                                        w-8
                                        items-center
                                        justify-center
                                        rounded-full
                                        text-white/50
                                        transition
                                        hover:bg-white/10
                                        hover:text-white
                                    "
                                    aria-label="Close viewers"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="max-h-[calc(62vh-75px)] overflow-y-auto">
                                {loadingViewers ? (
                                    <div className="flex flex-col items-center justify-center px-4 py-12">
                                        <span
                                            className="
                                                h-7
                                                w-7
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/10
                                                border-t-white
                                            "
                                        />

                                        <p className="mt-3 text-xs text-white/45">
                                            Loading viewers...
                                        </p>
                                    </div>
                                ) : viewerCount ===
                                  0 ? (
                                    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                className="h-6 w-6"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
                                                />

                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="2.75"
                                                />
                                            </svg>
                                        </div>

                                        <p className="mt-4 text-sm font-semibold text-white">
                                            No views yet
                                        </p>

                                        <p className="mt-1 max-w-[230px] text-xs leading-relaxed text-white/35">
                                            People who view
                                            your status will
                                            appear here.
                                        </p>
                                    </div>
                                ) : (
                                    statusViewers.map(
                                        (
                                            viewer
                                        ) => {
                                            const user =
                                                viewer?.user ||
                                                {};

                                            const name =
                                                user.displayName ||
                                                user.username ||
                                                `User ${
                                                    user.id ||
                                                    ""
                                                }`;

                                            const initial =
                                                name
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase() ||
                                                "?";

                                            return (
                                                <div
                                                    key={
                                                        viewer.id ||
                                                        `${viewer.statusId}-${viewer.userId}`
                                                    }
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-3
                                                        border-b
                                                        border-white/5
                                                        px-4
                                                        py-3
                                                        last:border-b-0
                                                        hover:bg-white/[0.03]
                                                    "
                                                >
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 p-[1.5px]">
                                                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#202020] text-sm font-semibold text-white">
                                                            {user.avatar ? (
                                                                <img
                                                                    src={
                                                                        user.avatar
                                                                    }
                                                                    alt={
                                                                        name
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                initial
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-white">
                                                            {
                                                                name
                                                            }
                                                        </p>

                                                        {user.username &&
                                                            user.displayName && (
                                                                <p className="mt-0.5 truncate text-[11px] text-white/35">
                                                                    @
                                                                    {
                                                                        user.username
                                                                    }
                                                                </p>
                                                            )}
                                                    </div>

                                                    <span className="shrink-0 text-[11px] text-white/35">
                                                        {formatViewedTime(
                                                            viewer.viewedAt
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    )
                                )}
                            </div>
                        </div>
                    )}

                {/* ==================================================
                    MEDIA
                ================================================== */}

                <div
                    className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
                    style={{
                        backgroundColor:
                            !currentStatus.mediaUrl
                                ? currentStatus.backgroundColor ||
                                  "#1f2937"
                                : "#000000",
                    }}
                >
                    {/* SUBTLE MEDIA GLOW */}

                    {!currentStatus.mediaUrl && (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />
                    )}

                    {/* PREVIOUS */}

                    <button
                        type="button"
                        onClick={
                            goPrevious
                        }
                        disabled={
                            currentIndex ===
                            0
                        }
                        className="
                            absolute
                            left-0
                            top-0
                            z-20
                            h-full
                            w-1/4
                            cursor-pointer
                            disabled:cursor-default
                        "
                        aria-label="Previous status"
                    />

                    {/* NEXT */}

                    <button
                        type="button"
                        onClick={
                            goNext
                        }
                        className="
                            absolute
                            right-0
                            top-0
                            z-20
                            h-full
                            w-1/4
                            cursor-pointer
                        "
                        aria-label="Next status"
                    />

                    {/* IMAGE */}

                    {currentStatus.mediaType ===
                        "IMAGE" &&
                        currentStatus.mediaUrl && (
                            <img
                                src={
                                    currentStatus.mediaUrl
                                }
                                alt={
                                    currentStatus.mediaName ||
                                    "Status"
                                }
                                draggable="false"
                                className="
                                    max-h-full
                                    max-w-full
                                    select-none
                                    object-contain
                                "
                            />
                        )}

                    {/* VIDEO */}

                    {currentStatus.mediaType ===
                        "VIDEO" &&
                        currentStatus.mediaUrl && (
                            <video
                                key={
                                    currentStatus.id
                                }
                                src={
                                    currentStatus.mediaUrl
                                }
                                autoPlay
                                playsInline
                                controls
                                onTimeUpdate={
                                    handleVideoTimeUpdate
                                }
                                onEnded={
                                    handleVideoEnded
                                }
                                className="
                                    max-h-full
                                    max-w-full
                                    object-contain
                                "
                            />
                        )}

                    {/* TEXT */}

                    {!currentStatus.mediaUrl &&
                        currentStatus.content && (
                            <div
                                className="
                                    relative
                                    flex
                                    max-h-full
                                    w-full
                                    items-center
                                    justify-center
                                    overflow-y-auto
                                    px-10
                                    py-28
                                "
                            >
                                <div className="max-w-[430px]">
                                    <p
                                        className="
                                            whitespace-pre-wrap
                                            break-words
                                            text-center
                                            text-[28px]
                                            font-bold
                                            leading-[1.35]
                                            tracking-tight
                                            text-white
                                            drop-shadow-lg
                                            sm:text-[32px]
                                        "
                                    >
                                        {
                                            currentStatus.content
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                    {/* CAPTION */}

                    {currentStatus.mediaUrl &&
                        currentStatus.content && (
                            <div
                                className="
                                    absolute
                                    bottom-0
                                    left-0
                                    right-0
                                    z-10
                                    bg-gradient-to-t
                                    from-black/90
                                    via-black/50
                                    to-transparent
                                    px-6
                                    pb-36
                                    pt-24
                                "
                            >
                                <p
                                    className="
                                        whitespace-pre-wrap
                                        text-center
                                        text-base
                                        font-medium
                                        leading-relaxed
                                        text-white
                                        drop-shadow-md
                                    "
                                >
                                    {
                                        currentStatus.content
                                    }
                                </p>
                            </div>
                        )}

                    {/* ==================================================
                        REACTION + REPLY
                    ================================================== */}

                    {!isOwnStatus && (
                        <div
                            className="
                                absolute
                                bottom-3
                                left-3
                                right-3
                                z-40
                                flex
                                flex-col
                                gap-2
                            "
                        >
                            {/* REPLY INDICATOR */}

                            <div className="flex items-center justify-center gap-2 text-[10px] text-white/45">
                                <span className="h-1 w-1 rounded-full bg-white/40" />

                                <span>
                                    Replying to
                                </span>

                                <span className="font-semibold text-white/70">
                                    {
                                        ownerName
                                    }
                                    's status
                                </span>
                            </div>

                            {/* REACTION DOCK */}

                            <div className="mx-auto rounded-full border border-white/10 bg-black/55 p-1.5 shadow-2xl backdrop-blur-xl">
                                <div className="flex items-center gap-0.5">
                                    {STATUS_REACTIONS.map(
                                        (
                                            reaction
                                        ) => {
                                            const selected =
                                                currentReaction ===
                                                reaction;

                                            return (
                                                <button
                                                    key={
                                                        reaction
                                                    }
                                                    type="button"
                                                    disabled={
                                                        loadingReaction ||
                                                        sendingReply
                                                    }
                                                    onClick={() =>
                                                        handleReaction(
                                                            reaction
                                                        )
                                                    }
                                                    className={`
                                                        flex
                                                        h-10
                                                        w-10
                                                        items-center
                                                        justify-center
                                                        rounded-full
                                                        text-[19px]
                                                        transition-all
                                                        duration-200
                                                        ${
                                                            selected
                                                                ? "scale-110 bg-white/20 shadow-lg"
                                                                : "hover:scale-110 hover:bg-white/10"
                                                        }
                                                        ${
                                                            loadingReaction ||
                                                            sendingReply
                                                                ? "cursor-not-allowed opacity-40"
                                                                : ""
                                                        }
                                                    `}
                                                    aria-label={`React ${reaction}`}
                                                    aria-pressed={
                                                        selected
                                                    }
                                                >
                                                    {
                                                        reaction
                                                    }
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            {/* REPLY INPUT */}

                            <div
                                className="
                                    flex
                                    items-end
                                    gap-2
                                    rounded-2xl
                                    border
                                    border-white/10
                                    bg-black/65
                                    p-1.5
                                    shadow-2xl
                                    backdrop-blur-2xl
                                "
                            >
                                <textarea
                                    value={
                                        replyMessage
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setReplyMessage(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    onKeyDown={
                                        handleReplyKeyDown
                                    }
                                    placeholder={`Reply to ${ownerName}...`}
                                    rows={1}
                                    maxLength={
                                        1000
                                    }
                                    disabled={
                                        sendingReply
                                    }
                                    className="
                                        max-h-24
                                        min-h-10
                                        flex-1
                                        resize-none
                                        bg-transparent
                                        px-3
                                        py-2.5
                                        text-sm
                                        text-white
                                        outline-none
                                        placeholder:text-white/35
                                    "
                                />

                                <button
                                    type="button"
                                    onClick={
                                        handleSendReply
                                    }
                                    disabled={
                                        !replyMessage.trim() ||
                                        sendingReply
                                    }
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-white
                                        text-black
                                        shadow-lg
                                        transition-all
                                        hover:scale-105
                                        hover:bg-white/90
                                        active:scale-95
                                        disabled:cursor-not-allowed
                                        disabled:opacity-30
                                    "
                                    aria-label="Send status reply"
                                >
                                    {sendingReply ? (
                                        <span
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-black/20
                                                border-t-black
                                            "
                                        />
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-4.5 w-4.5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M22 2 11 13"
                                            />

                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m22 2-7 20-4-9-9-4Z"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VIEW LOADING */}

                    {loadingView && (
                        <div
                            className="
                                pointer-events-none
                                absolute
                                bottom-5
                                right-5
                                z-30
                                flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded-full
                                bg-black/30
                                backdrop-blur
                            "
                        >
                            <span
                                className="
                                    h-3.5
                                    w-3.5
                                    animate-spin
                                    rounded-full
                                    border
                                    border-white/20
                                    border-t-white
                                "
                            />
                        </div>
                    )}
                </div>

                {/* ==================================================
                    DESKTOP SIDE HINT
                ================================================== */}

                <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-[9px] text-white/30 backdrop-blur md:flex">
                    <span>←</span>
                    <span>Use arrow keys to navigate</span>
                    <span>→</span>
                </div>
            </div>
        </div>
    );
}