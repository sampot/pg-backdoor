#!/usr/bin/env node
/**
 * One-off thumbnail capture: npx node scripts/capture-thumbnail.mjs
 * Requires: npx playwright (not stored in repo).
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = 9876;

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ogg": "audio/ogg",
  ".md": "text/markdown",
};

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0] || "/";
  const filePath = join(root, path === "/" ? "index.html" : path.replace(/^\//, ""));
  try {
    const data = readFileSync(filePath);
    const ext = filePath.slice(filePath.lastIndexOf("."));
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(port, resolve));

try {
  execSync(
    `npx --yes playwright screenshot "http://127.0.0.1:${port}/?snapshot=1" "${join(root, "thumbnail.png")}" --viewport-size=640,480 --wait-for-timeout=2000`,
    { stdio: "inherit", cwd: root },
  );
  const png = readFileSync(join(root, "thumbnail.png"));
  writeFileSync(join(root, "thumbnail.png"), png);
  console.log(`thumbnail.png written (${png.length} bytes)`);
} finally {
  server.close();
}
