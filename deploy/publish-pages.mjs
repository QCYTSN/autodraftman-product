import { readdir, lstat, mkdir, copyFile, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

// Copy build artifacts only. This script does not commit, push or change Pages settings.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repository, "frontend", "dist");
assert.ok(process.argv[2], "Pass the deployment mirror checkout as the first argument.");
const mirror = path.resolve(process.argv[2]);
const target = path.join(mirror, "site");
const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true }).trim();
assert.equal(git(repository, ["status", "--porcelain"]), "", "Commit source changes before publishing.");
assert.equal(git(mirror, ["remote", "get-url", "origin"]), "https://github.com/QCYTSN/figfox.git", "Unexpected mirror repository.");
assert.equal(git(mirror, ["status", "--porcelain"]), "", "The mirror must have no pending changes.");
const revision = git(repository, ["rev-parse", "HEAD"]);
assert.match(revision, /^[a-f0-9]{40}$/);
assert.ok((await readFile(path.join(source, "index.html"), "utf8")).includes("/figfox/assets/"), "Build with npm run build:pages first.");
await readFile(path.join(source, "404.html"));
assert.ok(!(await lstat(source)).isSymbolicLink());
assert.ok(!(await lstat(mirror)).isSymbolicLink());
await mkdir(target, { recursive: true });
assert.ok(!(await lstat(target)).isSymbolicLink());

async function files(root, directory = root) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    assert.ok(absolute.startsWith(root + path.sep));
    assert.ok(!(await lstat(absolute)).isSymbolicLink(), "Symlinks are not copied or removed.");
    if (entry.isDirectory()) result.push(...await files(root, absolute));
    else if (entry.isFile()) result.push(path.relative(root, absolute));
  }
  return result;
}

const currentFiles = await files(source);
const previousFiles = await files(target);
const keep = new Set([...currentFiles, "_release.json"]);
for (const relative of currentFiles) {
  const destination = path.join(target, relative);
  assert.ok(destination.startsWith(target + path.sep));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(source, relative), destination);
}
let removed = 0;
for (const relative of previousFiles) {
  if (keep.has(relative)) continue;
  const obsolete = path.join(target, relative);
  assert.ok(obsolete.startsWith(target + path.sep));
  assert.ok((await lstat(obsolete)).isFile());
  await unlink(obsolete);
  removed++;
}
for (const relative of currentFiles) {
  assert.deepEqual(await readFile(path.join(source, relative)), await readFile(path.join(target, relative)));
}
await writeFile(path.join(target, "_release.json"), JSON.stringify({ sourceRepository: "QCYTSN/autodraftman-product", sourceRevision: revision, builtAt: new Date().toISOString() }, null, 2) + "\n");
console.log(JSON.stringify({ copied: currentFiles.length, removed, sourceRevision: revision, target }));
