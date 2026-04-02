/**
 * Central application state with observer pattern.
 */

import { ThemeManager } from "./ThemeManager";
import { HeaderModel } from "../../model/HeaderModel";

export type StateListener = () => void;

export class AppState {
    private model: HeaderModel | null = null;
    private activeTabInternal = "summary";
    private statusInternal = "";
    private errorInternal = "";
    private loadingInternal = false;
    private listeners: StateListener[] = [];
    public readonly theme: ThemeManager;

    constructor() {
        this.theme = new ThemeManager();
    }

    public subscribe(fn: StateListener): void {
        this.listeners.push(fn);
    }

    private notify(): void {
        this.listeners.forEach(fn => fn());
    }

    public get headerModel(): HeaderModel | null { return this.model; }
    public setModel(model: HeaderModel | null): void {
        this.model = model;
        if (model && model.hasData) {
            // Default to diagnostics if violations exist, otherwise summary
            this.activeTabInternal = model.violationGroups.length > 0 ? "diagnostics" : "summary";
        }
        this.notify();
    }

    public get activeTab(): string { return this.activeTabInternal; }
    public setActiveTab(tab: string): void {
        this.activeTabInternal = tab;
        this.notify();
    }

    public get status(): string { return this.statusInternal; }
    public setStatus(msg: string): void {
        this.statusInternal = msg;
        this.notify();
    }

    public get error(): string { return this.errorInternal; }
    public setError(msg: string): void {
        this.errorInternal = msg;
        this.notify();
    }

    public get loading(): boolean { return this.loadingInternal; }
    public setLoading(val: boolean): void {
        this.loadingInternal = val;
        this.notify();
    }

    public clear(): void {
        this.model = null;
        this.activeTabInternal = "summary";
        this.statusInternal = "";
        this.errorInternal = "";
        this.loadingInternal = false;
        this.notify();
    }
}
