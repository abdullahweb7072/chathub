
"use client";

export default function LogoutConfirmModal({
    open,
    loading = false,
    onCancel,
    onConfirm,
}) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="
                fixed
                inset-0
                z-[100]
                flex
                items-center
                justify-center
                bg-black/50
                px-4
                backdrop-blur-sm
            "
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onCancel();
                }
            }}
        >
            <div
                className="
                    w-full
                    max-w-sm
                    overflow-hidden
                    rounded-2xl
                    border
                    border-border
                    bg-surface
                    text-foreground
                    shadow-2xl
                "
            >
                {/* HEADER */}
                <div className="px-6 pt-6">
                    <div
                        className="
                            mb-4
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-xl
                            bg-red-500/10
                            text-red-500
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
                                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 17l5-5-5-5"
                            />

                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12H3"
                            />
                        </svg>
                    </div>

                    <h2 className="text-lg font-semibold">
                        Logout from ChatHub?
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                        Are you sure you want to logout from your
                        ChatHub account?
                    </p>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 px-6 pb-6 pt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="
                            flex
                            h-11
                            flex-1
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-border
                            bg-background
                            text-sm
                            font-medium
                            text-foreground
                            transition
                            hover:bg-hover
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="
                            flex
                            h-11
                            flex-1
                            items-center
                            justify-center
                            rounded-xl
                            bg-red-500
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-red-600
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {loading ? (
                            <>
                                <span
                                    className="
                                        mr-2
                                        h-4
                                        w-4
                                        animate-spin
                                        rounded-full
                                        border-2
                                        border-white/30
                                        border-t-white
                                    "
                                />

                                Logging out...
                            </>
                        ) : (
                            "Logout"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

