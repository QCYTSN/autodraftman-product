import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base:
      env.VITE_PUBLIC_BASE_PATH ||
      (mode === "github-pages" ? "/autodraftman/" : "/"),
    plugins: [react()],
  };
});
