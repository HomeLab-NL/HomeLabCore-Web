// Fills dist/_headers' Content-Security-Policy with the sha256 hash of every
// inline script in the built pages, so the policy can allow exactly those
// scripts and nothing else. Runs after `astro build`; fails if the
// placeholder is missing.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DIST, inlineScripts } from "./lib/serve.mjs";

const PLACEHOLDER = "INLINE_SCRIPT_HASHES";
const file = path.join(DIST, "_headers");
const headers = fs.readFileSync(file, "utf8");
if (!headers.includes(PLACEHOLDER)) {
  console.error(`✗ ${file} has no ${PLACEHOLDER} placeholder`);
  process.exit(1);
}

const hashes = [...new Set(inlineScripts().map((s) => `'sha256-${crypto.createHash("sha256").update(s).digest("base64")}'`))].sort();
fs.writeFileSync(file, headers.replaceAll(PLACEHOLDER, hashes.join(" ")));
console.log(`_headers: ${hashes.length} inline script hash(es) in the Content-Security-Policy`);
