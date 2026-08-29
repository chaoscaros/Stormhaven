import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 9999,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
