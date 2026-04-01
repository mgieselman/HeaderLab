import path from "node:path";
import { fileURLToPath } from "node:url";

import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
    const isProduction = argv.mode === "production";
    const analyze = env && env.analyze;

    const plugins = [
        new ForkTsCheckerWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
        }),
        new webpack.DefinePlugin({
            "__AIKEY__": JSON.stringify(process.env.APPINSIGHTS_INSTRUMENTATIONKEY || ""),
            "__BUILDTIME__": JSON.stringify(new Date().toISOString()),
            "__VERSION__": JSON.stringify(process.env.SCM_COMMIT_ID || "local"),
            "__NAACLIENTID__": JSON.stringify(process.env.MHA_NAA_CLIENT_ID || ""),
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/mha.html",
            filename: "mha.html",
            chunks: ["app"],
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/uitoggle.html",
            filename: "DesktopPane.html",
            chunks: ["addin"],
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/uitoggle.html",
            filename: "MobilePane.html",
            chunks: ["addin"],
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/uitoggle.html",
            filename: "Default.html",
            chunks: ["addin"],
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/functions.html",
            filename: "Functions.html",
            chunks: [],
        }),
        new HtmlWebpackPlugin({
            template: "./src/Pages/privacy.html",
            filename: "privacy.html",
            chunks: [],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: "src/data", to: "data" },
                { from: "favicon.ico", to: "favicon.ico" },
            ],
        }),
    ];

    if (analyze) {
        plugins.push(new BundleAnalyzerPlugin());
    }

    return {
        entry: {
            app: "./src/Scripts/ui/app.ts",
            addin: "./src/Scripts/ui/addin.ts",
        },
        output: {
            path: path.resolve(__dirname, "Pages"),
            filename: "[name].[contenthash].js",
            clean: {
                keep: /^(coverage|test)\//,
            },
        },
        resolve: {
            extensions: [".ts", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: {
                        loader: "ts-loader",
                        options: { transpileOnly: true },
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                    ],
                },
                {
                    test: /\.js$/,
                    enforce: "pre",
                    use: "source-map-loader",
                },
            ],
        },
        plugins,
        devtool: isProduction ? "source-map" : "eval-source-map",
        devServer: {
            port: 44336,
            hot: true,
            static: {
                directory: path.resolve(__dirname, "Pages"),
            },
        },
    };
};
