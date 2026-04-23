/**
 * Typed insight produced by the InsightEngine for display in the summary panel.
 */

export type InsightSeverity = "success" | "info" | "warning" | "error";

export type InsightSection = "forefront" | "antispam" | "other" | "received";

export interface InsightAnchor {
    /** Source table the insight originated from */
    section: InsightSection;
    /** Row key (e.g. "SCL", "SFV", "BCL") used to find the owning kv row */
    rowKey: string;
}

export interface Insight {
    /** Severity controls badge color: green/blue/yellow/red */
    severity: InsightSeverity;
    /** Short label displayed on the badge */
    label: string;
    /** Optional plain-language explanation rendered after the label. Omit when the label stands alone. */
    detail?: string | undefined;
    /** Category groups related insights for ordering */
    category: "auth" | "spam" | "delivery" | "security" | "anomaly";
    /** Links the insight back to a specific kv row so renderers can paint severity on that row */
    anchor?: InsightAnchor | undefined;
}
