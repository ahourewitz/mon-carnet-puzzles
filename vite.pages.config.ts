import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project beneath /<repository>/.
export default defineConfig({
  root: "static",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../docs", emptyOutDir: true, sourcemap: false },
  server: { host: "127.0.0.1" },
});
