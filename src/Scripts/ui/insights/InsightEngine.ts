/**
 * Analyzes a HeaderModel and produces a list of Insight badges
 * for the summary panel overview.
 */

import { Insight, InsightSeverity } from "./Insight";
import { HeaderModel } from "../../model/HeaderModel";
import { ReceivedRow } from "../../row/ReceivedRow";
import { getRowValue } from "../../row/Row";

/** Parse an auth result like "spf=pass" from Authentication-Results header */
function parseAuthResult(authHeader: string, mechanism: string): string {
    if (!authHeader) return "";
    // Match "spf=pass", "dkim=fail", "compauth=softpass", etc.
    // Allow hyphens in result tokens (e.g. "soft-fail" variants).
    const pattern = new RegExp(`${mechanism}\\s*=\\s*([\\w-]+)`, "i");
    const match = authHeader.match(pattern);
    return match?.[1]?.toLowerCase() ?? "";
}

type AuthEntry = { severity: InsightSeverity; detail?: string };

const SPF_RESULTS: Record<string, AuthEntry> = {
    pass: { severity: "success", detail: "Sender authorized by domain" },
    fail: { severity: "error", detail: "Sender not authorized by domain" },
    softfail: { severity: "warning", detail: "Sender not listed; domain doesn't enforce" },
    neutral: { severity: "warning", detail: "Domain takes no position" },
    none: { severity: "info", detail: "Domain published no policy" },
    temperror: { severity: "warning", detail: "Couldn't check — DNS lookup failed" },
    permerror: { severity: "warning", detail: "Domain's policy is broken" },
};

const DKIM_RESULTS: Record<string, AuthEntry> = {
    pass: { severity: "success", detail: "Message wasn't altered in transit" },
    fail: { severity: "error", detail: "Message was altered or key mismatched" },
    neutral: { severity: "warning", detail: "Signature couldn't be evaluated" },
    policy: { severity: "warning", detail: "Signature couldn't be evaluated" },
    none: { severity: "info", detail: "Message wasn't signed" },
    temperror: { severity: "warning", detail: "Couldn't check — DNS lookup failed" },
    permerror: { severity: "warning", detail: "Signature header is malformed" },
};

const DMARC_RESULTS: Record<string, AuthEntry> = {
    pass: { severity: "success", detail: "From address matches authenticated domain" },
    fail: { severity: "error", detail: "From address doesn't match authenticated domain" },
    bestguesspass: { severity: "info", detail: "No policy, but authentication looks consistent" },
    none: { severity: "info", detail: "Domain published no policy" },
    temperror: { severity: "warning", detail: "Couldn't check — DNS lookup failed" },
    permerror: { severity: "warning", detail: "Domain's policy is broken" },
};

const COMPAUTH_RESULTS: Record<string, AuthEntry> = {
    pass: { severity: "success", detail: "Microsoft trusts the sender" },
    fail: { severity: "error", detail: "Microsoft couldn't verify the sender" },
    softpass: { severity: "warning", detail: "Sender accepted on weak signals" },
    none: { severity: "info", detail: "No verdict assigned" },
};

function authInsight(mechLabel: string, result: string, table: Record<string, AuthEntry>, category: Insight["category"] = "auth"): Insight {
    const entry = table[result];
    return {
        severity: entry?.severity ?? "info",
        label: `${mechLabel} ${result}`,
        detail: entry?.detail,
        category,
    };
}

/** Describe SCL values */
function sclInsight(scl: number): Insight {
    const anchor = { section: "forefront" as const, rowKey: "SCL" };
    if (scl <= -1) return { severity: "success", label: `SCL ${scl}`, detail: "Filtering bypassed", category: "spam", anchor };
    if (scl <= 1) return { severity: "success", label: `SCL ${scl}`, category: "spam", anchor };
    if (scl <= 4) return { severity: "info", label: `SCL ${scl}`, category: "spam", anchor };
    if (scl <= 6) return { severity: "warning", label: `SCL ${scl}`, detail: "Sent to Junk by default", category: "spam", anchor };
    return { severity: "error", label: `SCL ${scl}`, detail: "Quarantined by default", category: "spam", anchor };
}

