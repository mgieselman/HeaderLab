/**
 * Analyzes a HeaderModel and produces a list of Insight badges
 * for the summary panel overview.
 */

import { Insight, InsightSeverity } from "./Insight";
import { HeaderModel } from "../../model/HeaderModel";
import { ReceivedRow } from "../../row/ReceivedRow";
import { Row } from "../../row/Row";

/** Extract value for a named field from antispam Row arrays */
function getFieldValue(rows: Row[], header: string): string {
    for (const row of rows) {
        if (row.header.toUpperCase() === header.toUpperCase() && row.value) {
            return row.value;
        }
    }
    return "";
}

/** Find a header value from the Other headers table */
function getOtherHeader(model: HeaderModel, headerName: string): string {
    for (const row of model.otherHeaders.rows) {
        if (row.header.toUpperCase() === headerName.toUpperCase()) {
            return row.value;
        }
    }
    return "";
}

/** Parse an auth result like "spf=pass" from Authentication-Results header */
function parseAuthResult(authHeader: string, mechanism: string): string {
    if (!authHeader) return "";
    // Match "spf=pass", "dkim=fail (reason)", "dmarc=pass", etc.
    const pattern = new RegExp(`${mechanism}\\s*=\\s*(\\w+)`, "i");
    const match = authHeader.match(pattern);
    return match?.[1]?.toLowerCase() ?? "";
}

function authSeverity(result: string): InsightSeverity {
    switch (result) {
        case "pass": return "success";
        case "softfail": return "warning";
        case "temperror":
        case "permerror":
        case "neutral": return "warning";
        case "fail": return "error";
        case "none": return "info";
        default: return "info";
    }
}

function authLabel(mechanism: string, result: string): string {
    return `${mechanism.toUpperCase()} ${result}`;
}

function authDetail(mechanism: string, result: string): string {
    const names: Record<string, string> = {
        spf: "Sender Policy Framework",
        dkim: "DomainKeys Identified Mail",
        dmarc: "Domain-based Message Authentication",
        compauth: "Composite Authentication",
    };
    return `${names[mechanism] ?? mechanism}: ${result}`;
}

/** Describe SCL values */
function sclDescription(scl: number): { severity: InsightSeverity; detail: string } {
    if (scl <= -1) return { severity: "success", detail: "Message skipped filtering (trusted sender)" };
    if (scl === 0) return { severity: "success", detail: "Not spam — message was clean" };
    if (scl === 1) return { severity: "success", detail: "Not spam — low confidence" };
    if (scl <= 4) return { severity: "info", detail: "Low spam confidence" };
    if (scl === 5) return { severity: "warning", detail: "Spam — moderate confidence" };
    if (scl <= 8) return { severity: "error", detail: "Spam — high confidence" };
    return { severity: "error", detail: "Spam — highest confidence (SCL 9)" };
}

type InsightDesc = { severity: InsightSeverity; label: string; detail: string };

/** Describe SFV codes */
function sfvDescription(sfv: string): InsightDesc | null {
    switch (sfv.toUpperCase()) {
        case "BLK": return { severity: "error", label: "Blocked sender", detail: "Message blocked by recipient's block list" };
        case "NSPM": return { severity: "success", label: "Not spam", detail: "Spam filter determined message is not spam" };
        case "SFE": return { severity: "success", label: "Safe sender", detail: "Sender is on the recipient's safe senders list" };
        case "SKA": return { severity: "info", label: "Allow-listed", detail: "Skipped filtering due to sender allow list" };
        case "SKB": return { severity: "error", label: "Block-listed", detail: "Matched a sender block list" };
        case "SKI": return { severity: "info", label: "Internal", detail: "Intra-org message, skipped spam filtering" };
        case "SKN": return { severity: "info", label: "Transport rule", detail: "Marked as non-spam by a transport rule" };
        case "SKQ": return { severity: "info", label: "Released", detail: "Message released from quarantine" };
        case "SKS": return { severity: "info", label: "Rule skip", detail: "Marked as spam before content filter — transport rule" };
        case "SPM": return { severity: "error", label: "Spam", detail: "Message was marked as spam by the content filter" };
        case "DMS": return { severity: "error", label: "Verdict overridden", detail: "Spam verdict ignored due to tenant settings" };
        default: return null;
    }
}

