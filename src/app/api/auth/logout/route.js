
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = NextResponse.json(
            {
                success: true,
                message: "Logout successful",
            },
            {
                status: 200,
            }
        );

        // Remove the JWT authentication cookie
        response.cookies.set("Token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: new Date(0),
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("LOGOUT ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while logging out.",
            },
            {
                status: 500,
            }
        );
    }
}

