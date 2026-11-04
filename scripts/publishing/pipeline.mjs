// Autonomous publishing pipeline for HomeLabCore-Web.
// Implements:
//   GitHub Event -> Signature Verification -> Release/Milestone Filter ->
//   Deduplication -> Concise English Draft + Secret/IP Guard ->
//   Telegram Approval Verification -> Isolated GitHub PR ->
//   Build Validation -> Owner-Authorized Merge -> Cloudflare Pages.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROJECT_MAP = {
  "HomeLab-NL/whats-for-dinner": { id: "cookfrom", name: "CookFrom", tag: "CookFrom" },
  "HomeLab-NL/homework-tutor": { id: "ai-tutor", name: "Homework Tutor", tag: "Homework Tutor" },
  "homelabnl-alt/KeyQuest": { id: "keyboard-trainer", name: "KeyQuest", tag: "KeyQuest" },
  "HomeLab-NL/HomeLab-Core": { id: "agentlab", name: "AgentLab", tag: "AgentLab" },
};

// Patterns that must NEVER appear in published content (credentials, private IPs, internal hosts).
const FORBIDDEN_PATTERNS = [
  { name: "GitHub token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { name: "GitHub fine-grained PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "OpenAI / API secret key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Telegram Bot token", re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "RFC1918 10.x private IP", re: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  { name: "RFC1918 192.168.x private IP", re: /\b192\.168\.\d{1,3}\.\d{1,3}\b/ },
  { name: "RFC1918 172.16-31.x private IP", re: /\b172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/ },
  { name: "Tailscale CGNAT 100.64-127.x IP", re: /\b100\.(?:6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/ },
  { name: "Internal infrastructure hostname", re: /\b(?:qnap-nas|minisforum-host|[a-z0-9-]+\.local|[a-z0-9-]+\.lan)\b/i },
];

export class SecurityPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = "SecurityPolicyError";
  }
}

/**
 * Verifies GitHub X-Hub-Signature-256 header using HMAC-SHA256 and timingSafeEqual.
 */
