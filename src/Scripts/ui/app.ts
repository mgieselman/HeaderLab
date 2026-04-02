/**
 * Standalone entry point: textarea-based header analyzer.
 */

import "../../Content/theme.css";
import "../../Content/typography.css";
import "../../Content/layout.css";
import "../../Content/components.css";

import { createAppShell } from "./components/AppShell";
import { AppState } from "./state/AppState";

const root = document.getElementById("app");
if (root) {
    const state = new AppState();
    createAppShell(root, state, "standalone");
}