type CodeEntry = { severity: InsightSeverity; label: string; detail?: string };

/** Describe SFV codes */
function sfvDescription(sfv: string): CodeEntry | null {
    switch (sfv.toUpperCase()) {
        case "BLK": return { severity: "error", label: "User-blocked (BLK)", detail: "On recipient's personal block list" };
        case "NSPM": return { severity: "success", label: "Not spam (NSPM)" };
        case "SFE": return { severity: "success", label: "Safe sender (SFE)", detail: "On recipient's safe senders list" };
        case "SKA": return { severity: "info", label: "Allow-listed (SKA)", detail: "Sender on an allow list" };
        case "SKB": return { severity: "error", label: "Block-listed (SKB)", detail: "Sender on a block list" };
        case "SKI": return { severity: "info", label: "Internal (SKI)" };
        case "SKN": return { severity: "info", label: "Allowed by rule (SKN)", detail: "Allowed by an admin rule" };
        case "SKQ": return { severity: "info", label: "Released (SKQ)", detail: "Released from quarantine" };
        case "SKS": return { severity: "info", label: "Marked spam by rule (SKS)", detail: "Marked spam by an admin rule" };
        case "SPM": return { severity: "error", label: "Spam verdict (SPM)", detail: "Filter scored as spam" };
        case "DMS": return { severity: "error", label: "Verdict overridden (DMS)", detail: "Spam verdict overridden by tenant" };
        default: return null;
    }
}

/** Describe CAT codes */
function catDescription(cat: string): CodeEntry | null {
    switch (cat.toUpperCase()) {
        case "BULK": return { severity: "warning", label: "Bulk (BULK)", detail: "Looks like a newsletter" };
        case "DIMP": return { severity: "error", label: "Domain impersonation (DIMP)", detail: "Resembles a known domain" };
        case "GIMP": return { severity: "error", label: "Graph anomaly (GIMP)", detail: "Sender unusual for this mailbox" };
        case "HPHISH": return { severity: "error", label: "High-conf phish (HPHISH)" };
        case "HSPM": return { severity: "error", label: "High-conf spam (HSPM)" };
        case "MALW": return { severity: "error", label: "Malware (MALW)", detail: "Threat detected by anti-malware" };
        case "PHSH": return { severity: "error", label: "Phishing (PHSH)", detail: "Probable phishing" };
        case "SPM": return { severity: "error", label: "Categorized as spam", detail: "Categorized as spam by protection policy" };
        case "SPOOF": return { severity: "error", label: "Spoofed (SPOOF)", detail: "Sender appears spoofed" };
        case "UIMP": return { severity: "error", label: "User impersonation (UIMP)", detail: "Display name matches a protected user" };
        case "AMP": return { severity: "error", label: "Anti-malware (AMP)", detail: "Threat detected by anti-malware" };
        case "SAP": return { severity: "warning", label: "Safe Attachments (SAP)", detail: "Attachment flagged for detonation" };
        case "OSPM": return { severity: "warning", label: "Outbound spam (OSPM)", detail: "Flagged leaving your tenant" };
        case "NONE": return { severity: "success", label: "Clean (NONE)" };
        default: return null;
    }
}

/** Decode SFTY safety-tip values. Format is typically "<class>" or "<class>.<sub>". */
function sftyDescription(sfty: string): CodeEntry {
    const cls = sfty.split(".")[0] ?? "";
    switch (cls) {
        case "1": return { severity: "info", label: `Safety tip: ${sfty}`, detail: "First message from this sender" };
        case "2": return { severity: "error", label: `Safety tip: ${sfty}`, detail: "Sender domain resembles a known brand" };
        case "3":
        case "4": return { severity: "error", label: `Safety tip: ${sfty}`, detail: "Display name matches a protected user" };
        default: return { severity: "warning", label: `Safety tip: ${sfty}` };
    }
}

