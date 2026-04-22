import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import-x";
import node from "eslint-plugin-node";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["Pages/**", "vite.config.ts", "vitest.config.ts", "vitest.setup.ts"],
}, {
    files: ["**/*.ts","**/*.js"],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"), {
    // Vitest test files configuration
    files: ["**/*.test.{js,ts}", "**/*.spec.{js,ts}", "**/test/**", "**/tests/**"],
    languageOptions: {
        globals: {
            ...globals.browser,
            vi: "readonly",
            vitest: "readonly",
            describe: "readonly",
            it: "readonly",
            test: "readonly",
            expect: "readonly",
            beforeEach: "readonly",
            afterEach: "readonly",
            beforeAll: "readonly",
            afterAll: "readonly",
        },
    },
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic": stylistic,
        node,
        import: importPlugin,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            // Office.js globals
            Office: "readonly",
            // Vite defined globals (replaced at build time)
            __AIKEY__: "readonly",
            __BUILDTIME__: "readonly",
            __NAACLIENTID__: "readonly",
            __VERSION__: "readonly",
            // Node.js/TypeScript globals used in specific contexts
            process: "readonly",
            global: "readonly",
            NodeJS: "readonly",
            // DOM/Web API globals that ESLint doesn't recognize by default
            EventListenerOrEventListenerObject: "readonly",
            AddEventListenerOptions: "readonly",
            PermissionDescriptor: "readonly",
            PermissionName: "readonly",
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
    },

    settings: {
        "import-x/resolver": {
            typescript: {
                project: "./tsconfig.json",
            },
        },
    },

    rules: {
        indent: ["error", 4, {
            SwitchCase: 1,
        }],

        "linebreak-style": "off",
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "max-classes-per-file": ["error", 1],
        "no-duplicate-imports": "error",
        "no-inner-declarations": "error",
        "no-unmodified-loop-condition": "error",
        "block-scoped-var": "error",
        "no-undef": "error",  // Catch undefined variables/functions
        "no-global-assign": "error",  // Prevent accidental global overwrites

        camelcase: ["error", {
            properties: "always",
        }],

        "sort-imports": ["error", {
            ignoreDeclarationSort: true,
        }],

        "@stylistic/no-multiple-empty-lines": ["error", {
            max: 1,
            maxEOF: 0,
            maxBOF: 0,
        }],

        "@stylistic/no-trailing-spaces": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-inferrable-types": "error",

        "@typescript-eslint/naming-convention": ["error", {
            selector: "default",
            format: ["camelCase"],
            leadingUnderscore: "allow",
        }, {
            selector: "parameter",
            format: ["camelCase"],
            leadingUnderscore: "allow",
        }, {
            selector: "variableLike",
            format: ["camelCase"],
            filter: {
                regex: "^(__filename|__dirname)$",
                match: false
            }
        }, {
            selector: "variable",
            modifiers: ["const"],
            format: ["camelCase", "UPPER_CASE"],
            filter: {
                regex: "^(__filename|__dirname)$",
                match: false
            }
        }, {
            selector: "variable",
            filter: {
                regex: "^(__filename|__dirname)$",
                match: true
            },
            format: null
        }, {
            selector: "import",
            format: ["camelCase", "PascalCase"]
        }, {
            selector: "typeLike",
            format: ["PascalCase"],
        }, {
            selector: "enumMember",
            format: ["PascalCase"],
        }, {
            selector: "property",
            format: ["camelCase"],
            filter: {
                regex: "^(@|aria-|data-|import/|import-x/|linebreak-style|max-classes-per-file|no-duplicate-imports|no-inner-declarations|no-unmodified-loop-condition|block-scoped-var|sort-imports|newlines-between|SwitchCase|no-undef|no-global-assign|Office|NodeJS|EventListenerOrEventListenerObject|AddEventListenerOptions|PermissionDescriptor|PermissionName|__[A-Z_]+__|^.+$)",
                match: false
            }
        }, {
            selector: "property",
            filter: {
                regex: "^(@|aria-|data-|import/|import-x/|linebreak-style|max-classes-per-file|no-duplicate-imports|no-inner-declarations|no-unmodified-loop-condition|block-scoped-var|sort-imports|newlines-between|SwitchCase|no-undef|no-global-assign|Office|NodeJS|EventListenerOrEventListenerObject|AddEventListenerOptions|PermissionDescriptor|PermissionName|__[A-Z_]+__|^.+$)",
                match: true
            },
            format: null
        }, {
            selector: "method",
            format: ["camelCase"],
        }],

        "import/no-unresolved": "error",
        "import/no-named-as-default-member": "off",

        "import/order": ["error", {
            groups: [
                "builtin",
                "external",
                "internal",
                ["sibling", "parent"],
                "index",
                "unknown",
            ],

            "newlines-between": "always",

            alphabetize: {
                order: "asc",
                caseInsensitive: true,
            },
        }],
    },
}];
