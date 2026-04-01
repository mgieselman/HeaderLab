/**
 * DOM utility class for common operations with null safety.
 * Only contains methods actively used by production code.
 */
export class DomUtils {
    static getElement(selector: string): HTMLElement | null {
        return document.querySelector(selector) as HTMLElement;
    }

    static setText(selector: string, text: string): void {
        const element = this.getElement(selector);
        if (element) element.textContent = text;
    }

    static showElement(selector: string): void {
        const element = this.getElement(selector);
        if (element) element.style.display = "block";
    }

    static hideElement(selector: string): void {
        const element = this.getElement(selector);
        if (element) element.style.display = "none";
    }
}
