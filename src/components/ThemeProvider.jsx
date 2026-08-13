"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "chathub-theme";

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState("dark");
    const [mounted, setMounted] = useState(false);

    // ============================================================
    // GET SYSTEM THEME
    // ============================================================

    function getSystemTheme() {
        if (
            typeof window === "undefined"
        ) {
            return "dark";
        }

        return window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
            ? "dark"
            : "light";
    }

    // ============================================================
    // APPLY THEME
    // ============================================================

    function applyTheme(selectedTheme) {
        const root =
            document.documentElement;

        const actualTheme =
            selectedTheme === "system"
                ? getSystemTheme()
                : selectedTheme;

        root.setAttribute(
            "data-theme",
            actualTheme
        );

        root.classList.toggle(
            "dark",
            actualTheme === "dark"
        );

        root.classList.toggle(
            "light",
            actualTheme === "light"
        );
    }

    // ============================================================
    // INITIALIZE
    // ============================================================

    useEffect(() => {
        const savedTheme =
            localStorage.getItem(
                STORAGE_KEY
            );

        const initialTheme =
            savedTheme === "dark" ||
            savedTheme === "light" ||
            savedTheme === "system"
                ? savedTheme
                : "dark";

        setTheme(initialTheme);

        applyTheme(initialTheme);

        setMounted(true);
    }, []);

    // ============================================================
    // SYSTEM THEME LISTENER
    // ============================================================

    useEffect(() => {
        if (!mounted) {
            return;
        }

        if (theme !== "system") {
            return;
        }

        const mediaQuery =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            );

        function handleSystemThemeChange() {
            applyTheme("system");
        }

        mediaQuery.addEventListener(
            "change",
            handleSystemThemeChange
        );

        return () => {
            mediaQuery.removeEventListener(
                "change",
                handleSystemThemeChange
            );
        };
    }, [theme, mounted]);

    // ============================================================
    // CHANGE THEME
    // ============================================================

    function changeTheme(newTheme) {
        if (
            newTheme !== "dark" &&
            newTheme !== "light" &&
            newTheme !== "system"
        ) {
            return;
        }

        setTheme(newTheme);

        localStorage.setItem(
            STORAGE_KEY,
            newTheme
        );

        applyTheme(newTheme);
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                changeTheme,
                mounted,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useTheme() {
    const context =
        useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
}