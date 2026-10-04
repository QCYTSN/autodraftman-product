import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

// Local research files are allowlisted and served only by the development server.
// They are never copied into public/ or emitted into a production build.
export function localDemoAssets(): Plugin {
  const kernelRoot = fileURLToPath(new URL("../../FigFox-926/", import.meta.url));
  const dataset = path.join(kernelRoot, "benchmark/datasets/comparison-10-v1/images");
  const results = path.join(
    kernelRoot,
    "benchmark/runs/comparison-10-v1/figfox/20260928-review-recovery-v3/samples",
  );
  const cases = [
    ["study", "sample-0004", "sample-0004-retrieval-practice.png"],
    ["diffusion", "sample-0001", "sample-0001-U-NET.png"],
    ["vit", "sample-0005", "sample-0005-vision-transformer.png"],
  ] as const;
  const files = new Map<string, { file: string; type: string }>();
  for (const [id, sample, input] of cases) {
    files.set(id + "/input.png", { file: path.join(dataset, input), type: "image/png" });
    files.set(id + "/result.png", {
      file: path.join(results, sample, "final.png"), type: "image/png",
    });
    files.set(id + "/result.svg", {
      file: path.join(results, sample, "final.svg"), type: "image/svg+xml",
    });
    files.set(id + "/baseline.svg", {
      file: path.join(results, sample, "baseline.svg"), type: "image/svg+xml",
    });
  }
  for (const [id, input] of [
    ["wages", "sample-0003-minimum-wages.png"],
    ["privacy", "sample-0006-privacy-sparsification.png"],
    ["vgg", "sample-0008-vgg-network.png"],
  ]) files.set(id + "/input.png", { file: path.join(dataset, input), type: "image/png" });
  const studyRun = path.join(results, "../raw/case-004-sample-0004-retrieval-practice/run");
  const studyPack = path.join(studyRun, "native-20260927T115139-df77324d00/stage-0/pack");
  const samCrops = path.join(kernelRoot, "runs/sam-cache/sam-20260927T115139-620d0c9b9b/evidence/sam/crops");
  for (const [name, file, type] of [
    ["crop-original.png", path.join(studyPack, "frame-004-original.png"), "image/png"],
    ["crop-draft.png", path.join(studyPack, "frame-004-current.png"), "image/png"],
    ["sam-reading.png", path.join(samCrops, "sam-region-000028.png"), "image/png"],
    ["sam-restudy.png", path.join(samCrops, "sam-region-000029.png"), "image/png"],
    ["sam-recall.png", path.join(samCrops, "sam-region-000026.png"), "image/png"],
  ]) files.set("study/" + name, { file, type });

  // Only expose this receipt's status and constraint outcomes. Paths, prompts,
  // raw model responses, and the rest of the experiment JSON remain private.
  async function repairReceipt() {
    const result = JSON.parse(await readFile(path.join(studyRun, "review/case-004/result.json"), "utf8"));
    const receipt = result.rcd.find((entry: { program_id: string }) => entry.program_id === "prog-case-004-F-001");
    if (!receipt) throw new Error("Receipt unavailable");
    const check = receipt.final_scene_check;
    const latest = check.history.at(-1);
    return JSON.stringify({
      status: receipt.status,
      geometryStatus: check.status,
      visualAcceptance: receipt.visual_acceptance,
      visualPassed: result.visual_passed,
      checks: latest.checks.flatMap((entry: { relations: { predicate: string; status: string }[] }) => entry.relations.map(relation => ({ predicate: relation.predicate, status: relation.status }))),
    });
  }
  return {
    name: "figfox-local-demo-assets",
    apply: "serve",
    configureServer(server) {
      const prefix = server.config.base + "__demo-assets/";
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (!pathname.startsWith(prefix)) return next();
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405, { Allow: "GET, HEAD" });
          return response.end();
        }
        const name = pathname.slice(prefix.length);
        if (name === "study/repair-receipt.json") {
          try {
            const json = await repairReceipt();
            response.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
            return response.end(request.method === "HEAD" ? undefined : json);
          } catch {
            response.writeHead(404);
            return response.end();
          }
        }
        const asset = files.get(name);
        if (!asset) {
          response.writeHead(404);
          return response.end();
        }
        try {
          const metadata = await stat(asset.file);
          response.writeHead(200, {
            "Content-Type": asset.type,
            "Content-Length": metadata.size,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          });
          if (request.method === "HEAD") return response.end();
          const stream = createReadStream(asset.file);
          stream.on("error", () => response.destroy());
          response.on("close", () => stream.destroy());
          stream.pipe(response);
        } catch {
          response.writeHead(404);
          response.end();
        }
      });
    },
  };
}
