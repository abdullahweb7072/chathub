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
    //
    // IMPORTANT:
    //
    // The owner of a status comes from the status object.
    //
    // We intentionally prefer:
    //
    // currentStatus.user.id
    //
    // because `user` is the actual relation belonging to
    // this status.
    //
    // Only fall back to currentStatus.userId if the relation
    // is unavailable.
    //
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

    // ============================================================
    // IS OWN STATUS
    // ============================================================

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
    // DEBUG
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus
        ) {
            return;
        }

        console.log(
            "========================================"
        );

        console.log(
            "STATUS VIEWER DEBUG"
        );

        console.log(
            "Status ID:",
            currentStatus.id
        );

        console.log(
            "Current User ID:",
            currentUserId
        );

        console.log(
            "Current Status user.id:",
            currentStatus?.user?.id
        );

        console.log(
            "Current Status userId:",
            currentStatus?.userId
        );

        console.log(
            "Resolved Owner ID:",
            ownerId
        );

        console.log(
            "Owner Name:",
            ownerName
        );

        console.log(
            "Is Own Status:",
            isOwnStatus
        );

        console.log(
            "Status User Object:",
            currentStatus?.user
        );

        console.log(
            "Full Status:",
            currentStatus
        );

        console.log(
            "========================================"
        );
    }, [
        open,
        currentStatus,
        currentUserId,
        ownerId,
        ownerName,
        isOwnStatus,
    ]);

    // ============================================================
    // STATUS TIME
    // ============================================================

    const statusTime = useMemo(() => {
        if (
            !currentStatus?.createdAt
        ) {
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
                console.warn(
                    "STATUS VIEWERS: status not found."
                );

                setStatusViewers([]);

                return;
            }

            // ====================================================
            // RESOLVE OWNER FROM STATUS
            // ====================================================

            const statusOwnerId =
                status?.user?.id ??
                status?.userId ??
                null;

            console.log(
                "STATUS VIEWERS OWNER CHECK:",
                {
                    statusId,
                    currentUserId,
                    statusUserId:
                        status?.userId,
                    statusUserObjectId:
                        status?.user?.id,
                    resolvedOwnerId:
                        statusOwnerId,
                }
            );

            // ====================================================
            // ONLY OWNER CAN LOAD VIEWERS
            // ====================================================

            if (
                Number(statusOwnerId) !==
                Number(currentUserId)
            ) {
                console.warn(
                    "STATUS VIEWERS: current user is NOT the status owner."
                );

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

                console.log(
                    `STATUS VIEWERS RESPONSE ${statusId}:`,
                    data
                );

                if (
                    !response.ok
                ) {
                    console.error(
                        "STATUS VIEWERS LOAD ERROR:",
                        data?.message ||
                            `Request failed with status ${response.status}`
                    );

                    setStatusViewers([]);

                    return;
                }

                if (
                    !data?.success
                ) {
                    console.error(
                        "STATUS VIEWERS LOAD ERROR:",
                        data?.message ||
                            "Failed to load viewers."
                    );

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
    // LOAD VIEWERS WHEN OWNER OPENS OWN STATUS
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
    // LOAD CURRENT USER REACTION
    // ============================================================

    useEffect(() => {
        if (
            !open ||
            !currentStatus?.id
        ) {
            return;
        }

        if (isOwnStatus) {
            setCurrentReaction(
                null
            );

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
                        console.error(
                            "STATUS REACTION LOAD ERROR:",
                            data?.message ||
                                "Failed to load reaction."
                        );

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
    // MARK STATUS AS VIEWED
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

        /*
         * IMPORTANT:
         *
         * The viewer ID is NEVER taken from the status.
         *
         * The viewer is the authenticated current user.
         *
         * The server gets this from the Token cookie.
         *
         * The status owner comes from currentStatus.user.id.
         */

        viewedStatusIdsRef.current.add(
            statusId
        );

        let cancelled = false;

        const markViewed =
            async () => {
                try {
                    setLoadingView(
                        true
                    );

                    console.log(
                        "MARKING STATUS AS VIEWED:",
                        {
                            statusId,
                            viewerUserId:
                                currentUserId,
                            statusOwnerId:
                                ownerId,
                            isOwnStatus,
                        }
                    );

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

                    console.log(
                        `STATUS ${statusId} VIEW RESULT:`,
                        data
                    );

                    if (
                        !response.ok ||
                        !data?.success
                    ) {
                        console.error(
                            "STATUS VIEW ERROR:",
                            data?.message ||
                                `Request failed with status ${response.status}`
                        );

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

                setCurrentReaction(
                    null
                );

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

                setCurrentReaction(
                    null
                );

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
                        console.error(
                            "STATUS REACTION DELETE ERROR:",
                            data?.message ||
                                "Failed to remove reaction."
                        );

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
                    console.error(
                        "STATUS REACTION ERROR:",
                        data?.message ||
                            "Failed to send reaction."
                    );

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
                setSendingReply(
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
                    console.error(
                        "STATUS REPLY ERROR:",
                        data?.message ||
                            "Failed to send status reply."
                    );

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
                setSendingReply(
                    false
                );
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

        const duration =
            7000;

        const intervalTime =
            50;

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
            <div
                className="
                    relative
                    flex
                    h-full
                    w-full
                    max-w-[520px]
                    flex-col
                    overflow-hidden
                    bg-black
                "
            >
                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <div
                    className="
                        absolute
                        left-3
                        right-3
                        top-3
                        z-30
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
                                    h-1
                                    flex-1
                                    overflow-hidden
                                    rounded-full
                                    bg-white/30
                                "
                            >
                                <div
                                    className="
                                        h-full
                                        rounded-full
                                        bg-white
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
                        z-20
                        flex
                        items-center
                        justify-between
                        bg-gradient-to-b
                        from-black/80
                        to-transparent
                        px-4
                        pb-8
                        pt-6
                    "
                >
                    {/* OWNER */}

                    <div
                        className="
                            flex
                            min-w-0
                            items-center
                            gap-3
                        "
                    >
                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-full
                                bg-white/10
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
                                    className="
                                        h-full
                                        w-full
                                        object-cover
                                    "
                                />
                            ) : (
                                ownerInitial
                            )}
                        </div>

                        <div className="min-w-0">
                            <div
                                className="
                                    flex
                                    items-center
                                    gap-2
                                "
                            >
                                <p
                                    className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-white
                                    "
                                >
                                    {
                                        ownerName
                                    }
                                </p>

                                {isOwnStatus && (
                                    <span
                                        className="
                                            rounded-full
                                            bg-white/15
                                            px-2
                                            py-0.5
                                            text-[10px]
                                            text-white/80
                                        "
                                    >
                                        You
                                    </span>
                                )}
                            </div>

                            <p
                                className="
                                    text-xs
                                    text-white/60
                                "
                            >
                                {
                                    statusTime
                                }
                            </p>
                        </div>
                    </div>

                    {/* HEADER ACTIONS */}

                    <div
                        className="
                            flex
                            items-center
                            gap-1
                        "
                    >
                        {/* VIEWERS */}

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
                                    px-3
                                    text-white
                                    transition
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

                                <span
                                    className="
                                        min-w-[12px]
                                        text-xs
                                        font-medium
                                    "
                                >
                                    {
                                        viewerCount
                                    }
                                </span>
                            </button>
                        )}

                        {/* MENU */}

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
                                        text-white
                                        transition
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
                                            r="1.8"
                                        />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="1.8"
                                        />

                                        <circle
                                            cx="19"
                                            cy="12"
                                            r="1.8"
                                        />
                                    </svg>
                                </button>

                                {showMenu && (
                                    <div
                                        className="
                                            absolute
                                            right-0
                                            top-11
                                            z-50
                                            w-40
                                            overflow-hidden
                                            rounded-xl
                                            border
                                            border-white/10
                                            bg-[#171717]
                                            shadow-2xl
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
                                                px-4
                                                py-3
                                                text-left
                                                text-sm
                                                text-red-400
                                                transition
                                                hover:bg-white/10
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

                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CLOSE */}

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
                                bg-black/20
                                text-2xl
                                text-white
                                transition
                                hover:bg-white/10
                            "
                            aria-label="Close status"
                        >
                            ×
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
                                top-[76px]
                                z-[100]
                                max-h-[65vh]
                                overflow-hidden
                                rounded-2xl
                                border
                                border-white/10
                                bg-[#151515]/95
                                shadow-2xl
                                backdrop-blur-xl
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
                                    py-3
                                "
                            >
                                <div>
                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Viewed by
                                    </p>

                                    <p
                                        className="
                                            text-xs
                                            text-white/50
                                        "
                                    >
                                        {
                                            viewerCount
                                        }{" "}
                                        {viewerCount ===
                                        1
                                            ? "viewer"
                                            : "viewers"}
                                    </p>
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
                                        text-lg
                                        text-white/70
                                        transition
                                        hover:bg-white/10
                                        hover:text-white
                                    "
                                    aria-label="Close viewers"
                                >
                                    ×
                                </button>
                            </div>

                            <div
                                className="
                                    max-h-[calc(65vh-65px)]
                                    overflow-y-auto
                                "
                            >
                                {loadingViewers ? (
                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-center
                                            gap-3
                                            px-4
                                            py-10
                                            text-sm
                                            text-white/60
                                        "
                                    >
                                        <span
                                            className="
                                                h-5
                                                w-5
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/20
                                                border-t-white
                                            "
                                        />

                                        Loading viewers...
                                    </div>
                                ) : viewerCount ===
                                  0 ? (
                                    <div
                                        className="
                                            flex
                                            flex-col
                                            items-center
                                            justify-center
                                            px-4
                                            py-10
                                            text-center
                                        "
                                    >
                                        <div
                                            className="
                                                mb-3
                                                flex
                                                h-12
                                                w-12
                                                items-center
                                                justify-center
                                                rounded-full
                                                bg-white/5
                                                text-white/40
                                            "
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.7"
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

                                        <p
                                            className="
                                                text-sm
                                                font-medium
                                                text-white
                                            "
                                        >
                                            No views yet
                                        </p>

                                        <p
                                            className="
                                                mt-1
                                                text-xs
                                                text-white/40
                                            "
                                        >
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
                                                        px-4
                                                        py-3
                                                        transition
                                                        hover:bg-white/5
                                                    "
                                                >
                                                    <div
                                                        className="
                                                            flex
                                                            h-10
                                                            w-10
                                                            shrink-0
                                                            items-center
                                                            justify-center
                                                            overflow-hidden
                                                            rounded-full
                                                            bg-white/10
                                                            text-sm
                                                            font-semibold
                                                            text-white
                                                        "
                                                    >
                                                        {user.avatar ? (
                                                            <img
                                                                src={
                                                                    user.avatar
                                                                }
                                                                alt={
                                                                    name
                                                                }
                                                                className="
                                                                    h-full
                                                                    w-full
                                                                    object-cover
                                                                "
                                                            />
                                                        ) : (
                                                            initial
                                                        )}
                                                    </div>

                                                    <div
                                                        className="
                                                            min-w-0
                                                            flex-1
                                                        "
                                                    >
                                                        <p
                                                            className="
                                                                truncate
                                                                text-sm
                                                                font-medium
                                                                text-white
                                                            "
                                                        >
                                                            {
                                                                name
                                                            }
                                                        </p>

                                                        {user.username &&
                                                            user.displayName && (
                                                                <p
                                                                    className="
                                                                        truncate
                                                                        text-xs
                                                                        text-white/40
                                                                    "
                                                                >
                                                                    @
                                                                    {
                                                                        user.username
                                                                    }
                                                                </p>
                                                            )}
                                                    </div>

                                                    <div
                                                        className="
                                                            shrink-0
                                                            text-xs
                                                            text-white/40
                                                        "
                                                    >
                                                        {formatViewedTime(
                                                            viewer.viewedAt
                                                        )}
                                                    </div>
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
                    className="
                        relative
                        flex
                        min-h-0
                        flex-1
                        items-center
                        justify-center
                    "
                    style={{
                        backgroundColor:
                            !currentStatus.mediaUrl
                                ? currentStatus.backgroundColor ||
                                  "#1f2937"
                                : "#000000",
                    }}
                >
                    {/* PREVIOUS */}

                    <button
                        type="button"
                        onClick={
                            goPrevious
                        }
                        className="
                            absolute
                            left-0
                            top-0
                            z-10
                            h-full
                            w-1/3
                            cursor-pointer
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
                            z-10
                            h-full
                            w-1/3
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
                                    flex
                                    max-h-full
                                    w-full
                                    items-center
                                    justify-center
                                    overflow-y-auto
                                    px-10
                                    py-24
                                "
                            >
                                <p
                                    className="
                                        whitespace-pre-wrap
                                        break-words
                                        text-center
                                        text-2xl
                                        font-semibold
                                        leading-relaxed
                                        text-white
                                    "
                                >
                                    {
                                        currentStatus.content
                                    }
                                </p>
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
                                    from-black/80
                                    to-transparent
                                    px-6
                                    pb-32
                                    pt-16
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
                                bottom-4
                                left-3
                                right-3
                                z-30
                                flex
                                flex-col
                                gap-2
                            "
                        >
                            {/* REPLY INDICATOR */}

                            <div
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    text-[11px]
                                    text-white/60
                                "
                            >
                                <span
                                    className="
                                        h-1.5
                                        w-1.5
                                        rounded-full
                                        bg-white/50
                                    "
                                />

                                <span>
                                    Replying to
                                </span>

                                <span
                                    className="
                                        font-medium
                                        text-white/80
                                    "
                                >
                                    {
                                        ownerName
                                    }
                                    's status
                                </span>
                            </div>

                            {/* REACTIONS */}

                            <div
                                className="
                                    mx-auto
                                    rounded-full
                                    border
                                    border-white/10
                                    bg-black/70
                                    px-2
                                    py-2
                                    shadow-2xl
                                    backdrop-blur-md
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-1
                                    "
                                >
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
                                                        text-xl
                                                        transition
                                                        ${
                                                            selected
                                                                ? "scale-110 bg-white/25"
                                                                : "hover:bg-white/10"
                                                        }
                                                        ${
                                                            loadingReaction ||
                                                            sendingReply
                                                                ? "cursor-not-allowed opacity-50"
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
                                    bg-black/80
                                    p-2
                                    shadow-2xl
                                    backdrop-blur-md
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
                                    placeholder={`Reply to ${ownerName}'s status...`}
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
                                        placeholder:text-white/40
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
                                        rounded-full
                                        bg-white
                                        text-black
                                        transition
                                        hover:bg-white/90
                                        disabled:cursor-not-allowed
                                        disabled:opacity-40
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
                                            className="h-5 w-5"
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
                                bottom-4
                                right-4
                                z-20
                                h-4
                                w-4
                                animate-spin
                                rounded-full
                                border-2
                                border-white/20
                                border-t-white
                            "
                        />
                    )}
                </div>
            </div>
        </div>
    );
}