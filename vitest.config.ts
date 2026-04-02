import { defineConfig } from "vitest/config";

export default defineConfig({
    root: ".",
    define: {
        "__AIKEY__": JSON.stringify(""),
        "__BUILDTIME__": JSON.stringify("test"),
        "__VERSION__": JSON.stringify("test"),
        "__NAACLIENTID__": JSON.stringify(""),
    },
    test: {
        environment: "jsdom",
        include: ["src/**/*.test.ts"],
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**"],
            reportsDirectory: "./Pages/coverage",
            reporter: ["json", "lcov", "text", "clover", "text-summary"],
            thresholds: {
                branches: 44,
                functions: 56,
                lines: 50,
                statements: 49,
            },
        },
    },
});
