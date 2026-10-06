// Reads the light and dark theme token blocks from the site stylesheet, so
// build-time checks (project accent contrast) use the real theme colours
// instead of a second copy that could drift.

import fs from "node:fs";
import path from "node:path";

export type ThemeName = "light" | "dark";

const STYLESHEET = path.resolve("public/assets/css/styles.css");

const BLOCKS: Record<ThemeName, RegExp> = {
  light: /:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/,
  dark: /\[data-theme="dark"\]\s*\{([^}]*)\}/,
};

let cache: Record<ThemeName, Record<string, string>> | undefined;

export function themeTokens(): Record<ThemeName, Record<string, string>> {
  if (cache) return cache;
  const css = fs.readFileSync(STYLESHEET, "utf8");
  const read = (theme: ThemeName) => {
    const block = BLOCKS[theme].exec(css);
    if (!block) throw new Error(`No ${theme} theme token block found in ${STYLESHEET}`);
    const tokens: Record<string, string> = {};
    for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
    return tokens;
  };
  cache = { light: read("light"), dark: read("dark") };
  return cache;
}

/** Background colours text can sit on, per theme. */
export function textBackgrounds(theme: ThemeName): Record<string, string> {
  const t = themeTokens()[theme];
  return { "--bg": t["--bg"], "--surface": t["--surface"], "--surface-2": t["--surface-2"] };
}
