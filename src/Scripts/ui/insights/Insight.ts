/**
 * Typed insight produced by the InsightEngine for display in the summary panel.
 */

export type InsightSeverity = "success" | "info" | "warning" | "error";

export interface Insight {
    /** Severity controls badge color: green/blue/yellow/red */
    severity: InsightSeverity;
    /** Short label displayed on the badge */
    label: string;
    /** Longer detail shown as tooltip or secondary text */
    detail: string;
    /** Category groups related insights for ordering */
    category: "auth" | "spam" | "delivery" | "security" | "anomaly";
}