/** Describe CAT codes */
function catDescription(cat: string): InsightDesc | null {
    switch (cat.toUpperCase()) {
        case "BULK": return { severity: "warning", label: "Bulk mail", detail: "Categorized as bulk/marketing email" };
        case "DIMP": return { severity: "error", label: "Domain impersonation", detail: "Detected as domain impersonation phishing" };
        case "GIMP": return { severity: "error", label: "Mailbox intelligence", detail: "Phishing based on mailbox intelligence" };
        case "HPHSH":
        case "HPHISH": return { severity: "error", label: "High-confidence phish", detail: "High-confidence phishing message" };
        case "HSPM": return { severity: "error", label: "High-confidence spam", detail: "High-confidence spam message" };
        case "MALW": return { severity: "error", label: "Malware", detail: "Message contains malware" };
        case "PHSH": return { severity: "error", label: "Phishing", detail: "Message identified as phishing" };
        case "SPM": return { severity: "error", label: "Spam", detail: "Categorized as spam by protection policy" };
        case "SPOOF": return { severity: "error", label: "Spoofed", detail: "Message detected as spoofed" };
        case "UIMP": return { severity: "error", label: "User impersonation", detail: "Detected as user impersonation" };
        case "AMP": return { severity: "error", label: "Anti-malware", detail: "Message contains anti-malware threat" };
        case "SAP": return { severity: "warning", label: "Safe Attachments", detail: "Flagged by Safe Attachments policy" };
        case "OSPM": return { severity: "warning", label: "Outbound spam", detail: "Marked as outbound spam" };
        case "NONE": return { severity: "success", label: "Clean", detail: "No threats detected by protection policies" };
        default: return null;
    }
}

