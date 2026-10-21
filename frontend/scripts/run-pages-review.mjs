import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 4175;
const baseUrl = `http://127.0.0.1:${port}/figfox`;
const viteBin = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

async function waitForServer(url, processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error("The Pages preview stopped before verification began.");
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

const preview = spawn(
  process.execPath,
  [
    viteBin,
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
    "--base",
    "/figfox/",
  ],
  { cwd: frontendDir, env: process.env, stdio: "ignore", windowsHide: true },
);

try {
  await waitForServer(`${baseUrl}/`, preview);
  await new Promise((resolve, reject) => {
    const verification = spawn(process.execPath, ["scripts/verify-pages.mjs"], {
      cwd: frontendDir,
      env: { ...process.env, PREVIEW_URL: baseUrl },
      stdio: "inherit",
    });
    verification.once("error", reject);
    verification.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Pages verification exited with code ${code ?? "unknown"}.`));
    });
  });
  for (const script of ["scripts/product-check.mjs", "scripts/workspace-flow-check.mjs", "scripts/document-check.mjs", "scripts/showcase-check.mjs", "scripts/cursor-check.mjs", "scripts/public-release-check.mjs", "scripts/editor-save-check.mjs"]) {
    await new Promise((resolve, reject) => {
      const verification = spawn(process.execPath, [script], {
        cwd: frontendDir,
        env: { ...process.env, AUDIT_BASE_URL: baseUrl },
        stdio: "inherit",
        windowsHide: true,
      });
      verification.once("error", reject);
      verification.once("exit", code => code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code ?? "unknown"}.`)));
    });
  }
} finally {
  preview.kill();
}
