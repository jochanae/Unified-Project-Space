#!/usr/bin/env node
/**
 * Static scan of every <LoadingSpinner ... /> usage in src/.
 * Writes src/dev/spinner-audit.json — consumed by /__dev/spinners.
 *
 * Run manually: `bun run audit:spinners`
 * Auto-runs once when `bun dev` starts (see "predev" script).
 */
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const SRC = join(PROJECT_ROOT, "src");
const OUT = join(SRC, "dev", "spinner-audit.json");

const SPINNER_RE = /<LoadingSpinner\b([^>]*?)\/?>/gs;
const CONTEXT_RE = /\bcontext\s*=\s*"([^"]+)"/;
const SIZE_RE = /\bsize\s*=\s*"([^"]+)"/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dev" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (/\.(tsx|jsx)$/.test(entry) && !/\.test\.(tsx|jsx)$/.test(entry)) files.push(full);
  }
  return files;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const findings = [];
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("LoadingSpinner")) continue;
  if (file.endsWith("loading-spinner.tsx")) continue;

  for (const match of src.matchAll(SPINNER_RE)) {
    const attrs = match[1] ?? "";
    const context = attrs.match(CONTEXT_RE)?.[1] ?? null;
    const size = attrs.match(SIZE_RE)?.[1] ?? null;
    findings.push({
      file: relative(PROJECT_ROOT, file).replace(/\\/g, "/"),
      line: lineOf(src, match.index ?? 0),
      context,
      size,
      kind: size ? "explicit-size" : context ? "context" : "bare",
    });
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const summary = {
  generatedAt: new Date().toISOString(),
  total: findings.length,
  byKind: {
    context: findings.filter((f) => f.kind === "context").length,
    "explicit-size": findings.filter((f) => f.kind === "explicit-size").length,
    bare: findings.filter((f) => f.kind === "bare").length,
  },
  findings,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2) + "\n");
console.log(
  `[audit-spinners] ${summary.total} usages — ` +
    `${summary.byKind.context} context, ${summary.byKind["explicit-size"]} explicit-size, ${summary.byKind.bare} bare`,
);
