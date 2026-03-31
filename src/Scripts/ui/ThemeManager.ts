import { Poster } from "../Poster";

/**
 * Manages theme and color mode (light/dark) across the MHA app.
 *
 * Sets `data-theme` and `data-mode` attributes on <html>.
 * Persists choices to localStorage.
 * Relays theme changes across the iframe boundary (parent <-> child frames).
 */

const storageKeyTheme = "mha-theme";
const storageKeyMode = "mha-mode";

export type ThemeName = "default" | "neon-grid" | "fluent-refresh" | "glassmorphism" | "minimal-mono" | "warm-earth" | "aurora-nord";
export type ModeName = "light" | "dark" | "system";

export class ThemeManager {
    private static currentTheme: ThemeName = "default";
    private static currentMode: ModeName = "system";
    private static mediaQuery: MediaQueryList | null = null;

    /**
     * Initialize the theme system. Call once from each entry point.
     * Reads persisted preferences and applies them immediately.
     * @param listenForParent If true, listen for theme messages from parent frame.
     */
    public static initialize(listenForParent = false): void {
        // Read persisted preferences
        ThemeManager.currentTheme = ThemeManager.readStorage(storageKeyTheme, "default") as ThemeName;
        ThemeManager.currentMode = ThemeManager.readStorage(storageKeyMode, "system") as ModeName;

        // Apply immediately (before any paint if possible)
        ThemeManager.applyTheme();
        ThemeManager.applyMode();

        // Listen for system dark mode changes
        ThemeManager.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        ThemeManager.mediaQuery.addEventListener("change", () => {
            if (ThemeManager.currentMode === "system") {
                ThemeManager.applyMode();
            }
        });

        // Listen for theme messages from parent/child frames
        if (listenForParent) {
            window.addEventListener("message", ThemeManager.handleMessage, false);
        }
    }

    /** Get the current theme name. */
    public static get theme(): ThemeName {
        return ThemeManager.currentTheme;
    }

    /** Get the current mode setting. */
    public static get mode(): ModeName {
        return ThemeManager.currentMode;
    }

    /** Set theme and persist. Optionally relay to child frame. */
    public static setTheme(theme: ThemeName, childFrame?: Window): void {
        ThemeManager.currentTheme = theme;
        ThemeManager.writeStorage(storageKeyTheme, theme);
        ThemeManager.applyTheme();

        if (childFrame) {
            Poster.postMessageToFrame(childFrame, "themeChange", { theme, mode: ThemeManager.currentMode });
        }
    }

    /** Set color mode and persist. Optionally relay to child frame. */
    public static setMode(mode: ModeName, childFrame?: Window): void {
        ThemeManager.currentMode = mode;
        ThemeManager.writeStorage(storageKeyMode, mode);
        ThemeManager.applyMode();

        if (childFrame) {
            Poster.postMessageToFrame(childFrame, "themeChange", { theme: ThemeManager.currentTheme, mode });
        }
    }

    /** Resolve whether we're effectively in dark mode right now. */
    public static get isDark(): boolean {
        if (ThemeManager.currentMode === "dark") return true;
        if (ThemeManager.currentMode === "light") return false;
        // "system" — check OS preference
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    /** Apply data-theme attribute on <html>. */
    private static applyTheme(): void {
        const root = document.documentElement;
        if (ThemeManager.currentTheme === "default") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", ThemeManager.currentTheme);
        }
    }

    /** Apply data-mode attribute on <html>. */
    private static applyMode(): void {
        const root = document.documentElement;
        if (ThemeManager.currentMode === "system") {
            // Resolve system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            if (prefersDark) {
                root.setAttribute("data-mode", "dark");
            } else {
                root.removeAttribute("data-mode");
            }
        } else if (ThemeManager.currentMode === "dark") {
            root.setAttribute("data-mode", "dark");
        } else {
            root.removeAttribute("data-mode");
        }
    }

    /** Handle incoming theme messages from parent frame. */
    private static handleMessage(event: MessageEvent): void {
        if (!event || event.origin !== Poster.site()) return;
        if (event.data?.eventName === "themeChange") {
            const { theme, mode } = event.data.data;
            if (theme) {
                ThemeManager.currentTheme = theme;
                ThemeManager.writeStorage(storageKeyTheme, theme);
                ThemeManager.applyTheme();
            }
            if (mode) {
                ThemeManager.currentMode = mode;
                ThemeManager.writeStorage(storageKeyMode, mode);
                ThemeManager.applyMode();
            }
        }
    }

    private static readStorage(key: string, fallback: string): string {
        try {
            return localStorage.getItem(key) || fallback;
        } catch {
            return fallback;
        }
    }

    private static writeStorage(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage may be unavailable in some iframe contexts
        }
    }
}