export function generateInsights(model: HeaderModel): Insight[] {
    const insights: Insight[] = [];

    // --- Authentication Results ---
    const authResults = getOtherHeader(model, "Authentication-Results");
    const arcAuthResults = getOtherHeader(model, "ARC-Authentication-Results");
    const authHeader = authResults || arcAuthResults;

    if (authHeader) {
        for (const mechanism of ["spf", "dkim", "dmarc"]) {
            const result = parseAuthResult(authHeader, mechanism);
            if (result) {
                insights.push({
                    severity: authSeverity(result),
                    label: authLabel(mechanism, result),
                    detail: authDetail(mechanism, result),
                    category: "auth",
                });
            }
        }
        const compauth = parseAuthResult(authHeader, "compauth");
        if (compauth) {
            insights.push({
                severity: authSeverity(compauth),
                label: `CompAuth ${compauth}`,
                detail: authDetail("compauth", compauth),
                category: "auth",
            });
        }
    }

    // --- Spam Confidence Level (SCL) ---
    const sclValue = getFieldValue(model.forefrontAntiSpamReport.rows, "SCL");
    if (sclValue) {
        const scl = parseInt(sclValue, 10);
        if (!isNaN(scl)) {
            const desc = sclDescription(scl);
            insights.push({
                severity: desc.severity,
                label: `SCL ${scl}`,
                detail: desc.detail,
                category: "spam",
            });
        }
    }

    // --- Spam Filter Verdict (SFV) ---
    const sfvValue = getFieldValue(model.forefrontAntiSpamReport.rows, "SFV");
    if (sfvValue) {
        const desc = sfvDescription(sfvValue);
        if (desc) {
            insights.push({
                severity: desc.severity,
                label: desc.label,
                detail: desc.detail,
                category: "spam",
            });
        }
    }

    // --- Protection Policy Category (CAT) ---
    const catValue = getFieldValue(model.forefrontAntiSpamReport.rows, "CAT");
    if (catValue) {
        const desc = catDescription(catValue);
        if (desc) {
            insights.push({
                severity: desc.severity,
                label: desc.label,
                detail: desc.detail,
                category: "spam",
            });
        }
    }

    // --- Bulk Complaint Level (BCL) ---
    const bclValue = getFieldValue(model.antiSpamReport.rows, "BCL");
    if (bclValue) {
        const bcl = parseInt(bclValue, 10);
        if (!isNaN(bcl)) {
            let severity: InsightSeverity = "success";
            let detail = "Low bulk complaint level";
            if (bcl >= 7) {
                severity = "error";
                detail = "High bulk complaint level — likely bulk/spam sender";
            } else if (bcl >= 4) {
                severity = "warning";
                detail = "Moderate bulk complaint level";
            }
            insights.push({
                severity,
                label: `BCL ${bcl}`,
                detail,
                category: "spam",
            });
        }
    }

    // --- Phishing Confidence Level (PCL) ---
    const pclValue = getFieldValue(model.forefrontAntiSpamReport.rows, "PCL");
    if (pclValue) {
        const pcl = parseInt(pclValue, 10);
        if (!isNaN(pcl) && pcl > 0) {
            let severity: InsightSeverity = "warning";
            let detail = "Possible phishing indicators detected";
            if (pcl >= 4) {
                severity = "error";
                detail = "Strong phishing indicators — message likely phishing";
            }
            insights.push({
                severity,
                label: `PCL ${pcl}`,
                detail,
                category: "spam",
            });
        }
    }

    // --- Country of Origin ---
    const ctry = getFieldValue(model.forefrontAntiSpamReport.rows, "CTRY");
    if (ctry) {
        insights.push({
            severity: "info",
            label: `Origin: ${ctry}`,
            detail: `Message originated from country/region: ${ctry}`,
            category: "security",
        });
    }

    // --- Directionality ---
    const dir = getFieldValue(model.forefrontAntiSpamReport.rows, "DIR");
    if (dir) {
        let dirDetail: string;
        switch (dir) {
            case "Inbound": dirDetail = "Inbound message from external sender"; break;
            case "Outbound": dirDetail = "Outbound message from your organization"; break;
            case "Intra-org": dirDetail = "Message sent within your organization"; break;
            default: dirDetail = `Message directionality: ${dir}`;
        }
        insights.push({
            severity: "info",
            label: dir,
            detail: dirDetail,
            category: "security",
        });
    }

    // --- Connecting IP ---
    const cip = getFieldValue(model.forefrontAntiSpamReport.rows, "CIP");
    if (cip) {
        insights.push({
            severity: "info",
            label: `IP: ${cip}`,
            detail: `Connecting IP address: ${cip}`,
            category: "security",
        });
    }

    // --- Delivery performance ---
    const hops = model.receivedHeaders.rows;
    if (hops.length > 0) {
        insights.push({
            severity: "info",
            label: `${hops.length} hop${hops.length !== 1 ? "s" : ""}`,
            detail: `Message traversed ${hops.length} server${hops.length !== 1 ? "s" : ""}`,
            category: "delivery",
        });

        // Total delivery time
        const totalTime = model.summary.totalTime;
        if (totalTime) {
            const isLong = isLongDelivery(hops);
            insights.push({
                severity: isLong ? "warning" : "success",
                label: `Transit: ${totalTime}`,
                detail: isLong
                    ? `Total delivery time was ${totalTime} — longer than typical`
                    : `Total delivery time: ${totalTime}`,
                category: "delivery",
            });
        }

        // Largest hop delay
        const bottleneck = findBottleneck(hops);
        if (bottleneck) {
            insights.push({
                severity: bottleneck.severity,
                label: `Bottleneck: ${bottleneck.delay}`,
                detail: `Largest delay at hop ${bottleneck.hop}: ${bottleneck.from} → ${bottleneck.by} (${bottleneck.delay})`,
                category: "delivery",
            });
        }

        // Time travel (negative delays)
        const timeTravelHops = findTimeTravelHops(hops);
        if (timeTravelHops.length > 0) {
            insights.push({
                severity: "warning",
                label: `Time skew (${timeTravelHops.length} hop${timeTravelHops.length !== 1 ? "s" : ""})`,
                detail: `Negative delay at hop${timeTravelHops.length !== 1 ? "s" : ""} ${timeTravelHops.join(", ")} — clock skew or header manipulation`,
                category: "anomaly",
            });
        }

        // TLS/encryption check
        const tlsInfo = analyzeTls(hops);
        if (tlsInfo.total > 0) {
            if (tlsInfo.encrypted === tlsInfo.total) {
                insights.push({
                    severity: "success",
                    label: "All hops encrypted",
                    detail: `All ${tlsInfo.total} hop${tlsInfo.total !== 1 ? "s" : ""} used TLS encryption`,
                    category: "security",
                });
            } else if (tlsInfo.encrypted > 0) {
                const plain = tlsInfo.total - tlsInfo.encrypted;
                insights.push({
                    severity: "warning",
                    label: `${plain} unencrypted hop${plain !== 1 ? "s" : ""}`,
                    detail: `${tlsInfo.encrypted} of ${tlsInfo.total} hops used TLS — ${plain} transmitted in plaintext`,
                    category: "security",
                });
            } else {
                insights.push({
                    severity: "error",
                    label: "No encryption",
                    detail: "No hops used TLS encryption — message transmitted in plaintext",
                    category: "security",
                });
            }
        }
    }

    // --- Message priority ---
    const priority = getOtherHeader(model, "X-Priority") || getOtherHeader(model, "X-MSMail-Priority");
    const importance = getOtherHeader(model, "Importance");
    if (priority || importance) {
        const pInfo = parsePriority(priority, importance);
        if (pInfo) {
            insights.push({
                severity: pInfo.severity,
                label: pInfo.label,
                detail: pInfo.detail,
                category: "anomaly",
            });
        }
    }

    // --- Rule violations summary ---
    const violations = model.violationGroups;
    if (violations.length > 0) {
        const errors = violations.filter(v => v.severity === "error").length;
        const warnings = violations.filter(v => v.severity === "warning").length;
        const infos = violations.filter(v => v.severity === "info").length;
        const parts: string[] = [];
        if (errors > 0) parts.push(`${errors} error${errors !== 1 ? "s" : ""}`);
        if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);
        if (infos > 0) parts.push(`${infos} info`);
        const severity: InsightSeverity = errors > 0 ? "error" : warnings > 0 ? "warning" : "info";
        insights.push({
            severity,
            label: `${violations.length} diagnostic${violations.length !== 1 ? "s" : ""}`,
            detail: `Rule analysis found: ${parts.join(", ")}`,
            category: "anomaly",
        });
    }

    // --- Phishing safety (SFTY) ---
    const sfty = getFieldValue(model.forefrontAntiSpamReport.rows, "SFTY");
    if (sfty) {
        insights.push({
            severity: "error",
            label: "Phishing flag",
            detail: `Phishing safety value: ${sfty}`,
            category: "spam",
        });
    }

    return insights;
}

