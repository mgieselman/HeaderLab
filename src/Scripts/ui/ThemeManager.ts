/**
 * Manages theme and color mode (light/dark) across the MHA app.
 *
 * Sets `data-theme` and `data-mode` attributes on <html>.
 * Persists choices to localStorage.
 */

const storageKeyTheme = "mha-theme";
const storageKeyMode = "mha-mode";

export type ThemeName = "default" | "fluent-refresh" | "neon-grid";
export type ModeName = "light" | "dark" | "system";

export class ThemeManager {
    private static currentTheme: ThemeName = "default";
    private static currentMode: ModeName = "system";
    private static mediaQuery: MediaQueryList | null = null;

    /**
     * Initialize the theme system. Call once from each entry point.
     * Reads persisted preferences and applies them immediately.
     */
    public static initialize(): void {
        // Read persisted preferences (fall back to default for removed themes)
        const validThemes: ThemeName[] = ["default", "fluent-refresh", "neon-grid"];
        const storedTheme = ThemeManager.readStorage(storageKeyTheme, "default");
        ThemeManager.currentTheme = validThemes.includes(storedTheme as ThemeName) ? storedTheme as ThemeName : "default";
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
    }

    /** Get the current theme name. */
    public static get theme(): ThemeName {
        return ThemeManager.currentTheme;
    }

    /** Get the current mode setting. */
    public static get mode(): ModeName {
        return ThemeManager.currentMode;
    }

    /** Set theme and persist. */
    public static setTheme(theme: ThemeName): void {
        ThemeManager.currentTheme = theme;
        ThemeManager.writeStorage(storageKeyTheme, theme);
        ThemeManager.applyTheme();
    }

    /** Set color mode and persist. */
    public static setMode(mode: ModeName): void {
        ThemeManager.currentMode = mode;
        ThemeManager.writeStorage(storageKeyMode, mode);
        ThemeManager.applyMode();
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
            // Storage may be unavailable in some contexts
        }
    }
}
