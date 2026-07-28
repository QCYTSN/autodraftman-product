import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function waitForServer(url, processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error("The local Vite server stopped before the review began.");
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

const port = 5173;
const baseUrl = `http://127.0.0.1:${port}`;
const viteBin = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");
const viteProcess = spawn(
  process.execPath,
  [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: frontendDir,
    env: process.env,
    stdio: "ignore",
  },
);

try {
  await waitForServer(baseUrl, viteProcess);
  await new Promise((resolve, reject) => {
    const review = spawn(process.execPath, ["scripts/visual-check.mjs"], {
      cwd: frontendDir,
      env: { ...process.env, AUDIT_BASE_URL: baseUrl },
      stdio: "inherit",
    });
    review.once("error", reject);
    review.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Visual review exited with code ${code ?? "unknown"}.`));
    });
  });
} finally {
  viteProcess.kill();
}
