
import { auth } from "@/auth";

export default auth(
    function middleware(request) {
        const { pathname } =
            request.nextUrl;

        const user =
            request.auth?.user;

        // ========================================================
        // PUBLIC ROUTES
        // ========================================================

        const publicRoutes = [
            "/login",
            "/register",
            "/verify-email",
        ];

        const isPublicRoute =
            publicRoutes.some(
                (route) =>
                    pathname === route ||
                    pathname.startsWith(
                        `${route}/`
                    )
            );

        // ========================================================
        // COMPLETE SIGNUP
        // ========================================================

        const isCompleteSignup =
            pathname ===
            "/complete-signup";

        // ========================================================
        // NOT LOGGED IN
        // ========================================================

        if (!user) {
            /*
             * Allow public pages.
             */

            if (
                isPublicRoute ||
                isCompleteSignup
            ) {
                return;
            }

            /*
             * Everything else requires authentication.
             */

            const loginUrl =
                new URL(
                    "/login",
                    request.url
                );

            return Response.redirect(
                loginUrl
            );
        }

        // ========================================================
        // INCOMPLETE GOOGLE SIGNUP
        // ========================================================

        if (
            user.needsUsername === true
        ) {
            /*
             * The user must finish choosing
             * their ChatHub username.
             */

            if (!isCompleteSignup) {
                const completeSignupUrl =
                    new URL(
                        "/complete-signup",
                        request.url
                    );

                return Response.redirect(
                    completeSignupUrl
                );
            }

            /*
             * Already on complete-signup.
             * Allow the page to load.
             */

            return;
        }

        // ========================================================
        // COMPLETED USER
        // ========================================================

        /*
         * A completed user should not be able
         * to return to the username completion page.
         */

        if (isCompleteSignup) {
            const chatUrl =
                new URL(
                    "/chat",
                    request.url
                );

            return Response.redirect(
                chatUrl
            );
        }

        // ========================================================
        // NORMAL REQUEST
        // ========================================================

        return;
    }
);

// ============================================================
// MATCHER
// ============================================================

export const config = {
    matcher: [
        /*
         * Run middleware on application routes,
         * while skipping Next.js internals and
         * static assets.
         */

        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
