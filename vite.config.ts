import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = env.PORT || "3847";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["assets/favicon.ico", "assets/logo-512.jpg"],
        manifest: {
          name: "MyAgentive",
          short_name: "MyAgentive",
          description: "Your personal AI agent with web and Telegram interfaces",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/assets/logo-128.jpg",
              sizes: "128x128",
              type: "image/jpeg",
            },
            {
              src: "/assets/logo-256.jpg",
              sizes: "256x256",
              type: "image/jpeg",
            },
            {
              src: "/assets/logo-512.jpg",
              sizes: "512x512",
              type: "image/jpeg",
            },
            {
              src: "/assets/logo-512.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    root: "client",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client"),
      },
    },
    server: {
      proxy: {
        "/api": `http://localhost:${port}`,
        "/ws": {
          target: `ws://localhost:${port}`,
          ws: true,
        },
      },
    },
    build: {
      outDir: "../dist",
    },
  };
});
