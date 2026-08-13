"use client";

export default function TypingIndicator({
isTyping = false,
username = "Someone",
}) {
if (!isTyping) {
return null;
}


return (
    <div
        style={{
            padding: "0 24px 10px",
            background: "#f8fafc",
        }}
    >
        <div
            style={{
                maxWidth: "900px",
                margin: "0 auto",
                color: "#6b7280",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
            }}
        >
            <span>
                {username} is typing
            </span>

            <span
                style={{
                    display: "inline-flex",
                    gap: "3px",
                }}
            >
                <span>•</span>
                <span>•</span>
                <span>•</span>
            </span>
        </div>
    </div>
);


}
