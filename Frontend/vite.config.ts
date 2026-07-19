import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    // Proxy pour éviter les problèmes CORS en développement
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          // Uniquement les dépendances partagées par (quasi) toutes les routes :
          // les regrouper en chunks stables améliore le cache navigateur entre
          // deux déploiements. Ne PAS ajouter de fallback générique ici — ça
          // aspirerait aussi jspdf/html2canvas/recharts, déjà correctement
          // code-splittés par Rollup via leurs import() dynamiques.
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("@sentry")) {
            return "vendor-sentry";
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "production" &&
      sentryVitePlugin({
        org: "isi-of",
        project: "javascript-react",
        errorHandler: (err) => { console.warn("[sentry]", err); },
        telemetry: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
