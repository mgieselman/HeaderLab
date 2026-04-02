import { resolve } from "node:path";

import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

export default defineConfig({
    root: "src/Pages",
    publicDir: resolve(__dirname, "public"),
    define: {
        "__AIKEY__": JSON.stringify(process.env["APPINSIGHTS_INSTRUMENTATIONKEY"] || ""),
        "__BUILDTIME__": JSON.stringify(new Date().toISOString()),
        "__VERSION__": JSON.stringify(process.env["SCM_COMMIT_ID"] || "local"),
        "__NAACLIENTID__": JSON.stringify(process.env["HEADERLAB_NAA_CLIENT_ID"] || ""),
    },
    build: {
        outDir: resolve(__dirname, "Pages"),
        emptyOutDir: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                headerlab: resolve(__dirname, "src/Pages/headerlab.html"),
                Default: resolve(__dirname, "src/Pages/Default.html"),
                DesktopPane: resolve(__dirname, "src/Pages/DesktopPane.html"),
                MobilePane: resolve(__dirname, "src/Pages/MobilePane.html"),
                Functions: resolve(__dirname, "src/Pages/Functions.html"),
                privacy: resolve(__dirname, "src/Pages/privacy.html"),
            },
            output: {
                entryFileNames: "assets/[name].[hash].js",
                chunkFileNames: "assets/[name].[hash].js",
                assetFileNames: "assets/[name].[hash][extname]",
            },
        },
    },
    server: {
        port: 44336,
    },
});
