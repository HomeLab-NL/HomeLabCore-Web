import { defineMiddleware } from "astro:middleware";

// Product names and the brand must never be machine-translated (browser
// translators turned "AI Tutor" into "Репетитор зі штучного інтелекту").
// Every page's body text is post-processed at build time: each occurrence of
// a name in text content is wrapped in <span translate="no">. Attributes,
// <title> and meta tags are untouched. Longer names come first so that
// "At the Mountains of Madness" is matched before anything shorter.
export const PROTECTED_NAMES = [
  "At the Mountains of Madness",
  "Keyboard Trainer",
  "Homework Tutor",
  "HomeLabCore",
  "Ops Planner",
  "CookFrom",
  "AgentLab",
  "AI Tutor",
  "KeyQuest",
];

const NAME_RE = new RegExp(PROTECTED_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
// Raw-text elements whose contents are not HTML text.
const RAW = /<(script|style|textarea)\b[\s\S]*?<\/\1>/gi;

export function protectNames(html: string): string {
  const start = html.indexOf("<body");
  if (start < 0) return html;
  const head = html.slice(0, start);
  const body = html.slice(start);
  const raws: string[] = [];
  const masked = body.replace(RAW, (m) => `\u0000${raws.push(m) - 1}\u0000`);
  const wrapped = masked.replace(/>([^<]+)</g, (_m, text: string) => `>${text.replace(NAME_RE, (n) => `<span translate="no">${n}</span>`)}<`);
  return head + wrapped.replace(/\u0000(\d+)\u0000/g, (_m, i) => raws[Number(i)]);
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;
  const html = protectNames(await response.text());
  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
});
