"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import ChatHeader from "./ChatHeader";
import MessageActions from "./MessageActions";

// ============================================================
// FIXED MESSAGE COLORS
// These do NOT change with light/dark theme.
// ============================================================

const MESSAGE_OWN_BACKGROUND = "#172554";
const MESSAGE_OTHER_BACKGROUND = "#1e293b";

const MESSAGE_TEXT_COLOR = "#ffffff";
const MESSAGE_SENDER_COLOR = "#bfdbfe";
const MESSAGE_META_COLOR = "#cbd5e1";
const MESSAGE_DELETED_COLOR = "#94a3b8";

// ============================================================
// REACTIONS
// ============================================================

const REACTIONS = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
];

// ============================================================
// EMOJIS
// ============================================================

const EMOJIS = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😎",
    "🤩",
    "🤔",
    "😐",
    "😑",
    "🙄",
    "😏",
    "😣",
    "😥",
    "😮",
    "🤐",
    "😯",
    "😪",
    "😫",
    "🥱",
    "😴",
    "🤗",
    "🤭",
    "🤫",
    "😶",
    "😬",
    "😱",
    "😡",
    "😠",
    "🤬",
    "😢",
    "😭",
    "❤️",
    "💔",
    "👍",
    "👎",
    "👏",
    "🙏",
    "🔥",
    "🎉",
    "💯",
];

// ============================================================
// MAX FILE SIZE
// ============================================================

const MAX_FILE_SIZE =
    50 * 1024 * 1024;

// ============================================================
// LONG PRESS
// ============================================================

const LONG_PRESS_DURATION =
    600;

// ============================================================
// CHAT WINDOW
// ============================================================

