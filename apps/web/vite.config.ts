import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");

  return {
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || "/",
    plugins: [react(), tailwindcss()],
    envDir: path.resolve(__dirname, "../.."),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      target: "es2022",
      outDir: "./dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
        output: {
          manualChunks: {
            maplibre: ["maplibre-gl"],
            charts: ["uplot"],
            motion: ["framer-motion"],
          },
        },
      },
    },
  };
});
