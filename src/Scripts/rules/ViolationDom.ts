import { Strings } from "../core/Strings";
import { ViolationGroup } from "./types/AnalysisTypes";
import { highlightContent } from "./ViolationUtils";

/**
 * Apply highlighting to HTML content without breaking existing HTML tags.
 * Uses DOM APIs to parse HTML and highlight text nodes only.
 * Use this for content that already contains HTML (like valueUrl with anchor tags).
 * @param htmlContent - HTML content (e.g., content with anchor tags from mapHeaderToURL)
 * @param violationGroups - Array of violation groups with highlight patterns
 * @returns The HTML content with highlighting spans applied to text nodes only
 */
export function highlightHtml(htmlContent: string, violationGroups: ViolationGroup[]): string {
    if (!htmlContent || !violationGroups || violationGroups.length === 0) {
        return htmlContent;
    }

    // Create a temporary DOM element to parse the HTML
    const temp = document.createElement("div");
    temp.innerHTML = htmlContent;

    // Function to highlight text nodes recursively without breaking HTML structure
    function highlightTextNodes(node: Node): void {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            if (text.trim()) {
                // Escape the text content before highlighting to prevent XSS
                const escapedText = Strings.htmlEncode(text);
                const highlighted = highlightContent(escapedText, violationGroups);
                if (highlighted !== escapedText) {
                    const span = document.createElement("span");
                    span.innerHTML = highlighted;
                    node.parentNode?.replaceChild(span, node);
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const childNodes = Array.from(node.childNodes);
            childNodes.forEach(child => highlightTextNodes(child));
        }
    }

    highlightTextNodes(temp);
    return temp.innerHTML;
}