export function generateInsights(model: HeaderModel): Insight[] {
    const insights: Insight[] = [];

    // --- Authentication Results ---
    const authResults = getRowValue(model.otherHeaders.rows, "Authentication-Results");
    const arcAuthResults = getRowValue(model.otherHeaders.rows, "ARC-Authentication-Results");
    const authHeader = authResults || arcAuthResults;

    if (authHeader) {
        const spf = parseAuthResult(authHeader, "spf");
        if (spf) insights.push(authInsight("SPF", spf, SPF_RESULTS));

        const dkim = parseAuthResult(authHeader, "dkim");
        if (dkim) insights.push(authInsight("DKIM", dkim, DKIM_RESULTS));

        const dmarc = parseAuthResult(authHeader, "dmarc");
        if (dmarc) insights.push(authInsight("DMARC", dmarc, DMARC_RESULTS));

        const compauth = parseAuthResult(authHeader, "compauth");
        if (compauth) insights.push(authInsight("CompAuth", compauth, COMPAUTH_RESULTS));
    }

    // --- Spam Confidence Level (SCL) ---
    const sclValue = getRowValue(model.forefrontAntiSpamReport.rows, "SCL");
    if (sclValue) {
        const scl = parseInt(sclValue, 10);
        if (!isNaN(scl)) {
            insights.push(sclInsight(scl));
        }
    }

    // --- Spam Filter Verdict (SFV) ---
    const sfvValue = getRowValue(model.forefrontAntiSpamReport.rows, "SFV");
    if (sfvValue) {
        const desc = sfvDescription(sfvValue);
        if (desc) {
            insights.push({
                severity: desc.severity,
                label: desc.label,
                detail: desc.detail,
                category: "spam",
                anchor: { section: "forefront", rowKey: "SFV" },
            });
        }
    }

    // --- Protection Policy Category (CAT) ---
    const catValue = getRowValue(model.forefrontAntiSpamReport.rows, "CAT");
    if (catValue) {
        const desc = catDescription(catValue);
        if (desc) {
            insights.push({
                severity: desc.severity,
                label: desc.label,
                detail: desc.detail,
                category: "spam",
                anchor: { section: "forefront", rowKey: "CAT" },
            });
        }
    }

    // --- Bulk Complaint Level (BCL) ---
    const bclValue = getRowValue(model.antiSpamReport.rows, "BCL");
    if (bclValue) {
        const bcl = parseInt(bclValue, 10);
        if (!isNaN(bcl)) {
            let severity: InsightSeverity = "success";
            let detail: string | undefined;
            if (bcl >= 7) {
                severity = "error";
                detail = "Heavy complaint volume";
            } else if (bcl >= 4) {
                severity = "warning";
                detail = "Reputable bulk sender";
            }
            insights.push({
                severity,
                label: `BCL ${bcl}`,
                detail,
                category: "spam",
                anchor: { section: "antispam", rowKey: "BCL" },
            });
        }
    }

    // --- Phishing Confidence Level (PCL) ---
    const pclValue = getRowValue(model.forefrontAntiSpamReport.rows, "PCL");
    if (pclValue) {
        const pcl = parseInt(pclValue, 10);
        if (!isNaN(pcl) && pcl > 0) {
            const severity: InsightSeverity = pcl >= 4 ? "error" : "warning";
            const detail = pcl >= 4 ? "Strong phishing signals" : "Weak phishing signals";
            insights.push({
                severity,
                label: `PCL ${pcl}`,
                detail,
                category: "spam",
                anchor: { section: "forefront", rowKey: "PCL" },
            });
        }
    }

    // --- Directionality (read first; used to suppress noisy intra-org insights) ---
    // Microsoft emits short codes here: INB (inbound), OUT (outbound), INT (intra-org).
    const dir = getRowValue(model.forefrontAntiSpamReport.rows, "DIR");
    const dirUpper = dir?.toUpperCase() ?? "";
    const isIntraOrg = dirUpper === "INT" || dirUpper === "INTRA-ORG";

    // --- Country of Origin ---
    const ctry = getRowValue(model.forefrontAntiSpamReport.rows, "CTRY");
    if (ctry && !isIntraOrg) {
        if (ctry.toUpperCase() === "XX") {
            insights.push({
                severity: "info",
                label: "Origin: unknown",
                detail: "Sender's country couldn't be determined",
                category: "security",
                anchor: { section: "forefront", rowKey: "CTRY" },
            });
        } else {
            insights.push({
                severity: "info",
                label: `Origin: ${ctry}`,
                category: "security",
                anchor: { section: "forefront", rowKey: "CTRY" },
            });
        }
    }

    // --- Directionality ---
    if (dir) {
        insights.push({
            severity: "info",
            label: dir,
            category: "security",
            anchor: { section: "forefront", rowKey: "DIR" },
        });
    }

    // --- Connecting IP ---
    const cip = getRowValue(model.forefrontAntiSpamReport.rows, "CIP");
    if (cip && !isIntraOrg) {
        insights.push({
            severity: "info",
            label: `Connecting IP ${cip}`,
            category: "security",
            anchor: { section: "forefront", rowKey: "CIP" },
        });
    }

    // --- Delivery performance ---
    const hops = model.receivedHeaders.rows;
    if (hops.length > 0) {
        if (hops.length > 10) {
            insights.push({
                severity: "warning",
                label: `Many hops (${hops.length})`,
                detail: "Unusually long path",
                category: "delivery",
            });
        } else {
            insights.push({
                severity: "info",
                label: `${hops.length} hop${hops.length !== 1 ? "s" : ""}`,
                category: "delivery",
            });
        }

        // Total delivery time
        const totalTime = model.summary.totalTime;
        if (totalTime) {
            const isLong = isLongDelivery(hops);
            if (isLong) {
                insights.push({
                    severity: "warning",
                    label: `Slow transit ${totalTime}`,
                    detail: "Took longer than typical",
                    category: "delivery",
                });
            } else {
                insights.push({
                    severity: "success",
                    label: `Transit ${totalTime}`,
                    category: "delivery",
                });
            }
        }

        // Largest hop delay
        const bottleneck = findBottleneck(hops);
        if (bottleneck) {
            insights.push({
                severity: bottleneck.severity,
                label: `Bottleneck hop ${bottleneck.hop} (${bottleneck.delay})`,
                detail: `Held ${bottleneck.delay} at ${bottleneck.by || bottleneck.from || "unknown server"}`,
                category: "delivery",
            });
        }

        // Time travel (negative delays)
        const timeTravelHops = findTimeTravelHops(hops);
        if (timeTravelHops.length > 0) {
            const hopList = timeTravelHops.join(", ");
            insights.push({
                severity: "warning",
                label: `Clock skew at hop${timeTravelHops.length !== 1 ? "s" : ""} ${hopList}`,
                detail: "Clock drift between servers",
                category: "anomaly",
            });
        }

        // TLS/encryption check
        const tlsInfo = analyzeTls(hops);
        if (tlsInfo.total > 0) {
            if (tlsInfo.encrypted === tlsInfo.total) {
                insights.push({
                    severity: "success",
                    label: "TLS on all hops",
                    detail: "Each hop encrypted",
                    category: "security",
                });
            } else if (tlsInfo.encrypted > 0) {
                const plain = tlsInfo.total - tlsInfo.encrypted;
                const plainList = tlsInfo.plaintextHops.join(", ");
                insights.push({
                    severity: "warning",
                    label: `${plain} plaintext hop${plain !== 1 ? "s" : ""}`,
                    detail: plainList ? `Hop${plain !== 1 ? "s" : ""} ${plainList} unencrypted` : undefined,
                    category: "security",
                });
            } else {
                insights.push({
                    severity: "error",
                    label: "No TLS observed",
                    detail: "No hop reported encryption",
                    category: "security",
                });
            }
        }
    }

    // --- Message priority ---
    const priority = getRowValue(model.otherHeaders.rows, "X-Priority") || getRowValue(model.otherHeaders.rows, "X-MSMail-Priority");
    const importance = getRowValue(model.otherHeaders.rows, "Importance");
    if (priority || importance) {
        const pInfo = parsePriority(priority, importance);
        if (pInfo) {
            insights.push({
                severity: pInfo.severity,
                label: pInfo.label,
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
        const breakdown: string[] = [];
        if (errors > 0) breakdown.push(`${errors}E`);
        if (warnings > 0) breakdown.push(`${warnings}W`);
        if (infos > 0) breakdown.push(`${infos}I`);
        const severity: InsightSeverity = errors > 0 ? "error" : warnings > 0 ? "warning" : "info";
        insights.push({
            severity,
            label: `${violations.length} diagnostic${violations.length !== 1 ? "s" : ""} (${breakdown.join("/")})`,
            category: "anomaly",
        });
    }

    // --- Phishing safety (SFTY) ---
    const sfty = getRowValue(model.forefrontAntiSpamReport.rows, "SFTY");
    if (sfty) {
        const desc = sftyDescription(sfty);
        insights.push({
            severity: desc.severity,
            label: desc.label,
            detail: desc.detail,
            category: "spam",
            anchor: { section: "forefront", rowKey: "SFTY" },
        });
    }

    return insights;
}

// --- Helper functions ---

function isLongDelivery(hops: ReceivedRow[]): boolean {
    let first = Infinity;
    let last = -Infinity;
    for (const hop of hops) {
        const d = hop.dateNum.value;
        if (typeof d === "number" && !isNaN(d)) {
            if (d < first) first = d;
            if (d > last) last = d;
        }
    }
    return last > first && (last - first) > 5 * 60 * 1000;
}

/** Sum of positive hop delays in ms — used as the denominator for bottleneck severity. */
function totalHopDelay(hops: ReceivedRow[]): number {
    let total = 0;
    for (const hop of hops) {
        const sort = hop.delaySort.value;
        if (typeof sort === "number" && sort > 0) total += sort;
    }
    return total;
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

    // Bottleneck is "interesting" only if it's a meaningful absolute delay AND a meaningful share of total transit.
    // Threshold: greater than 5 min, OR more than 50% of total positive hop delay.
    const total = totalHopDelay(hops);
    const fiveMin = 5 * 60 * 1000;
    const isWarning = maxDelay > fiveMin || (total > 0 && maxDelay / total > 0.5 && maxDelay > 30 * 1000);

    return {
        hop: typeof bottleneck.hop.value === "number" ? bottleneck.hop.value : 0,
        delay,
        from: (bottleneck.from.value ?? "").toString(),
        by: (bottleneck.by.value ?? "").toString(),
        severity: isWarning ? "warning" : "info",
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

function analyzeTls(hops: ReceivedRow[]): { total: number; encrypted: number; plaintextHops: number[] } {
    let total = 0;
    let encrypted = 0;
    const plaintextHops: number[] = [];
    const tlsPatterns = /\b(ESMTPSA?|TLS\S*|STARTTLS|mapi\s+over\s+https|https|SMTPS)\b/i;

    for (const hop of hops) {
        const withVal = (hop.with.value ?? "").toString();
        if (withVal) {
            total++;
            if (tlsPatterns.test(withVal)) {
                encrypted++;
            } else {
                const hopNum = typeof hop.hop.value === "number" ? hop.hop.value : 0;
                if (hopNum > 0) plaintextHops.push(hopNum);
            }
        }
    }
    return { total, encrypted, plaintextHops };
}

function parsePriority(xPriority: string, importance: string): { severity: InsightSeverity; label: string } | null {
    // X-Priority: 1 (Highest), 2 (High), 3 (Normal), 4 (Low), 5 (Lowest)
    // Importance: high, normal, low
    const imp = importance?.toLowerCase() ?? "";
    const pri = parseInt(xPriority, 10);

    if (pri === 1 || pri === 2 || imp === "high") {
        return { severity: "warning", label: "High priority" };
    }
    if (pri === 4 || pri === 5 || imp === "low") {
        return { severity: "info", label: "Low priority" };
    }
    // Normal priority — not interesting enough to show
    return null;
}
