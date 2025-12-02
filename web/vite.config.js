import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: "./",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: "assets/[name].js",
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name].[ext]",
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
//# sourceMappingURL=vite.config.js.map