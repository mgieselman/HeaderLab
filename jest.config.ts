import type {Config} from "jest";
// https://github.com/jest-community/awesome-jest
const config: Config = {
    testEnvironment: "jsdom",
    globalSetup: "./global-setup.js",
    transform: {
        "^.+\\.tsx?$": ["ts-jest",{ diagnostics: { ignoreCodes: ["TS151001"] } }],
        // Lit ships ESM-only — transform it so Jest (CommonJS) can load it
        "^.+\\.js$": "ts-jest",
    },
    transformIgnorePatterns: [
        "node_modules/"
    ],
    globals: {
        "__AIKEY__": "",
        "__NAACLIENTID__": ""
    },
    collectCoverage: true,
    collectCoverageFrom: ["./src/**"],
    coverageDirectory: "./Pages/coverage",
    coverageReporters: ["json", "lcov", "text", "clover", "text-summary"],
    coverageThreshold: {
        global: {
            branches: 35,
            functions: 40,
            lines: 40,
            statements: 40,
        },
    },
    reporters: [
        "default",
        ["jest-html-reporters", {
            "publicPath": "./Pages/test",
            "filename": "index.html"
        }]
    ]
};

export default config;