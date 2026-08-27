import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: { port: 5173 },
  // Production bundles omit source maps so implementation details are not
  // published as static assets. Tests exercise the original TypeScript source.
  build: { sourcemap: false },
});
