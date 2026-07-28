import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("Could not allocate a local preview port."));
      });
    });
  });
}

function runNodeScript(script, env) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(process.execPath, [script], {
      cwd: frontendDir,
      env,
      stdio: "inherit",
    });
    processHandle.once("error", reject);
    processHandle.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function waitForServer(url, processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error("The local Vite server stopped before the audit began.");
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

const port = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const viteBin = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");
const viteProcess = spawn(
  process.execPath,
  [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: frontendDir,
    stdio: "ignore",
  },
);

try {
  await waitForServer(baseUrl, viteProcess);
  const env = { ...process.env, AUDIT_BASE_URL: baseUrl };
  await runNodeScript("scripts/quality-check.mjs", env);
  await runNodeScript("scripts/contrast-check.mjs", env);
} finally {
  viteProcess.kill();
}