// --- Helper functions ---

function isLongDelivery(hops: ReceivedRow[]): boolean {
    // Consider > 5 minutes as long delivery
    for (const hop of hops) {
        const dateNum = hop.dateNum.value;
        if (typeof dateNum === "number" && !isNaN(dateNum)) {
            // Find first and last valid timestamps
            let first = Infinity;
            let last = -Infinity;
            for (const h of hops) {
                const d = h.dateNum.value;
                if (typeof d === "number" && !isNaN(d)) {
                    if (d < first) first = d;
                    if (d > last) last = d;
                }
            }
            return (last - first) > 5 * 60 * 1000;
        }
    }
    return false;
}

function findBottleneck(hops: ReceivedRow[]): { hop: number; delay: string; from: string; by: string; severity: InsightSeverity } | null {
    let maxDelay = 0;
    let bottleneck: ReceivedRow | null = null;

    for (const hop of hops) {
        const sort = hop.delaySort.value;
        if (typeof sort === "number" && sort > maxDelay) {
            maxDelay = sort;
            bottleneck = hop;
        }
    }

    if (!bottleneck || maxDelay <= 0) return null;

    const delay = typeof bottleneck.delay.value === "string" ? bottleneck.delay.value : "";
    if (!delay) return null;

    return {
        hop: typeof bottleneck.hop.value === "number" ? bottleneck.hop.value : 0,
        delay,
        from: (bottleneck.from.value ?? "").toString(),
        by: (bottleneck.by.value ?? "").toString(),
        severity: maxDelay > 60000 ? "warning" : "info",
    };
}

function findTimeTravelHops(hops: ReceivedRow[]): number[] {
    const result: number[] = [];
    for (const hop of hops) {
        const sort = hop.delaySort.value;
        if (typeof sort === "number" && sort < 0) {
            const hopNum = typeof hop.hop.value === "number" ? hop.hop.value : 0;
            if (hopNum > 0) result.push(hopNum);
        }
    }
    return result;
}

function analyzeTls(hops: ReceivedRow[]): { total: number; encrypted: number } {
    let total = 0;
    let encrypted = 0;
    const tlsPatterns = /\b(ESMTPS|TLS\S*|STARTTLS|mapi\s+over\s+https|https|SMTPS)\b/i;

    for (const hop of hops) {
        const withVal = (hop.with.value ?? "").toString();
        if (withVal) {
            total++;
            if (tlsPatterns.test(withVal)) {
                encrypted++;
            }
        }
    }
    return { total, encrypted };
}

function parsePriority(xPriority: string, importance: string): { severity: InsightSeverity; label: string; detail: string } | null {
    // X-Priority: 1 (Highest), 2 (High), 3 (Normal), 4 (Low), 5 (Lowest)
    // Importance: high, normal, low
    const imp = importance?.toLowerCase() ?? "";
    const pri = parseInt(xPriority, 10);

    if (pri === 1 || pri === 2 || imp === "high") {
        return { severity: "warning", label: "High priority", detail: "Message was marked as high priority/importance" };
    }
    if (pri === 4 || pri === 5 || imp === "low") {
        return { severity: "info", label: "Low priority", detail: "Message was marked as low priority/importance" };
    }
    // Normal priority — not interesting enough to show
    return null;
}
