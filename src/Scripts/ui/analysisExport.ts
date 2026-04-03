import { HeaderModel } from "../model/HeaderModel";
import { ReceivedRow } from "../row/ReceivedRow";
import { Row, getRowValue } from "../row/Row";

interface ExportRow {
    header: string;
    label: string;
    value: string;
}

interface ExportReceivedHop {
    hop: number;
    from: string;
    by: string;
    with: string;
    id: string;
    for: string;
    via: string;
    date: string;
    delay: string;
    percent: number;
    sourceHeader: string;
}

interface ExportViolation {
    message: string;
    severity: "error" | "warning" | "info";
    isComposite: boolean;
    matches: number;
    items: Array<{
        affectedSections: string[];
        highlightPattern: string;
        parentMessage?: string;
    }>;
}

function sanitizeRowValue(value: string): string {
    return value.trim();
}

function formatAffectedSection(section: { header?: string; label?: string; value?: string }): string {
    if (section.label && section.header) {
        return `${section.label} (${section.header})`;
    }

    if (section.header) {
        return section.header;
    }

    if (section.label) {
        return section.label;
    }

    return section.value ? sanitizeRowValue(section.value) : "unknown section";
}

function extractRows(rows: Row[]): ExportRow[] {
    return rows
        .filter((row) => Boolean(row.value))
        .map((row) => ({
            header: row.header,
            label: row.label,
            value: sanitizeRowValue(row.value),
        }));
}

function extractReceivedHops(rows: ReceivedRow[]): ExportReceivedHop[] {
    return rows.map((row) => ({
        hop: Number(row.hop.value) || 0,
        from: String(row.from.value ?? ""),
        by: String(row.by.value ?? ""),
        with: String(row.with.value ?? ""),
        id: String(row.id.value ?? ""),
        for: String(row.for.value ?? ""),
        via: String(row.via.value ?? ""),
        date: String(row.date.value ?? ""),
        delay: String(row.delay.value ?? ""),
        percent: Number(row.percent.value) || 0,
        sourceHeader: String(row.sourceHeader.value ?? ""),
    }));
}

export function buildAnalysisJson(model: HeaderModel): string {
    const json = {
        generatedAt: new Date().toISOString(),
        summary: extractRows(model.summary.rows),
        routing: {
            totalDeliveryTime: model.summary.totalTime,
            hopCount: model.receivedHeaders.rows.length,
            hops: extractReceivedHops(model.receivedHeaders.rows),
        },
        security: {
            forefront: extractRows(model.forefrontAntiSpamReport.rows),
            microsoft: extractRows(model.antiSpamReport.rows),
        },
        otherHeaders: model.otherHeaders.rows.map((row) => ({
            number: row.number,
            header: row.header,
            value: row.value,
        })),
        diagnostics: model.violationGroups.map<ExportViolation>((group) => ({
            message: group.displayName,
            severity: group.severity,
            isComposite: group.isAndRule,
            matches: group.violations.length,
            items: group.violations.map((violation) => {
                const item: {
                    affectedSections: string[];
                    highlightPattern: string;
                    parentMessage?: string;
                } = {
                    affectedSections: violation.affectedSections.map((section) => formatAffectedSection(section)),
                    highlightPattern: violation.highlightPattern,
                };
                if (violation.parentMessage) {
                    item.parentMessage = violation.parentMessage;
                }
                return item;
            }),
        })),
    };

    return JSON.stringify(json, null, 2);
}

export function buildAnalystReport(model: HeaderModel): string {
    const lines: string[] = [];
    const summaryRows = model.summary.rows.filter((row) => Boolean(row.value));
    const hops = model.receivedHeaders.rows;
    const forefrontRows = model.forefrontAntiSpamReport.rows;
    const antiSpamRows = model.antiSpamReport.rows;

    lines.push("HeaderLab Analyst Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    lines.push("Summary");
    if (summaryRows.length === 0) {
        lines.push("- No summary fields found.");
    } else {
        summaryRows.forEach((row) => {
            lines.push(`- ${row.label}: ${sanitizeRowValue(row.value)}`);
        });
    }
    lines.push("");

    lines.push("Routing");
    lines.push(`- Hops: ${hops.length}`);
    lines.push(`- Total delivery time: ${model.summary.totalTime || "Unknown"}`);
    hops.forEach((hop) => {
        lines.push(`- Hop ${hop.hop.value}: ${hop.from.value} -> ${hop.by.value} (${hop.delay.value || "n/a"})`);
    });
    lines.push("");

    lines.push("Security");
    lines.push(`- SPF/DMARC context header: ${getRowValue(forefrontRows, "SFV") || "Not present"}`);
    lines.push(`- SCL: ${getRowValue(forefrontRows, "SCL") || "Not present"}`);
    lines.push(`- BCL: ${getRowValue(antiSpamRows, "BCL") || "Not present"}`);
    lines.push(`- PCL: ${getRowValue(antiSpamRows, "PCL") || "Not present"}`);
    lines.push(`- CIP: ${getRowValue(forefrontRows, "CIP") || "Not present"}`);
    lines.push("");

    lines.push("Diagnostics");
    if (model.violationGroups.length === 0) {
        lines.push("- No rule violations detected.");
    } else {
        model.violationGroups.forEach((group) => {
            lines.push(`- [${group.severity.toUpperCase()}] ${group.displayName} (${group.violations.length})`);
            group.violations.forEach((violation) => {
                const sections = violation.affectedSections.map((section) => formatAffectedSection(section)).join(", ") || "unknown section";
                const pattern = violation.highlightPattern || "n/a";
                lines.push(`  - Sections: ${sections}; Pattern: ${pattern}`);
            });
        });
    }

    return lines.join("\n");
}