export function verifyGitHubSignature({ rawBody, signatureHeader, secret }) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Missing webhook secret for signature verification");
  }
  if (!signatureHeader || typeof signatureHeader !== "string" || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expectedHex}`, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Classifies a GitHub webhook event.
 * Accepts ONLY:
 *   1. Published non-draft, non-prerelease GitHub Releases (ignoring minor bugfix-only tags with [skip-publish])
 *   2. Closed GitHub Milestones explicitly marked with [publish]
 *   3. Merged Pull Requests explicitly labeled "publish-milestone" or "release-note"
 * Ignores routine push commits, minor bugfixes, chores, and drafts.
 */
export function classifyGitHubEvent({ eventType, payload }) {
  const repoFullName = payload?.repository?.full_name ?? "unknown/repo";
  const projectMeta = PROJECT_MAP[repoFullName] ?? null;

  if (eventType === "release") {
    const rel = payload?.release;
    if (payload?.action !== "published" || !rel) {
      return { eligible: false, reason: `Ignored release action: ${payload?.action ?? "none"}` };
    }
    if (rel.draft || rel.prerelease) {
      return { eligible: false, reason: "Ignored draft or prerelease" };
    }
    const body = String(rel.body ?? "");
    const title = String(rel.name || rel.tag_name || "");
    if (/\[skip-publish\]/i.test(body) || /\[skip-publish\]/i.test(title)) {
      return { eligible: false, reason: "Explicitly marked [skip-publish]" };
    }
    // Ignore minor bug-fix-only releases with no user-facing notes
    if (/^(?:fix|chore|ci|build)\b/i.test(title) && !/\[publish\]/i.test(body)) {
      return { eligible: false, reason: "Routine bugfix/chore release ignored" };
    }
    return {
      eligible: true,
      category: "release",
      repoFullName,
      project: projectMeta,
      version: String(rel.tag_name ?? "").replace(/^v/, "") || undefined,
      title: title || `${projectMeta?.name ?? repoFullName} Release`,
      summarySource: body.trim(),
      publishedAt: (rel.published_at || new Date().toISOString()).slice(0, 10),
      sourceUrl: rel.html_url || payload?.repository?.html_url,
      sourceEventId: `${repoFullName}#release:${rel.tag_name || rel.id}`,
    };
  }

  if (eventType === "milestone") {
    const ms = payload?.milestone;
    if (payload?.action !== "closed" || !ms) {
      return { eligible: false, reason: `Ignored milestone action: ${payload?.action ?? "none"}` };
    }
    const desc = String(ms.description ?? "");
    const title = String(ms.title ?? "");
    if (!/\[publish\]/i.test(desc) && !/\[publish\]/i.test(title)) {
      return { eligible: false, reason: "Milestone not explicitly marked with [publish]" };
    }
    return {
      eligible: true,
      category: "milestone",
      repoFullName,
      project: projectMeta,
      title: title.replace(/\[publish\]/gi, "").trim(),
      summarySource: desc.replace(/\[publish\]/gi, "").trim(),
      publishedAt: (ms.closed_at || new Date().toISOString()).slice(0, 10),
      sourceUrl: ms.html_url || payload?.repository?.html_url,
      sourceEventId: `${repoFullName}#milestone:${ms.number || ms.id}`,
    };
  }

  if (eventType === "pull_request") {
    const pr = payload?.pull_request;
    if (payload?.action !== "closed" || !pr?.merged) {
      return { eligible: false, reason: "PR not merged" };
    }
    const labels = (pr.labels ?? []).map((l) => String(l.name ?? "").toLowerCase());
    const hasPublishLabel = labels.includes("publish-milestone") || labels.includes("release-note");
    if (!hasPublishLabel) {
      return { eligible: false, reason: "Merged PR lacks publish-milestone or release-note label" };
    }
    return {
      eligible: true,
      category: "milestone",
      repoFullName,
      project: projectMeta,
      title: String(pr.title ?? "").replace(/^(?:feat|release)(?:\([^)]+\))?:\s*/i, "").trim(),
      summarySource: String(pr.body ?? "").trim(),
      publishedAt: (pr.merged_at || new Date().toISOString()).slice(0, 10),
      sourceUrl: pr.html_url || payload?.repository?.html_url,
      sourceEventId: `${repoFullName}#pr:${pr.number}`,
    };
  }

  return { eligible: false, reason: `Ignored routine event type: ${eventType}` };
}

/**
 * Checks whether a sourceEventId has already been published in src/content/blog/.
 */
export function isDuplicateEvent({ sourceEventId, blogDir = "src/content/blog", knownIds = new Set() }) {
  if (!sourceEventId) return false;
  if (knownIds.has(sourceEventId)) return true;
  const resolved = path.resolve(blogDir);
  if (!fs.existsSync(resolved)) return false;
  for (const file of fs.readdirSync(resolved).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))) {
    const content = fs.readFileSync(path.join(resolved, file), "utf8");
    if (content.includes(`sourceEventId: "${sourceEventId}"`) || content.includes(`sourceEventId: '${sourceEventId}'`)) {
      return true;
    }
  }
  return false;
}

/**
 * Enforces the security policy: throws SecurityPolicyError if any credential,
 * token, private IP, or internal hostname is present.
 */
export function assertNoSensitiveData(text) {
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    if (re.test(text)) {
      throw new SecurityPolicyError(`Security policy violation: detected ${name} in draft content`);
    }
  }
  return true;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

/**
 * Ensures the meta description is strictly between 50 and 230 characters
 * as required by scripts/check-meta.mjs.
 */
function normalizeSeoDescription(rawDescription, projectName, title) {
  let desc = rawDescription.replace(/\s+/g, " ").trim();
  if (desc.length < 50) {
    desc = `${projectName}: ${title}. Verified milestone and engineering update published on HomeLabCore.`;
  }
  if (desc.length > 230) {
    desc = desc.slice(0, 226).replace(/\s+\S*$/, "") + "...";
  }
  return desc;
}

