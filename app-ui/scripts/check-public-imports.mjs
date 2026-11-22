import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const forbidden = [
  /@healseek\/[^'"\s]+\/src\//,
  /packages\/core\//,
  // app-ui may use local siblings (`./components/...`) but must never escape
  // its own source tree with a parent import. Keep this check broad enough to
  // catch nested components (`../../...`) as well as dynamic imports.
  /(?:from\s+|import\s*\()\s*['"]\.\.(?:[\\/])/,
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if ([".ts", ".vue"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = await walk(root);
const violations = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

if (violations.length) {
  console.error("app-ui must consume framework public exports only:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `app-ui public import check passed (${files.length} source files).`,
  );
}
