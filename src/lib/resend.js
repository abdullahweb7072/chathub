import nodemailer from "nodemailer";

// ================================================================
// GMAIL TRANSPORTER
// ================================================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// ================================================================
// SEND VERIFICATION EMAIL
// ================================================================

export async function sendVerificationEmail({
    email,
    username,
    code,
}) {
    try {
        await transporter.sendMail({
            from: `"ChatHub" <${process.env.GMAIL_USER}>`,

            to: email,

            subject: "ChatHub verification code",

            html: `
                <div
                    style="
                        font-family: Arial, sans-serif;
                        max-width: 500px;
                        margin: 40px auto;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-radius: 16px;
                    "
                >

                    <h1
                        style="
                            text-align: center;
                            color: #111827;
                        "
                    >
                        Verify your ChatHub account
                    </h1>

                    <p
                        style="
                            color: #6b7280;
                            text-align: center;
                        "
                    >
                        Hi ${escapeHtml(username)},
                    </p>

                    <p
                        style="
                            color: #6b7280;
                            text-align: center;
                        "
                    >
                        Enter this code to verify your
                        email address:
                    </p>

                    <div
                        style="
                            margin: 30px 0;
                            padding: 20px;
                            background: #f3f4f6;
                            border-radius: 12px;
                            text-align: center;
                        "
                    >

                        <strong
                            style="
                                font-size: 32px;
                                letter-spacing: 8px;
                                color: #111827;
                            "
                        >
                            ${escapeHtml(code)}
                        </strong>

                    </div>

                    <p
                        style="
                            color: #6b7280;
                            text-align: center;
                            font-size: 13px;
                        "
                    >
                        This code expires in 10 minutes.
                    </p>

                    <p
                        style="
                            color: #9ca3af;
                            text-align: center;
                            font-size: 12px;
                            margin-top: 25px;
                        "
                    >
                        If you did not create a ChatHub
                        account, you can safely ignore this email.
                    </p>

                </div>
            `,
        });

        console.log(
            `✅ Verification email sent to ${email}`
        );

    } catch (error) {

        console.error(
            "GMAIL EMAIL ERROR:",
            error
        );

        throw new Error(
            "Failed to send verification email."
        );
    }
}

// ================================================================
// HTML ESCAPE
// ================================================================

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}