/**
 * Generates a concise English Markdown blog post from a classified event.
 * Verifies that no sensitive data appears in the input or output.
 */
export function generateArticleDraft(event) {
  if (!event?.eligible) {
    throw new Error("Cannot generate draft for ineligible event");
  }
  assertNoSensitiveData( `${event.title}\n${event.summarySource}\n${event.sourceUrl ?? ""}` );

  const projectName = event.project?.name ?? event.repoFullName.split("/").pop();
  const versionSuffix = event.version ? ` ${event.version}` : "";
  const rawFullTitle = event.title.includes(projectName)
    ? event.title
    : `${projectName}${versionSuffix}: ${event.title}`;
  // html-validate enforces <title> <= 70 chars; "${title} — HomeLabCore" adds 14 chars -> max 56 chars.
  const fullTitle = rawFullTitle.length > 56
    ? rawFullTitle.slice(0, 55).replace(/\s+\S*$/, "")
    : rawFullTitle;

  const cleanLines = event.summarySource
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const firstParagraph = cleanLines.find((l) => !l.startsWith("-") && !l.startsWith("*"))
    ?? `Verified ${event.category} update for ${projectName}${versionSuffix}.`;
  const bullets = cleanLines
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => `- ${l.slice(2).trim()}`);

  const description = normalizeSeoDescription(
    `${projectName}${versionSuffix}: ${firstParagraph.replace(/^[-*]\s*/, "")}`,
    projectName,
    fullTitle,
  );

  const datePrefix = event.publishedAt || new Date().toISOString().slice(0, 10);
  const slug = `${datePrefix}-${slugify(fullTitle)}`;
  const tags = [
    ...(event.project?.tag ? [event.project.tag] : []),
    event.category === "release" ? "Release" : "Milestone",
  ];

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(fullTitle)}`,
    `description: ${JSON.stringify(description)}`,
    `published: "${datePrefix}"`,
    `category: "${event.category}"`,
    ...(event.project?.id ? [`project: "${event.project.id}"`] : []),
    ...(event.version ? [`version: ${JSON.stringify(event.version)}`] : []),
    "tags:",
    ...tags.map((t) => `  - ${JSON.stringify(t)}`),
    `sourceEventId: ${JSON.stringify(event.sourceEventId)}`,
    ...(event.sourceUrl ? [`sourceUrl: ${JSON.stringify(event.sourceUrl)}`] : []),
    "---",
  ].join("\n");

  const bodySections = [
    firstParagraph,
    "",
    "## Verified changes",
    "",
    ...(bullets.length > 0
      ? bullets
      : [`- Published ${event.category} update for ${projectName}${versionSuffix}.`]),
  ];

  if (event.sourceUrl) {
    bodySections.push("", `Source reference: [${event.repoFullName}](${event.sourceUrl}).`);
  }

  const markdown = `${frontmatter}\n\n${bodySections.join("\n")}\n`;
  assertNoSensitiveData(markdown);

  return {
    slug,
    filePath: `src/content/blog/${slug}.md`,
    title: fullTitle,
    description,
    publishedAt: datePrefix,
    category: event.category,
    project: event.project?.id,
    version: event.version,
    sourceEventId: event.sourceEventId,
    markdown,
  };
}

/**
 * Signs a Telegram callback action (action|slug) using HMAC-SHA256 truncated to 16 hex chars
 * so it fits within Telegram's 64-byte callback_data limit.
 */
export function signTelegramCallback({ action, slug, secret }) {
  const shortSlug = slug.slice(0, 34);
  const sig = crypto.createHmac("sha256", secret).update(`${action}|${shortSlug}`, "utf8").digest("hex").slice(0, 16);
  return `${action}|${shortSlug}|${sig}`;
}

/**
 * Builds the Telegram approval message and inline keyboard payload.
 */
export function buildTelegramApprovalRequest({ draft, chatId, callbackSecret }) {
  const approveData = signTelegramCallback({ action: "approve", slug: draft.slug, secret: callbackSecret });
  const rejectData = signTelegramCallback({ action: "reject", slug: draft.slug, secret: callbackSecret });
  return {
    chat_id: String(chatId),
    parse_mode: "Markdown",
    text: [
      `📝 *HomeLabCore Publishing Draft Ready*`,
      ``,
      `*Title:* ${draft.title}`,
      `*Category:* \`${draft.category}\``,
      `*File:* \`${draft.filePath}\``,
      `*Event ID:* \`${draft.sourceEventId}\``,
      ``,
      `*Summary:* ${draft.description}`,
      ``,
      `Approve to open an isolated GitHub PR and run Astro build validation?`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve & Open PR", callback_data: approveData },
          { text: "🛑 Reject", callback_data: rejectData },
        ],
      ],
    },
  };
}

