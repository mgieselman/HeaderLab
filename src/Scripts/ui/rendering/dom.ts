/**
 * Typed DOM creation helpers.
 */

/* eslint-disable no-undef */
type Attrs = Record<string, string | boolean | EventListener>;

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Attrs | null,
    ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (attrs) {
        for (const [key, val] of Object.entries(attrs)) {
            if (typeof val === "function") {
                element.addEventListener(key.replace(/^on/, ""), val as EventListener);
            } else if (typeof val === "boolean") {
                if (val) element.setAttribute(key, "");
            } else {
                element.setAttribute(key, val);
            }
        }
    }
    for (const child of children) {
        if (typeof child === "string") {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    }
    return element;
}

export function text(content: string): Text {
    return document.createTextNode(content);
}

export function clear(container: Element): void {
    container.innerHTML = "";
}
