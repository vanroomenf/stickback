import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative paths so the built site works on GitHub Pages (vanroomenf.github.io/stickback/).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