/**
 * Verifies a Telegram webhook callback query:
 *   1. Validates X-Telegram-Bot-Api-Secret-Token header
 *   2. Validates chat.id and from.id against authorized owner IDs
 *   3. Validates HMAC signature inside callback_data
 */
export function verifyTelegramApproval({
  update,
  secretTokenHeader,
  expectedWebhookSecret,
  allowedChatId,
  allowedUserId,
  callbackSecret,
}) {
  if (!secretTokenHeader || !expectedWebhookSecret) {
    return { authorized: false, reason: "Missing Telegram webhook secret token" };
  }
  const expectedBuf = Buffer.from(String(expectedWebhookSecret), "utf8");
  const actualBuf = Buffer.from(String(secretTokenHeader), "utf8");
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { authorized: false, reason: "Invalid Telegram webhook secret token" };
  }

  const cb = update?.callback_query;
  if (!cb) {
    return { authorized: false, reason: "No callback_query in Telegram update" };
  }
  const chatId = String(cb.message?.chat?.id ?? "");
  const userId = String(cb.from?.id ?? "");
  if (chatId !== String(allowedChatId) || userId !== String(allowedUserId)) {
    return { authorized: false, reason: "Unauthorized Telegram chat or user ID" };
  }

  const parts = String(cb.data ?? "").split("|");
  if (parts.length !== 3) {
    return { authorized: false, reason: "Malformed callback_data" };
  }
  const [action, shortSlug, sig] = parts;
  if (!["approve", "reject", "merge"].includes(action)) {
    return { authorized: false, reason: `Unsupported callback action: ${action}` };
  }
  const expectedCallback = signTelegramCallback({ action, slug: shortSlug, secret: callbackSecret });
  const expectedSig = expectedCallback.split("|")[2];
  const sigBuf = Buffer.from(sig, "utf8");
  const expSigBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
    return { authorized: false, reason: "Invalid callback_data HMAC signature" };
  }

  return {
    authorized: true,
    decision: action,
    shortSlug,
    reviewerId: userId,
  };
}

/**
 * Prepares the isolated GitHub PR specification for a verified draft.
 * Never commits directly to main and never auto-merges without owner authorization.
 */
export function prepareIsolatedPullRequestSpec({ draft }) {
  const branchName = `auton-pub/${draft.slug}`;
  return {
    baseBranch: "main",
    headBranch: branchName,
    filePath: draft.filePath,
    commitMessage: `docs(blog): publish ${draft.title} [automated]`,
    prTitle: `docs(blog): ${draft.title}`,
    prBody: [
      `## Automated Publication Draft`,
      ``,
      `- **Source Event ID:** \`${draft.sourceEventId}\``,
      `- **Category:** \`${draft.category}\``,
      `- **Target File:** \`${draft.filePath}\``,
      ``,
      `### Validation & Merge Policy`,
      `- [x] Webhook HMAC-SHA256 verified`,
      `- [x] Secret & private-IP guard passed`,
      `- [x] Telegram owner approval verified`,
      `- [ ] GitHub Actions \`verify\` suite (\`astro check\`, \`npm run build\`, \`npm test\`) must pass`,
      `- [ ] Explicit owner merge authorization required before Cloudflare Pages production deployment`,
    ].join("\n"),
    requiresOwnerMergeApproval: true,
    autoMerge: false,
  };
}