export default function ChatWindow({
    conversation,
    messages,
    currentUser,
    currentUserId,
    onlineUsers = [],
    typingUsers = [],
    loadingMessages,
    socketConnected,

    onSendMessage,
    onStartTyping,
    onStopTyping,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,

    onBack,

    // ========================================================
    // CHAT THEME
    // ========================================================

    selectedTheme = "default",
    onSelectTheme,

    // ========================================================
    // AUDIO / VIDEO CALL
    // ========================================================

    onStartAudioCall,
    onStartVideoCall,
}) {
    const router = useRouter();

    // ========================================================
    // CHAT THEME BACKGROUND
    // ========================================================

    const CHAT_THEME_IMAGES = {
        default: null,
        nature: "/chat-themes/nature4.webp",
        spiderman: "/chat-themes/spiderman3.jpg",
        superman: "/chat-themes/superman1.jpg",
        car: "/chat-themes/car1.jpg",
        ocean: "/chat-themes/ocean1.jpg",
        sunset: "/chat-themes/sunset1.jpg",
        dark: "/chat-themes/dark.jpg",
    };

    const themeImage =
        CHAT_THEME_IMAGES[selectedTheme] ||
        null;

    const themeBackgroundStyle =
        themeImage
            ? {
                  backgroundImage: `linear-gradient(
                      rgba(0,0,0,0.22),
                      rgba(0,0,0,0.22)
                  ), url("${themeImage}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundColor:
                      "var(--background)",
              }
            : undefined;

    // ========================================================
    // MESSAGE STATE
    // ========================================================

    const [message, setMessage] =
        useState("");

    const [
        showReactionFor,
        setShowReactionFor,
    ] = useState(null);

    const [
        reactionPosition,
        setReactionPosition,
    ] = useState({
        top: 0,
        left: 0,
    });

    const [
        showEmojiPicker,
        setShowEmojiPicker,
    ] = useState(false);

    const [
        selectedFile,
        setSelectedFile,
    ] = useState(null);

    const [
        attachmentPreview,
        setAttachmentPreview,
    ] = useState(null);

    // ========================================================
    // GAMES
    // ========================================================

    const [
        showGamesMenu,
        setShowGamesMenu,
    ] = useState(false);

    const [
        creatingGame,
        setCreatingGame,
    ] = useState(false);

    const [
        gameError,
        setGameError,
    ] = useState(null);

    // ========================================================
    // REFS
    // ========================================================

    const messagesEndRef =
        useRef(null);

    const inputRef =
        useRef(null);

    const emojiPickerRef =
        useRef(null);

    const fileInputRef =
        useRef(null);

    // ========================================================
    // AUTO SCROLL
    //
    // IMPORTANT:
    // Use "auto" instead of "smooth".
    //
    // This makes optimistic messages appear immediately.
    // ========================================================

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "auto",
            block: "end",
        });
    }, [
        messages?.length,
        typingUsers?.length,
    ]);

    // ========================================================
    // CLOSE CHAT EVENT
    // ========================================================

    useEffect(() => {
        const handleChatClosed = () => {
            inputRef.current?.blur();

            setMessage("");
            setShowReactionFor(null);
            setShowEmojiPicker(false);
            setShowGamesMenu(false);
            setGameError(null);

            removeSelectedFile();
        };

        window.addEventListener(
            "chathub:chat-closed",
            handleChatClosed
        );

        return () => {
            window.removeEventListener(
                "chathub:chat-closed",
                handleChatClosed
            );
        };
    }, []);

    // ========================================================
    // CLOSE EMOJI PICKER
    // ========================================================

    useEffect(() => {
        const handleClickOutside =
            (event) => {
                if (
                    emojiPickerRef.current &&
                    !emojiPickerRef.current.contains(
                        event.target
                    )
                ) {
                    setShowEmojiPicker(
                        false
                    );
                }
            };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    // ========================================================
    // CLOSE REACTION PICKER
    // ========================================================

    useEffect(() => {
        const handleOutsideReactionClick =
            (event) => {
                if (
                    !event.target.closest(
                        "[data-reaction-picker]"
                    ) &&
                    !event.target.closest(
                        "[data-message-bubble]"
                    )
                ) {
                    setShowReactionFor(
                        null
                    );
                }
            };

        document.addEventListener(
            "mousedown",
            handleOutsideReactionClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideReactionClick
            );
        };
    }, []);

    // ========================================================
    // CLOSE REACTION ON SCROLL
    // ========================================================

    useEffect(() => {
        if (!showReactionFor) {
            return;
        }

        const handleScroll = () => {
            setShowReactionFor(null);
        };

        window.addEventListener(
            "scroll",
            handleScroll,
            true
        );

        return () => {
            window.removeEventListener(
                "scroll",
                handleScroll,
                true
            );
        };
    }, [showReactionFor]);

    // ========================================================
    // CLEANUP OBJECT URL
    // ========================================================

    useEffect(() => {
        return () => {
            if (attachmentPreview) {
                URL.revokeObjectURL(
                    attachmentPreview
                );
            }
        };
    }, [attachmentPreview]);

    // ========================================================
    // CLOSE GAMES MENU
    // ========================================================

    useEffect(() => {
        const handleGamesOutsideClick = (
            event
        ) => {
            if (
                !event.target.closest(
                    "[data-games-menu]"
                )
            ) {
                setShowGamesMenu(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleGamesOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleGamesOutsideClick
            );
        };
    }, []);

    // ========================================================
    // CREATE GAME
    // ========================================================

    const handleCreateGame = async (
        gameType
    ) => {
        const conversationId = Number(
            conversation?.id
        );

        if (
            !Number.isInteger(
                conversationId
            ) ||
            conversationId <= 0
        ) {
            setGameError(
                "Please open a conversation first."
            );

            return;
        }

        if (creatingGame) {
            return;
        }

        setCreatingGame(true);
        setGameError(null);

        try {
            const response = await fetch(
                "/api/games",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        conversationId,
                        type: gameType,
                    }),
                }
            );

            const rawText =
                await response.text();

            let data = null;

            try {
                data = rawText
                    ? JSON.parse(rawText)
                    : null;
            } catch {
                throw new Error(
                    `Invalid server response (${response.status}).`
                );
            }

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                        `Failed to create game (${response.status}).`
                );
            }

            console.log(
                "🎮 GAME CREATED:",
                data.game
            );

            setShowGamesMenu(false);

            // ==================================================
            // NOTIFY CHATHUB ABOUT THE NEW GAME
            // ==================================================

            window.dispatchEvent(
                new CustomEvent(
                    "chathub:game-created",
                    {
                        detail: {
                            game: data.game,
                        },
                    }
                )
            );
        } catch (error) {
            console.error(
                "❌ CREATE GAME ERROR:",
                error
            );

            setGameError(
                error?.message ||
                    "Unable to create game."
            );
        } finally {
            setCreatingGame(false);
        }
    };

    // ========================================================
    // INPUT CHANGE
    // ========================================================

    const handleChange = (
        event
    ) => {
        const value =
            event.target.value;

        setMessage(value);

        if (value.trim()) {
            onStartTyping?.();
        } else {
            onStopTyping?.();
        }
    };

    // ========================================================
    // PROFILE NAVIGATION
    // ========================================================

    const handleProfileClick = (
        user
    ) => {
        const targetUserId =
            user?.id ??
            user?.userId;

        if (!targetUserId) {
            return;
        }

        const isOwnProfile =
            Number(targetUserId) ===
            Number(currentUserId);

        if (isOwnProfile) {
            router.push("/profile");
            return;
        }

        router.push(
            `/profile?userId=${encodeURIComponent(
                targetUserId
            )}`
        );
    };

    // ========================================================
    // OPEN FILE SELECTOR
    // ========================================================

    const handleAttachmentClick =
        () => {
            if (!socketConnected) {
                return;
            }

            fileInputRef.current?.click();
        };

    // ========================================================
    // FILE SELECTED
    // ========================================================

    const handleFileSelect = (
        event
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            alert(
                "File size cannot exceed 50 MB."
            );

            event.target.value = "";

            return;
        }

        if (attachmentPreview) {
            URL.revokeObjectURL(
                attachmentPreview
            );
        }

        const previewUrl =
            URL.createObjectURL(file);

        setSelectedFile(file);

        setAttachmentPreview(
            previewUrl
        );

        setShowEmojiPicker(false);

        inputRef.current?.focus();
    };

    // ========================================================
    // REMOVE FILE
    // ========================================================

    const removeSelectedFile =
        () => {
            if (attachmentPreview) {
                URL.revokeObjectURL(
                    attachmentPreview
                );
            }

            setSelectedFile(null);

            setAttachmentPreview(null);

            if (
                fileInputRef.current
            ) {
                fileInputRef.current.value =
                    "";
            }
        };

    // ========================================================
    // GET ATTACHMENT TYPE
    // ========================================================

    const getAttachmentType = (
        file
    ) => {
        if (!file) {
            return "TEXT";
        }

        if (
            file.type.startsWith(
                "image/"
            )
        ) {
            return "IMAGE";
        }

        if (
            file.type.startsWith(
                "video/"
            )
        ) {
            return "VIDEO";
        }

        if (
            file.type.startsWith(
                "audio/"
            )
        ) {
            return "AUDIO";
        }

        return "FILE";
    };

    // ========================================================
    // SEND MESSAGE
    //
    // ChatWindow does NOT wait for the server.
    // It immediately passes message data to ChatLayout.
    // ========================================================

    const handleSubmit = () => {
        const trimmedMessage =
            message.trim();

        if (
            !trimmedMessage &&
            !selectedFile
        ) {
            return;
        }

        if (!socketConnected) {
            return;
        }

        if (!selectedFile) {
            onSendMessage?.({
                content:
                    trimmedMessage,
                type: "TEXT",
            });
        } else {
            onSendMessage?.({
                content:
                    trimmedMessage,

                type:
                    getAttachmentType(
                        selectedFile
                    ),

                file: selectedFile,

                attachmentName:
                    selectedFile.name,

                attachmentSize:
                    selectedFile.size,

                attachmentMimeType:
                    selectedFile.type,
            });
        }

        // Clear input immediately.
        setMessage("");

        onStopTyping?.();

        setShowEmojiPicker(false);

        removeSelectedFile();

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    // ========================================================
    // ENTER KEY
    // ========================================================

    const handleKeyDown = (
        event
    ) => {
        if (
            event.key ===
                "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            handleSubmit();
        }
    };

    // ========================================================
    // ADD EMOJI
    // ========================================================

    const handleEmojiSelect = (
        emoji
    ) => {
        setMessage(
            (previous) =>
                previous + emoji
        );

        setShowEmojiPicker(false);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    // ========================================================
    // EMPTY CHAT
    // ========================================================

    if (!conversation) {
        return (
            <section
                className="
                    hidden
                    flex-1
                    items-center
                    justify-center
                    bg-background
                    text-foreground
                    transition-colors
                    duration-200
                    md:flex
                "
            >
                <div className="max-w-md px-8 text-center">
                    <div className="mb-6 text-7xl">
                        💬
                    </div>

                    <h1
                        className="
                            mb-3
                            text-3xl
                            font-light
                            text-foreground
                        "
                    >
                        ChatHub
                    </h1>

                    <p
                        className="
                            text-sm
                            leading-6
                            text-muted
                        "
                    >
                        Select a conversation
                        from the left to start
                        chatting.
                    </p>
                </div>
            </section>
        );
    }

    // ========================================================
    // GET OTHER USER
    // ========================================================

    const getOtherUser = () => {
        if (
            !Array.isArray(
                conversation?.members
            )
        ) {
            return null;
        }

        const otherMember =
            conversation.members.find(
                (member) => {
                    const memberUserId =
                        member?.user?.id ??
                        member?.userId ??
                        member?.id;

                    return (
                        Number(
                            memberUserId
                        ) !==
                        Number(
                            currentUserId
                        )
                    );
                }
            );

        if (!otherMember) {
            return null;
        }

        return (
            otherMember.user ??
            otherMember
        );
    };

    const otherUser =
        getOtherUser();

    // ========================================================
    // DISPLAY NAME
    // ========================================================

    const getDisplayName = (
        user
    ) => {
        return (
            user?.displayName?.trim() ||
            user?.username?.trim() ||
            user?.email?.trim() ||
            "User"
        );
    };

    const otherUserDisplayName =
        getDisplayName(
            otherUser
        );

    // ========================================================
    // ONLINE STATUS
    // ========================================================

    const isOtherOnline =
        otherUser &&
        onlineUsers.some(
            (id) =>
                Number(id) ===
                Number(
                    otherUser.id
                )
        );

    // ========================================================
    // CLOSE CHAT
    // ========================================================

    const handleCloseChat =
        () => {
            onStopTyping?.();

            removeSelectedFile();

            setMessage("");

            setShowEmojiPicker(false);
            setShowGamesMenu(false);
            setGameError(null);

            setShowReactionFor(null);

            onBack?.();
        };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <section
            className="
                flex
                h-full
                min-w-0
                flex-1
                flex-col
                text-foreground
                transition-colors
                duration-200
            "
            style={
                themeBackgroundStyle
            }
        >
            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <ChatHeader
                conversation={
                    conversation
                }
                currentUser={
                    currentUser
                }
                currentUserId={
                    currentUserId
                }
                selectedTheme={
                    selectedTheme
                }
                onSelectTheme={
                    onSelectTheme
                }
                otherUser={
                    otherUser
                }
                otherUserDisplayName={
                    otherUserDisplayName
                }
                isOtherOnline={
                    isOtherOnline
                }
                typingUsers={
                    typingUsers
                }
                onClose={
                    handleCloseChat
                }
                onBack={
                    onBack
                }
                onProfileClick={
                    handleProfileClick
                }
                onStartAudioCall={
                    onStartAudioCall
                }
                onStartVideoCall={
                    onStartVideoCall
                }
            />

            {/* ==================================================
                MESSAGE AREA
            ================================================== */}

            <div
                className="
                    relative
                    flex-1
                    overflow-y-auto
                    px-3
                    py-5
                    sm:px-6
                "
                style={
                    themeBackgroundStyle
                }
            >
                <div
                    className="
                        pointer-events-none
                        absolute
                        inset-0
                        opacity-[0.025]
                        [background-image:radial-gradient(#ffffff_1px,transparent_1px)]
                        [background-size:20px_20px]
                    "
                />

                <div
                    className="
                        relative
                        mx-auto
                        flex
                        max-w-4xl
                        flex-col
                    "
                >
                    {loadingMessages ? (
                        <div
                            className="
                                flex
                                flex-1
                                items-center
                                justify-center
                                py-20
                            "
                        >
                            <div
                                className="
                                    h-8
                                    w-8
                                    animate-spin
                                    rounded-full
                                    border-4
                                    border-border
                                    border-t-primary
                                "
                            />
                        </div>
                    ) : messages.length ===
                      0 ? (
                        <div
                            className="
                                flex
                                flex-1
                                items-center
                                justify-center
                                py-20
                            "
                        >
                            <div
                                className="
                                    rounded-xl
                                    bg-surface
                                    px-5
                                    py-4
                                    text-center
                                    shadow-lg
                                "
                            >
                                <p
                                    className="
                                        text-sm
                                        text-foreground
                                    "
                                >
                                    No messages yet.
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        text-muted
                                    "
                                >
                                    Send a message
                                    to start the
                                    conversation.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map(
                            (msg) => (
                                <MessageBubble
                                    key={
                                        msg.id
                                    }
                                    message={
                                        msg
                                    }
                                    currentUserId={
                                        currentUserId
                                    }
                                    isRecipientOnline={
                                        Boolean(
                                            isOtherOnline
                                        )
                                    }
                                    showReactionFor={
                                        showReactionFor
                                    }
                                    setShowReactionFor={
                                        setShowReactionFor
                                    }
                                    reactionPosition={
                                        reactionPosition
                                    }
                                    setReactionPosition={
                                        setReactionPosition
                                    }
                                    onEditMessage={
                                        onEditMessage
                                    }
                                    onDeleteMessage={
                                        onDeleteMessage
                                    }
                                    onToggleReaction={
                                        onToggleReaction
                                    }
                                />
                            )
                        )
                    )}

                    {/* ==================================================
                        TYPING INDICATOR
                    ================================================== */}

                    {typingUsers.length >
                        0 && (
                        <div
                            className="
                                mb-2
                                flex
                                items-center
                                gap-2
                                self-start
                                rounded-2xl
                                rounded-bl-sm
                                bg-surface
                                px-4
                                py-2.5
                            "
                        >
                            <span
                                className="
                                    text-xs
                                    text-secondary
                                "
                            >
                                {typingUsers
                                    .map(
                                        (
                                            user
                                        ) =>
                                            user?.displayName?.trim() ||
                                            user?.username?.trim() ||
                                            user?.email?.trim() ||
                                            "User"
                                    )
                                    .join(
                                        ", "
                                    )}{" "}
                                {typingUsers.length ===
                                1
                                    ? "is"
                                    : "are"}{" "}
                                typing
                            </span>

                            <span className="flex gap-1">
                                <i
                                    className="
                                        h-1.5
                                        w-1.5
                                        animate-bounce
                                        rounded-full
                                        bg-muted
                                    "
                                />

                                <i
                                    className="
                                        h-1.5
                                        w-1.5
                                        animate-bounce
                                        rounded-full
                                        bg-muted
                                        [animation-delay:150ms]
                                    "
                                />

                                <i
                                    className="
                                        h-1.5
                                        w-1.5
                                        animate-bounce
                                        rounded-full
                                        bg-muted
                                        [animation-delay:300ms]
                                    "
                                />
                            </span>
                        </div>
                    )}

                    <div
                        ref={
                            messagesEndRef
                        }
                    />
                </div>
            </div>

            {/* ==================================================
                INPUT AREA
            ================================================== */}

            <div
                className="
                    shrink-0
                    border-t
                    border-border
                    bg-surface
                    px-2
                    py-2
                    transition-colors
                    duration-200
                    sm:px-4
                    sm:py-3
                "
            >
                <div className="mx-auto max-w-5xl">
                    {selectedFile && (
                        <AttachmentPreview
                            file={
                                selectedFile
                            }
                            preview={
                                attachmentPreview
                            }
                            onRemove={
                                removeSelectedFile
                            }
                        />
                    )}

                    <div className="flex items-end gap-2">
                        {/* ==================================================
                            FILE INPUT
                        ================================================== */}

                        <input
                            ref={
                                fileInputRef
                            }
                            type="file"
                            className="hidden"
                            onChange={
                                handleFileSelect
                            }
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                        />

                        {/* ==================================================
                            ATTACHMENT
                        ================================================== */}

                        <button
                            type="button"
                            onClick={
                                handleAttachmentClick
                            }
                            disabled={
                                !socketConnected
                            }
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                text-xl
                                text-secondary
                                transition
                                hover:bg-hover
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                            title="Attach file"
                        >
                            📎
                        </button>

                        {/* ==================================================
                            EMOJI
                        ================================================== */}

                        <div
                            ref={
                                emojiPickerRef
                            }
                            className="
                                relative
                                shrink-0
                            "
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setShowEmojiPicker(
                                        (
                                            previous
                                        ) =>
                                            !previous
                                    )
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-xl
                                    text-secondary
                                    transition
                                    hover:bg-hover
                                "
                                title="Emoji"
                            >
                                😊
                            </button>

                            {showEmojiPicker && (
                                <div
                                    className="
                                        absolute
                                        bottom-12
                                        left-0
                                        z-50
                                        w-[min(288px,calc(100vw-24px))]
                                        rounded-xl
                                        border
                                        border-border
                                        bg-surface
                                        p-3
                                        shadow-2xl
                                    "
                                >
                                    <div
                                        className="
                                            mb-2
                                            flex
                                            items-center
                                            justify-between
                                            border-b
                                            border-border
                                            pb-2
                                        "
                                    >
                                        <span
                                            className="
                                                text-xs
                                                font-medium
                                                text-foreground
                                            "
                                        >
                                            Emojis
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowEmojiPicker(
                                                    false
                                                )
                                            }
                                            className="
                                                rounded-md
                                                px-2
                                                py-1
                                                text-xs
                                                text-secondary
                                                transition
                                                hover:bg-hover
                                                hover:text-foreground
                                            "
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div
                                        className="
                                            grid
                                            max-h-56
                                            grid-cols-8
                                            gap-1
                                            overflow-y-auto
                                        "
                                    >
                                        {EMOJIS.map(
                                            (
                                                emoji,
                                                index
                                            ) => (
                                                <button
                                                    key={`${emoji}-${index}`}
                                                    type="button"
                                                    onClick={() =>
                                                        handleEmojiSelect(
                                                            emoji
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        h-8
                                                        w-8
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        rounded-md
                                                        text-xl
                                                        transition
                                                        hover:scale-110
                                                        hover:bg-hover
                                                    "
                                                >
                                                    {
                                                        emoji
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ==================================================
                            GAMES
                        ================================================== */}

                        <div
                            data-games-menu="true"
                            className="relative shrink-0"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setShowGamesMenu(
                                        (
                                            previous
                                        ) =>
                                            !previous
                                    );

                                    setGameError(
                                        null
                                    );
                                }}
                                disabled={
                                    creatingGame
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-xl
                                    text-secondary
                                    transition
                                    hover:bg-hover
                                    disabled:cursor-not-allowed
                                    disabled:opacity-40
                                "
                                title="Games"
                            >
                                🎮
                            </button>

                            {showGamesMenu && (
                                <div
                                    className="
                                        absolute
                                        bottom-12
                                        left-0
                                        z-50
                                        w-64
                                        overflow-hidden
                                        rounded-2xl
                                        border
                                        border-border
                                        bg-surface
                                        p-2
                                        shadow-2xl
                                    "
                                >
                                    <div
                                        className="
                                            border-b
                                            border-border
                                            px-3
                                            py-2
                                        "
                                    >
                                        <p
                                            className="
                                                text-sm
                                                font-semibold
                                                text-foreground
                                            "
                                        >
                                            Play a game
                                        </p>

                                        <p
                                            className="
                                                mt-0.5
                                                text-[11px]
                                                text-muted
                                            "
                                        >
                                            Challenge someone
                                            in this chat
                                        </p>
                                    </div>

                                    {/* GAME ERROR */}

                                    {gameError && (
                                        <div
                                            className="
                                                mx-2
                                                mt-2
                                                rounded-lg
                                                border
                                                border-red-500/20
                                                bg-red-500/10
                                                px-3
                                                py-2
                                                text-xs
                                                text-red-400
                                            "
                                        >
                                            {
                                                gameError
                                            }
                                        </div>
                                    )}

                                    <div className="mt-1 space-y-1">
                                        {/* TIC TAC TOE */}

                                        <button
                                            type="button"
                                            disabled={
                                                creatingGame
                                            }
                                            onClick={() =>
                                                handleCreateGame(
                                                    "TIC_TAC_TOE"
                                                )
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                rounded-xl
                                                px-3
                                                py-2.5
                                                text-left
                                                transition
                                                hover:bg-hover
                                                disabled:cursor-not-allowed
                                                disabled:opacity-50
                                            "
                                        >
                                            <span className="text-xl">
                                                ⭕
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className="
                                                        block
                                                        text-sm
                                                        font-medium
                                                        text-foreground
                                                    "
                                                >
                                                    Tic Tac Toe
                                                </span>

                                                <span
                                                    className="
                                                        block
                                                        text-[11px]
                                                        text-muted
                                                    "
                                                >
                                                    Quick 1v1 game
                                                </span>
                                            </span>
                                        </button>

                                        {/* CONNECT FOUR */}

                                        <button
                                            type="button"
                                            disabled={
                                                creatingGame
                                            }
                                            onClick={() =>
                                                handleCreateGame(
                                                    "CONNECT_FOUR"
                                                )
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                rounded-xl
                                                px-3
                                                py-2.5
                                                text-left
                                                transition
                                                hover:bg-hover
                                                disabled:cursor-not-allowed
                                                disabled:opacity-50
                                            "
                                        >
                                            <span className="text-xl">
                                                🔴
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className="
                                                        block
                                                        text-sm
                                                        font-medium
                                                        text-foreground
                                                    "
                                                >
                                                    Connect Four
                                                </span>

                                                <span
                                                    className="
                                                        block
                                                        text-[11px]
                                                        text-muted
                                                    "
                                                >
                                                    Drop pieces and
                                                    connect four
                                                </span>
                                            </span>
                                        </button>

                                        {/* ROCK PAPER SCISSORS */}

                                        <button
                                            type="button"
                                            disabled={
                                                creatingGame
                                            }
                                            onClick={() =>
                                                handleCreateGame(
                                                    "ROCK_PAPER_SCISSORS"
                                                )
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                gap-3
                                                rounded-xl
                                                px-3
                                                py-2.5
                                                text-left
                                                transition
                                                hover:bg-hover
                                                disabled:cursor-not-allowed
                                                disabled:opacity-50
                                            "
                                        >
                                            <span className="text-xl">
                                                ✊
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className="
                                                        block
                                                        text-sm
                                                        font-medium
                                                        text-foreground
                                                    "
                                                >
                                                    Rock Paper
                                                    Scissors
                                                </span>

                                                <span
                                                    className="
                                                        block
                                                        text-[11px]
                                                        text-muted
                                                    "
                                                >
                                                    Best of luck!
                                                </span>
                                            </span>
                                        </button>
                                    </div>

                                    {/* CREATING INDICATOR */}

                                    {creatingGame && (
                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-center
                                                gap-2
                                                px-3
                                                py-2
                                                text-xs
                                                text-muted
                                            "
                                        >
                                            <span
                                                className="
                                                    h-3.5
                                                    w-3.5
                                                    animate-spin
                                                    rounded-full
                                                    border-2
                                                    border-border
                                                    border-t-primary
                                                "
                                            />

                                            Creating game...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ==================================================
                            MESSAGE INPUT
                        ================================================== */}

                        <textarea
                            ref={
                                inputRef
                            }
                            rows={1}
                            value={
                                message
                            }
                            onChange={
                                handleChange
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                            placeholder={
                                selectedFile
                                    ? "Add a caption..."
                                    : "Type a message"
                            }
                            className="
                                max-h-32
                                min-h-10
                                flex-1
                                resize-none
                                rounded-xl
                                bg-background
                                px-4
                                py-2.5
                                text-sm
                                text-foreground
                                outline-none
                                transition-colors
                                placeholder:text-muted
                                focus:ring-1
                                focus:ring-border
                            "
                        />

                        {/* ==================================================
                            SEND
                        ================================================== */}

                        <button
                            type="button"
                            onClick={
                                handleSubmit
                            }
                            disabled={
                                !socketConnected ||
                                (!message.trim() &&
                                    !selectedFile)
                            }
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-surface
                                transition
                                hover:bg-hover
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                            title={
                                socketConnected
                                    ? "Send"
                                    : "Connecting..."
                            }
                        >
                            <span
                                style={{
                                    color:
                                        "#2563eb",
                                    WebkitTextFillColor:
                                        "#2563eb",
                                    fontSize:
                                        "20px",
                                    fontWeight:
                                        "700",
                                    lineHeight:
                                        1,
                                    display:
                                        "inline-block",
                                }}
                            >
                                ➤
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================================
// ATTACHMENT PREVIEW
// ============================================================

function AttachmentPreview({
    file,
    preview,
    onRemove,
}) {
    const isImage =
        file.type.startsWith(
            "image/"
        );

    const isVideo =
        file.type.startsWith(
            "video/"
        );

    return (
        <div
            className="
                mb-2
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-border
                bg-background
                p-2
            "
        >
            {isImage && (
                <img
                    src={preview}
                    alt={file.name}
                    className="
                        h-16
                        w-16
                        rounded-lg
                        object-cover
                    "
                />
            )}

            {isVideo && (
                <video
                    src={preview}
                    className="
                        h-16
                        w-16
                        rounded-lg
                        object-cover
                    "
                />
            )}

            {!isImage &&
                !isVideo && (
                    <div
                        className="
                            flex
                            h-16
                            w-16
                            items-center
                            justify-center
                            rounded-lg
                            bg-surface
                            text-2xl
                        "
                    >
                        📄
                    </div>
                )}

            <div className="min-w-0 flex-1">
                <p
                    className="
                        truncate
                        text-sm
                        text-foreground
                    "
                >
                    {file.name}
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        text-muted
                    "
                >
                    {formatFileSize(
                        file.size
                    )}
                </p>
            </div>

            <button
                type="button"
                onClick={
                    onRemove
                }
                className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    text-secondary
                    transition
                    hover:bg-hover
                    hover:text-foreground
                "
                title="Remove attachment"
            >
                ✕
            </button>
        </div>
    );
}

// ============================================================
// MESSAGE BUBBLE
// ============================================================

function MessageBubble({
    message,
    currentUserId,

    isRecipientOnline = false,

    showReactionFor,
    setShowReactionFor,
    reactionPosition,
    setReactionPosition,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
}) {
    const isOwn =
        Number(
            message?.senderId
        ) ===
        Number(
            currentUserId
        );

    const isDeleted =
        Boolean(
            message?.deletedAt
        );

    const reactions =
        message?.reactions || [];

    // ========================================================
    // STATUS REPLY
    // ========================================================

    const status =
        message?.status || null;

    const isStatusReply =
        Boolean(status);

    // ========================================================
    // LONG PRESS
    // ========================================================

    const longPressTimerRef =
        useRef(null);

    const longPressTriggeredRef =
        useRef(false);

    const clearLongPress =
        () => {
            if (
                longPressTimerRef.current
            ) {
                clearTimeout(
                    longPressTimerRef.current
                );

                longPressTimerRef.current =
                    null;
            }
        };

    // ========================================================
    // OPEN REACTION PICKER
    // ========================================================

    const openReactionPicker = (
        event
    ) => {
        if (isDeleted) {
            return;
        }

        const element =
            event.currentTarget;

        if (!element) {
            return;
        }

        const rect =
            element.getBoundingClientRect();

        const pickerWidth = 260;
        const pickerHeight = 52;
        const edgePadding = 8;

        let left =
            rect.left +
            rect.width / 2 -
            pickerWidth / 2;

        let top =
            rect.top -
            pickerHeight -
            10;

        if (
            left <
            edgePadding
        ) {
            left =
                edgePadding;
        }

        if (
            left +
                pickerWidth >
            window.innerWidth -
                edgePadding
        ) {
            left =
                window.innerWidth -
                pickerWidth -
                edgePadding;
        }

        if (
            top <
            edgePadding
        ) {
            top =
                rect.bottom +
                10;
        }

        if (
            top +
                pickerHeight >
            window.innerHeight -
                edgePadding
        ) {
            top =
                window.innerHeight -
                pickerHeight -
                edgePadding;
        }

        setReactionPosition({
            top,
            left,
        });

        setShowReactionFor(
            (previous) =>
                previous ===
                message.id
                    ? null
                    : message.id
        );
    };

    // ========================================================
    // TOUCH START
    // ========================================================

    const handleTouchStart = (
        event
    ) => {
        if (isDeleted) {
            return;
        }

        clearLongPress();

        longPressTriggeredRef.current =
            false;

        const element =
            event.currentTarget;

        longPressTimerRef.current =
            setTimeout(() => {
                longPressTriggeredRef.current =
                    true;

                openReactionPicker({
                    currentTarget:
                        element,
                });
            }, LONG_PRESS_DURATION);
    };

    // ========================================================
    // TOUCH END
    // ========================================================

    const handleTouchEnd =
        () => {
            clearLongPress();
        };

    // ========================================================
    // TOUCH MOVE
    // ========================================================

    const handleTouchMove =
        () => {
            clearLongPress();
        };

    // ========================================================
    // CONTEXT MENU
    // ========================================================

    const handleContextMenu = (
        event
    ) => {
        event.preventDefault();

        if (isDeleted) {
            return;
        }

        openReactionPicker(
            event
        );
    };

    // ========================================================
    // DOUBLE CLICK
    // ========================================================

    const handleMessageDoubleClick =
        (event) => {
            if (isDeleted) {
                return;
            }

            openReactionPicker(
                event
            );
        };

    // ========================================================
    // REACTION
    // ========================================================

    const handleReactionButton = (
        emoji
    ) => {
        onToggleReaction?.(
            message,
            emoji
        );

        setShowReactionFor(
            null
        );
    };

    // ========================================================
    // SENDER NAME
    // ========================================================

    const senderDisplayName =
        message?.sender?.displayName?.trim() ||
        message?.sender?.username?.trim() ||
        message?.sender?.email?.trim() ||
        "User";

    // ========================================================
    // CLEANUP
    // ========================================================

    useEffect(() => {
        return () => {
            clearLongPress();
        };
    }, []);

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className={`
                relative
                mb-1
                flex
                ${
                    isOwn
                        ? "justify-end"
                        : "justify-start"
                }
            `}
        >
            <div
                data-message-bubble="true"
                onDoubleClick={
                    handleMessageDoubleClick
                }
                onTouchStart={
                    handleTouchStart
                }
                onTouchEnd={
                    handleTouchEnd
                }
                onTouchCancel={
                    handleTouchEnd
                }
                onTouchMove={
                    handleTouchMove
                }
                onContextMenu={
                    handleContextMenu
                }
                className={`
                    relative
                    max-w-[85%]
                    rounded-lg
                    px-3
                    py-2
                    pt-8
                    shadow-sm
                    select-none
                    sm:max-w-[70%]
                    ${
                        isOwn
                            ? "rounded-tr-sm"
                            : "rounded-tl-sm"
                    }
                `}
                style={{
                    backgroundColor:
                        isOwn
                            ? MESSAGE_OWN_BACKGROUND
                            : MESSAGE_OTHER_BACKGROUND,
                }}
            >
                {/* ==================================================
                    MESSAGE ACTIONS
                ================================================== */}

                {!isDeleted && (
                    <MessageActions
                        message={
                            message
                        }
                        isOwn={
                            isOwn
                        }
                        onEditMessage={
                            onEditMessage
                        }
                        onDeleteMessage={
                            onDeleteMessage
                        }
                        onToggleReaction={
                            onToggleReaction
                        }
                    />
                )}

                {/* ==================================================
                    SENDER NAME
                ================================================== */}

                {!isOwn && (
                    <p
                        className="
                            mb-1
                            text-xs
                            font-semibold
                        "
                        style={{
                            color:
                                MESSAGE_SENDER_COLOR,
                        }}
                    >
                        {
                            senderDisplayName
                        }
                    </p>
                )}

                {/* ==================================================
                    STATUS REPLY PREVIEW
                ================================================== */}

                {!isDeleted &&
                    isStatusReply && (
                        <StatusReplyPreview
                            status={
                                status
                            }
                        />
                    )}

                {/* ==================================================
                    NORMAL ATTACHMENT
                ================================================== */}

                {!isDeleted &&
                    !isStatusReply &&
                    message?.attachmentUrl && (
                        <MessageAttachment
                            message={
                                message
                            }
                        />
                    )}

                {/* ==================================================
                    MESSAGE CONTENT
                ================================================== */}

                {(message?.content ||
                    isDeleted) && (
                    <div
                        className={`
                            whitespace-pre-wrap
                            break-words
                            text-[14px]
                            leading-5
                            ${
                                message?.attachmentUrl &&
                                !isStatusReply
                                    ? "mt-2"
                                    : ""
                            }
                        `}
                        style={{
                            color: isDeleted
                                ? MESSAGE_DELETED_COLOR
                                : MESSAGE_TEXT_COLOR,
                            fontStyle:
                                isDeleted
                                    ? "italic"
                                    : "normal",
                        }}
                    >
                        {isDeleted
                            ? "This message was deleted"
                            : message?.content}
                    </div>
                )}

                {/* ==================================================
                    TIME / EDITED / RECEIPTS
                ================================================== */}

                <div
                    className="
                        mt-1
                        flex
                        items-center
                        justify-end
                        gap-1
                    "
                >
                    {message?.editedAt &&
                        !isDeleted && (
                            <span
                                className="
                                    mr-1
                                    text-[10px]
                                "
                                style={{
                                    color:
                                        MESSAGE_META_COLOR,
                                }}
                            >
                                edited
                            </span>
                        )}

                    <span
                        className="
                            text-[10px]
                        "
                        style={{
                            color:
                                MESSAGE_META_COLOR,
                        }}
                    >
                        {formatTime(
                            message?.createdAt
                        )}
                    </span>

                    {isOwn &&
                        !isDeleted && (
                            <ReceiptTicks
                                message={
                                    message
                                }
                                isRecipientOnline={
                                    isRecipientOnline
                                }
                            />
                        )}
                </div>

                {/* ==================================================
                    REACTION PICKER
                ================================================== */}

                {showReactionFor ===
                    message.id &&
                    !isDeleted && (
                        <div
                            data-reaction-picker="true"
                            className="
                                fixed
                                z-[100]
                                flex
                                max-w-[calc(100vw-16px)]
                                items-center
                                gap-1
                                overflow-x-auto
                                overflow-y-hidden
                                rounded-full
                                border
                                border-border
                                bg-surface
                                px-2
                                py-1.5
                                shadow-2xl
                            "
                            style={{
                                top:
                                    reactionPosition.top,
                                left:
                                    reactionPosition.left,
                                width:
                                    "260px",
                            }}
                        >
                            {REACTIONS.map(
                                (
                                    emoji
                                ) => (
                                    <button
                                        key={
                                            emoji
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleReactionButton(
                                                emoji
                                            )
                                        }
                                        className="
                                            flex
                                            h-8
                                            w-8
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-full
                                            p-0
                                            text-lg
                                            leading-none
                                            transition
                                            hover:scale-125
                                            hover:bg-hover
                                            active:scale-110
                                        "
                                    >
                                        {
                                            emoji
                                        }
                                    </button>
                                )
                            )}
                        </div>
                    )}

                {/* ==================================================
                    REACTION CHIPS
                ================================================== */}

                {reactions.length >
                    0 && (
                    <div
                        className="
                            mt-1
                            flex
                            flex-wrap
                            gap-1
                        "
                    >
                        {groupReactions(
                            reactions
                        ).map(
                            ({
                                emoji,
                                count,
                            }) => (
                                <button
                                    key={
                                        emoji
                                    }
                                    type="button"
                                    onClick={() =>
                                        onToggleReaction?.(
                                            message,
                                            emoji
                                        )
                                    }
                                    className="
                                        rounded-full
                                        border
                                        border-border
                                        bg-surface
                                        px-2
                                        py-0.5
                                        text-xs
                                        transition
                                        hover:bg-hover
                                    "
                                >
                                    {
                                        emoji
                                    }{" "}
                                    {count >
                                        1 &&
                                        count}
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// STATUS REPLY PREVIEW
// ============================================================

function StatusReplyPreview({
    status,
}) {
    if (!status) {
        return null;
    }

    const statusUserName =
        status?.user?.displayName?.trim() ||
        status?.user?.username?.trim() ||
        "User";

    const hasMedia =
        Boolean(
            status?.mediaUrl
        );

    const mediaType =
        status?.mediaType || "";

    const isImage =
        mediaType ===
            "IMAGE" ||
        mediaType.startsWith(
            "image/"
        );

    const isVideo =
        mediaType ===
            "VIDEO" ||
        mediaType.startsWith(
            "video/"
        );

    const backgroundColor =
        status?.backgroundColor ||
        null;

    return (
        <div
            className="
                mb-2
                w-full
                max-w-[280px]
                overflow-hidden
                rounded-lg
                border
                border-border
                bg-background
            "
        >
            {hasMedia &&
                isImage && (
                    <div className="relative h-36 w-full overflow-hidden">
                        <img
                            src={
                                status.mediaUrl
                            }
                            alt={
                                status.mediaName ||
                                "Status"
                            }
                            className="
                                h-full
                                w-full
                                object-cover
                            "
                        />

                        <div
                            className="
                                absolute
                                inset-x-0
                                bottom-0
                                bg-gradient-to-t
                                from-black/70
                                to-transparent
                                px-3
                                pb-2
                                pt-6
                            "
                        >
                            <p
                                className="
                                    truncate
                                    text-xs
                                    font-medium
                                    text-white
                                "
                            >
                                {
                                    statusUserName
                                }
                            </p>
                        </div>
                    </div>
                )}

            {hasMedia &&
                isVideo && (
                    <div className="relative h-36 w-full overflow-hidden">
                        <video
                            src={
                                status.mediaUrl
                            }
                            className="
                                h-full
                                w-full
                                object-cover
                            "
                        />

                        <div
                            className="
                                absolute
                                inset-x-0
                                bottom-0
                                bg-gradient-to-t
                                from-black/70
                                to-transparent
                                px-3
                                pb-2
                                pt-6
                            "
                        >
                            <p
                                className="
                                    truncate
                                    text-xs
                                    font-medium
                                    text-white
                                "
                            >
                                {
                                    statusUserName
                                }
                            </p>
                        </div>
                    </div>
                )}

            {!hasMedia && (
                <div
                    className="
                        flex
                        min-h-[120px]
                        w-full
                        items-center
                        justify-center
                        px-5
                        py-5
                    "
                    style={{
                        backgroundColor:
                            backgroundColor ||
                            undefined,
                    }}
                >
                    <div className="text-center">
                        {status?.content && (
                            <p
                                className="
                                    line-clamp-4
                                    break-words
                                    text-sm
                                    font-medium
                                "
                                style={{
                                    color:
                                        MESSAGE_TEXT_COLOR,
                                }}
                            >
                                {
                                    status.content
                                }
                            </p>
                        )}

                        <p
                            className="
                                mt-2
                                text-[10px]
                            "
                            style={{
                                color:
                                    MESSAGE_META_COLOR,
                            }}
                        >
                            {
                                statusUserName
                            }
                        </p>
                    </div>
                </div>
            )}

            {hasMedia &&
                status?.content && (
                    <div
                        className="
                            border-t
                            border-border
                            bg-background
                            px-3
                            py-2
                        "
                    >
                        <p
                            className="
                                line-clamp-2
                                break-words
                                text-xs
                            "
                            style={{
                                color:
                                    MESSAGE_TEXT_COLOR,
                            }}
                        >
                            {
                                status.content
                            }
                        </p>
                    </div>
                )}

            <div
                className="
                    border-t
                    border-border
                    px-3
                    py-1.5
                "
            >
                <p
                    className="
                        text-[10px]
                        font-medium
                    "
                    style={{
                        color:
                            MESSAGE_META_COLOR,
                    }}
                >
                    Status reply
                </p>
            </div>
        </div>
    );
}

// ============================================================
// MESSAGE ATTACHMENT
// ============================================================

function MessageAttachment({
    message,
}) {
    const {
        attachmentUrl,
        attachmentName,
        attachmentMimeType,
        attachmentSize,
    } = message;

    const mime =
        attachmentMimeType || "";

    if (
        message?.type ===
            "IMAGE" ||
        mime.startsWith(
            "image/"
        )
    ) {
        return (
            <a
                href={
                    attachmentUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="
                    block
                    overflow-hidden
                    rounded-lg
                "
            >
                <img
                    src={
                        attachmentUrl
                    }
                    alt={
                        attachmentName ||
                        "Image"
                    }
                    className="
                        max-h-[350px]
                        max-w-full
                        rounded-lg
                        object-cover
                    "
                />
            </a>
        );
    }

    if (
        message?.type ===
            "VIDEO" ||
        mime.startsWith(
            "video/"
        )
    ) {
        return (
            <video
                src={
                    attachmentUrl
                }
                controls
                className="
                    max-h-[350px]
                    max-w-full
                    rounded-lg
                "
            />
        );
    }

    if (
        message?.type ===
            "AUDIO" ||
        mime.startsWith(
            "audio/"
        )
    ) {
        return (
            <div className="min-w-[240px]">
                <audio
                    src={
                        attachmentUrl
                    }
                    controls
                    className="w-full"
                />
            </div>
        );
    }

    return (
        <a
            href={
                attachmentUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            download={
                attachmentName ||
                undefined
            }
            className="
                flex
                max-w-sm
                items-center
                gap-3
                rounded-lg
                bg-background
                p-3
                transition
                hover:bg-hover
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
                    rounded-lg
                    bg-surface
                    text-xl
                "
            >
                📄
            </div>

            <div className="min-w-0 flex-1">
                <p
                    className="
                        truncate
                        text-sm
                    "
                    style={{
                        color:
                            MESSAGE_TEXT_COLOR,
                    }}
                >
                    {attachmentName ||
                        "Attached file"}
                </p>

                {attachmentSize && (
                    <p
                        className="
                            mt-1
                            text-xs
                        "
                        style={{
                            color:
                                MESSAGE_META_COLOR,
                        }}
                    >
                        {formatFileSize(
                            attachmentSize
                        )}
                    </p>
                )}
            </div>

            <span
                className="
                    shrink-0
                "
                style={{
                    color:
                        MESSAGE_META_COLOR,
                }}
            >
                ↓
            </span>
        </a>
    );
}

// ============================================================
// RECEIPTS
// ============================================================

function ReceiptTicks({
    message,
    isRecipientOnline = false,
}) {
    const receipts =
        Array.isArray(
            message?.receipts
        )
            ? message.receipts
            : [];

    // ========================================================
    // READ
    // ========================================================

    const allRead =
        receipts.length > 0 &&
        receipts.every(
            (receipt) =>
                Boolean(
                    receipt?.readAt
                )
        );

    if (allRead) {
        return (
            <span
                className="
                    text-[12px]
                    font-bold
                    text-green-500
                "
                title="Read"
            >
                ✓✓
            </span>
        );
    }

    // ========================================================
    // ONLINE / DELIVERED
    // ========================================================

    if (isRecipientOnline) {
        return (
            <span
                className="
                    text-[12px]
                    font-bold
                "
                style={{
                    color:
                        MESSAGE_META_COLOR,
                }}
                title="Delivered"
            >
                ✓✓
            </span>
        );
    }

    // ========================================================
    // SERVER DELIVERY RECEIPT
    // ========================================================

    const allDelivered =
        receipts.length > 0 &&
        receipts.every(
            (receipt) =>
                Boolean(
                    receipt?.deliveredAt
                )
        );

    if (allDelivered) {
        return (
            <span
                className="
                    text-[12px]
                    font-bold
                "
                style={{
                    color:
                        MESSAGE_META_COLOR,
                }}
                title="Delivered"
            >
                ✓✓
            </span>
        );
    }

    // ========================================================
    // SENT
    // ========================================================

    return (
        <span
            className="
                text-[12px]
                font-bold
            "
            style={{
                color:
                    MESSAGE_META_COLOR,
            }}
            title="Sent"
        >
            ✓
        </span>
    );
}

// ============================================================
// GROUP REACTIONS
// ============================================================

function groupReactions(
    reactions
) {
    const groups = {};

    reactions.forEach(
        (reaction) => {
            if (
                !groups[
                    reaction?.emoji
                ]
            ) {
                groups[
                    reaction?.emoji
                ] = 0;
            }

            groups[
                reaction?.emoji
            ]++;
        }
    );

    return Object.entries(
        groups
    ).map(
        ([emoji, count]) => ({
            emoji,
            count,
        })
    );
}

// ============================================================
// INITIALS
// ============================================================

function getInitials(
    username
) {
    if (!username) {
        return "?";
    }

    return username
        .split(" ")
        .filter(Boolean)
        .map(
            (word) =>
                word[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

// ============================================================
// MESSAGE TIME
// ============================================================

function formatTime(date) {
    if (!date) {
        return "";
    }

    const value =
        new Date(date);

    if (
        Number.isNaN(
            value.getTime()
        )
    ) {
        return "";
    }

    return value.toLocaleTimeString(
        [],
        {
            hour: "numeric",
            minute: "2-digit",
        }
    );
}

// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(
    bytes
) {
    if (!bytes) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
    ];

    const index =
        Math.floor(
            Math.log(bytes) /
                Math.log(1024)
        );

    return `${(
        bytes /
        Math.pow(
            1024,
            index
        )
    ).toFixed(
        index === 0
            ? 0
            : 1
    )} ${units[index]}`;
}