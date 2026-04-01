/**
 * Manages theme (light/dark/system) and persists to localStorage.
 */

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "headerlab-theme";

export class ThemeManager {
    private mode: ThemeMode;

    constructor() {
        this.mode = this.load();
        this.apply();
    }

    private load(): ThemeMode {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
            return stored;
        }
        return "system";
    }

    public getMode(): ThemeMode {
        return this.mode;
    }

    public setMode(mode: ThemeMode): void {
        this.mode = mode;
        localStorage.setItem(STORAGE_KEY, mode);
        this.apply();
    }

    private apply(): void {
        document.documentElement.setAttribute("data-theme", this.mode);
    }
}
