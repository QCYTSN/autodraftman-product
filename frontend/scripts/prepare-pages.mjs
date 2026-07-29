import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const routeNames = [
  "examples",
  "pricing",
  "workspace",
  "docs",
  "privacy",
  "terms",
  "content-policy",
];

await Promise.all(
  routeNames.map(async (routeName) => {
    const routeDirectory = path.join(outputDirectory, routeName);
    await mkdir(routeDirectory, { recursive: true });
    await copyFile(
      path.join(outputDirectory, "index.html"),
      path.join(routeDirectory, "index.html"),
    );
  }),
);

await copyFile(
  path.join(outputDirectory, "index.html"),
  path.join(outputDirectory, "404.html"),
);
await writeFile(path.join(outputDirectory, ".nojekyll"), "");
