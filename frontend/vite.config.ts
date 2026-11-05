import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// MathLive expects stable font names. Serve and emit the installed package's
// fonts locally so formula input works without a third-party CDN.
const fontDirectory = new URL("./node_modules/mathlive/fonts/", import.meta.url);
const mathFonts = new Map(readdirSync(fileURLToPath(fontDirectory)).filter(name => name.endsWith(".woff2")).map(name => [name, readFileSync(new URL(name, fontDirectory))]));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    ...(mode === "local-kernel" ? {
      define: { "import.meta.env.VITE_LOCAL_RECONSTRUCTION": '"true"', "import.meta.env.VITE_API_BASE_URL": '""' },
      server: { proxy: { "/local-api": { target: "http://127.0.0.1:8787", changeOrigin: false } } },
    } : {}),
    base:
      env.VITE_PUBLIC_BASE_PATH ||
      (mode === "github-pages" ? "/figfox/" : "/"),
    plugins: [react(), {
      name: "local-mathlive-fonts",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const match = request.url?.split("?")[0].match(/\/mathlive-fonts\/([^/]+)$/);
          const font = match && mathFonts.get(match[1]);
          if (!font) return next();
          response.setHeader("Content-Type", "font/woff2"); response.end(font);
        });
      },
      generateBundle() {
        for (const [name, source] of mathFonts) this.emitFile({ type: "asset", fileName: `mathlive-fonts/${name}`, source });
      },
    }],
  };
});
