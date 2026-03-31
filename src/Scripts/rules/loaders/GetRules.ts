import { IAndRuleData, IRuleData, IRulesResponse } from "../types/interfaces";

interface RuleStore {
    simpleRuleSet: IRuleData[];
    andRuleSet: IAndRuleData[];
}

let alreadyRetrievedRules = false;

// Use objects to avoid binding issues with let exports
export const ruleStore: RuleStore = {
    simpleRuleSet: [],
    andRuleSet: []
};

type CompletionCallback = () => void;

/**
 * Get Rules function loads validation rules from local JSON file
 * This replaces the previous server-based approach with a simple local file load
 * All rule processing logic remains the same, only the source has changed
 * @returns Promise that resolves when rules are loaded
 */
export function getRules(doOnCompletion?: CompletionCallback): Promise<void> {
    console.log("🔍 getRules: ⚡ Starting rules loading from local file");
    console.log("🔍 getRules: 📁 Loading rules from src/data/rules.json");
    console.log("🔍 getRules: AlreadyRetrievedRules:", alreadyRetrievedRules);

    if (alreadyRetrievedRules === false) {
        console.log("🔍 getRules: First time loading rules from local file");
        alreadyRetrievedRules = true;

        // Load rules from local JSON file and return the promise
        return loadLocalRules();
    } else {
        console.log("🔍 GetRules: Rules already loaded, calling completion handler");
        if (doOnCompletion) {
            doOnCompletion();
        }
        return Promise.resolve();
    }

    // Load rules from local JSON file
    async function loadLocalRules(): Promise<void> {
        try {
            console.log("🔍 GetRules: loadLocalRules - Loading from local JSON file");

            // Fetch the rules data (webpack will handle this at build time)
            const response = await fetch("/Pages/data/rules.json");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rulesResponse: IRulesResponse = await response.json();

            console.log("🔍 GetRules: loadLocalRules - ✅ Rules loaded successfully");
            console.log("🔍 GetRules: loadLocalRules - Response:", {
                isError: rulesResponse.IsError,
                simpleRulesCount: rulesResponse.SimpleRules?.length || 0,
                andRulesCount: rulesResponse.AndRules?.length || 0,
                message: rulesResponse.Message
            });

            if (!rulesResponse.IsError) {
                console.log("🔍 GetRules: loadLocalRules - ✅ SUCCESS - Rules received!");
                console.log("🔍 GetRules: loadLocalRules - SimpleRules:", rulesResponse.SimpleRules?.length || 0, "rules");
                console.log("🔍 GetRules: loadLocalRules - AndRules:", rulesResponse.AndRules?.length || 0, "rules");

                // Update the arrays in place to maintain references
                ruleStore.simpleRuleSet.length = 0; // Clear existing
                ruleStore.simpleRuleSet.push(...rulesResponse.SimpleRules);
                ruleStore.andRuleSet.length = 0; // Clear existing
                ruleStore.andRuleSet.push(...rulesResponse.AndRules);

                console.log("🔍 GetRules: ✅ Rules successfully stored in global variables");
                console.log("🔍 GetRules: Final SimpleRuleSet length:", ruleStore.simpleRuleSet?.length || 0);
                console.log("🔍 GetRules: Final AndRuleSet length:", ruleStore.andRuleSet?.length || 0);

            } else {
                console.log("🔍 GetRules: loadLocalRules - ❌ Service returned error:", rulesResponse.Message);
                showMessage("Rules error", rulesResponse.Message || "Failed to load rules");
            }
        } catch (e) {
            const error = e as Error;
            console.log("🔍 GetRules: loadLocalRules - ❌ LOAD ERROR:", error);
            showMessage("Load error", "Could not load rules from local file: " + error.message);
        }

        console.log("🔍 GetRules: loadLocalRules - Calling completion handler");
        if (doOnCompletion) {
            doOnCompletion();
        }
    }

    // Displays an error message
    function showMessage(title: string, message: string): void {
        const text = "getRules - " + title + ":\n" + message;
        console.log(text);
    }
}

/**
 * Reset function for testing - clears the singleton state
 * Only exported for test purposes
 */
export function resetRulesState(): void {
    alreadyRetrievedRules = false;
    ruleStore.simpleRuleSet = [];
    ruleStore.andRuleSet = [];
}