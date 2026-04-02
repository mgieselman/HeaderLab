import { IAndRuleData, IRuleData, IRulesResponse } from "../types/interfaces";

export interface RuleStore {
    simpleRuleSet: IRuleData[];
    andRuleSet: IAndRuleData[];
}

let cachedRules: RuleStore | null = null;
let loadingPromise: Promise<RuleStore> | null = null;

/**
 * Load validation rules from local JSON file.
 * Returns cached rules after first successful load.
 * Concurrent calls share the same in-flight request.
 */
export async function getRules(): Promise<RuleStore> {
    if (cachedRules) return cachedRules;
    if (!loadingPromise) {
        loadingPromise = loadRulesFromFile();
    }
    return loadingPromise;
}

async function loadRulesFromFile(): Promise<RuleStore> {
    try {
        const response = await fetch("/data/rules.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rulesResponse: IRulesResponse = await response.json();
        if (rulesResponse.IsError) {
            throw new Error(rulesResponse.Message || "Failed to load rules");
        }

        cachedRules = {
            simpleRuleSet: rulesResponse.SimpleRules,
            andRuleSet: rulesResponse.AndRules
        };

        return cachedRules;
    } catch (error) {
        loadingPromise = null; // Allow retry on failure
        throw error;
    }
}

/**
 * Reset cached state for testing.
 */
export function resetRulesState(): void {
    cachedRules = null;
    loadingPromise = null;
}
