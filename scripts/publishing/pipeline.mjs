// Autonomous publishing pipeline for HomeLabCore-Web (v2.0).
// Implements:
//   Multi-Repo GitHub Event -> Signature Verification -> Release/Milestone Filter (no RCs/self-PRs) ->
//   Cross-Repo Deduplication -> Concise English Draft + Secret/IP Guard ->
//   Isolated GitHub Draft PR (capturing reviewedCommitSha) ->
//   Ukrainian Review Notifications via HomeLab Info (@Home_Lab_info_bot) to Authorized Family Members ->
//   First-Decision-Wins Callback Verification + Button Invalidation for Both Users ->
//   Exact Commit SHA & CI Check Revalidation -> Squash Merge -> Cloudflare Pages ->
//   Ukrainian Live Publication Confirmation with Working Article URL.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PROJECT_REPO_MAP = Object.freeze({
  "homelab-nl/whats-for-dinner": Object.freeze({
    id: "cookfrom",
    name: "CookFrom",
    tag: "CookFrom",
    private: true,
    publicUrl: "https://play.google.com/store/apps/details?id=com.homelabnl.recipeai",
    overviewUrl: "https://homelabcore.dev/apps/cookfrom",
  }),
  "homelab-nl/ops-planner": Object.freeze({
    id: "ops-planner",
    name: "Ops Planner",
    tag: "Ops Planner",
    private: true,
    publicUrl: "https://homelabcore.dev/apps/ops-planner",
    overviewUrl: "https://homelabcore.dev/apps/ops-planner",
  }),
  "homelab-nl/homework-tutor": Object.freeze({
    id: "ai-tutor",
    name: "Homework Tutor",
    tag: "Homework Tutor",
    private: true,
    publicUrl: "https://homelabcore.dev/apps/ai-tutor/",
    overviewUrl: "https://homelabcore.dev/apps/ai-tutor/",
  }),
  "homelabnl-alt/keyquest": Object.freeze({
    id: "keyboard-trainer",
    name: "KeyQuest",
    tag: "KeyQuest",
    private: false,
    publicUrl: "https://keyquest-b9l7.onrender.com/",
    overviewUrl: "https://homelabcore.dev/apps/keyboard-trainer/",
  }),
  "homelab-nl/keyboard-trainer": Object.freeze({
    id: "keyboard-trainer",
    name: "KeyQuest",
    tag: "KeyQuest",
    private: true,
    publicUrl: "https://keyquest-b9l7.onrender.com/",
    overviewUrl: "https://homelabcore.dev/apps/keyboard-trainer/",
  }),
  "homelab-nl/homelab-core": Object.freeze({
    id: "agentlab",
    name: "AgentLab",
    tag: "AgentLab",
    private: true,
    publicUrl: "https://homelabcore.dev/lab/agentlab/",
    overviewUrl: "https://homelabcore.dev/lab/agentlab/",
  }),
  "homelab-nl/amom-godot": Object.freeze({
    id: "at-the-mountains-of-madness",
    name: "At the Mountains of Madness",
    tag: "At the Mountains of Madness",
    private: true,
    publicUrl: "https://homelabcore.dev/lab/at-the-mountains-of-madness/",
    overviewUrl: "https://homelabcore.dev/lab/at-the-mountains-of-madness/",
  }),
  "homelab-nl/homelabcore-web": Object.freeze({
    id: "",
    name: "HomeLabCore",
    tag: "HomeLabCore",
    private: false,
    publicUrl: "https://homelabcore.dev/",
    overviewUrl: "https://homelabcore.dev/",
  }),
});

export const PROJECT_MAP = Object.freeze({
  "HomeLab-NL/whats-for-dinner": Object.freeze({
    id: "cookfrom",
    name: "CookFrom",
    tag: "CookFrom",
    private: true,
    publicUrl: "https://play.google.com/store/apps/details?id=com.homelabnl.recipeai",
    overviewUrl: "https://homelabcore.dev/apps/cookfrom",
  }),
  "HomeLab-NL/ops-planner": Object.freeze({
    id: "ops-planner",
    name: "Ops Planner",
    tag: "Ops Planner",
    private: true,
    publicUrl: "https://homelabcore.dev/apps/ops-planner",
    overviewUrl: "https://homelabcore.dev/apps/ops-planner",
  }),
  "HomeLab-NL/homework-tutor": Object.freeze({
    id: "ai-tutor",
    name: "Homework Tutor",
    tag: "Homework Tutor",
    private: true,
    publicUrl: "https://homelabcore.dev/apps/ai-tutor/",
    overviewUrl: "https://homelabcore.dev/apps/ai-tutor/",
  }),
  "homelabnl-alt/KeyQuest": Object.freeze({
    id: "keyboard-trainer",
    name: "KeyQuest",
    tag: "KeyQuest",
    private: false,
    publicUrl: "https://keyquest-b9l7.onrender.com/",
    overviewUrl: "https://homelabcore.dev/apps/keyboard-trainer/",
  }),
  "HomeLab-NL/keyboard-trainer": Object.freeze({
    id: "keyboard-trainer",
    name: "KeyQuest",
    tag: "KeyQuest",
    private: true,
    publicUrl: "https://keyquest-b9l7.onrender.com/",
    overviewUrl: "https://homelabcore.dev/apps/keyboard-trainer/",
  }),
  "HomeLab-NL/HomeLab-Core": Object.freeze({
    id: "agentlab",
    name: "AgentLab",
    tag: "AgentLab",
    private: true,
    publicUrl: "https://homelabcore.dev/lab/agentlab/",
    overviewUrl: "https://homelabcore.dev/lab/agentlab/",
  }),
  "HomeLab-NL/amom-godot": Object.freeze({
    id: "at-the-mountains-of-madness",
    name: "At the Mountains of Madness",
    tag: "At the Mountains of Madness",
    private: true,
    publicUrl: "https://homelabcore.dev/lab/at-the-mountains-of-madness/",
    overviewUrl: "https://homelabcore.dev/lab/at-the-mountains-of-madness/",
  }),
  "HomeLab-NL/HomeLabCore-Web": Object.freeze({
    id: "",
    name: "HomeLabCore",
    tag: "HomeLabCore",
    private: false,
    publicUrl: "https://homelabcore.dev/",
    overviewUrl: "https://homelabcore.dev/",
  }),
});

/**
 * Metadata for the two Telegram bots in the HomeLab ecosystem.
 * - HomeLab Info (@Home_Lab_info_bot, id 8967925790) sends Uptime Kuma monitoring
 *   alerts (/healthz + HomeLab Backup push heartbeats) and handles HomeLabCore-Web
 *   publication approvals & family enrollment via webhook.
 * - HomeLab Assistant (@homelab_core_bot, id 8633834424) is reserved for AgentLab
 *   worker intake (telegram-p0-gateway) and systemd OnFailure alerts and must NOT
 *   have its webhook overwritten by website publishing.
 */
export const HOMELAB_TELEGRAM_BOTS = Object.freeze({
  infoBot: Object.freeze({
    id: 8967925790,
    username: "Home_Lab_info_bot",
    firstName: "HomeLab Info",
    webhookPath: "homelab-info-web-approval",
    webhookUrl: "https://n8n.homelabcore.dev/webhook/homelab-info-web-approval",
    callbackPrefix: "hlc-pub",
    shortPrefix: "p",
    enrollPrefix: "e",
    allowedUpdates: Object.freeze(["message", "callback_query"]),
  }),
  assistantBot: Object.freeze({
    id: 8633834424,
    username: "homelab_core_bot",
    firstName: "HomeLab Assistant",
    webhookPath: "telegram-p0-gateway",
    webhookUrl: "https://n8n.homelabcore.dev/webhook/telegram-p0-gateway",
  }),
});

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
 * Classifies a GitHub webhook event across all monitored project repositories.
 * Accepts ONLY:
 *   1. Published non-draft, non-prerelease, non-RC GitHub Releases
 *   2. Closed GitHub Milestones explicitly marked with [publish]
 * Ignores routine push commits, pull_request events from auton-pub/*, release candidates, and minor fixes.
 */
export function classifyGitHubEvent({ eventType, payload }) {
  const repoFullName = payload?.repository?.full_name ?? "unknown/repo";
  const projectMeta = PROJECT_MAP[repoFullName] ?? null;

  // Prevent self-triggering from auton-pub/* branches or PRs
  const headRef = String(payload?.pull_request?.head?.ref || payload?.ref || "");
  if (headRef.includes("auton-pub/")) {
    return { eligible: false, reason: "Ignored self-generated auton-pub/* branch/PR" };
  }

  if (eventType === "release") {
    const rel = payload?.release;
    if (payload?.action !== "published" || !rel) {
      return { eligible: false, reason: `Ignored release action: ${payload?.action ?? "none"}` };
    }
    if (rel.draft || rel.prerelease) {
      return { eligible: false, reason: "Ignored draft or prerelease" };
    }
    const body = String(rel.body ?? "");
    const tag = String(rel.tag_name ?? "");
    const title = String(rel.name || tag || "");
    if (/\[skip-publish\]/i.test(body) || /\[skip-publish\]/i.test(title)) {
      return { eligible: false, reason: "Explicitly marked [skip-publish]" };
    }
    // Ignore Release Candidates (RC / alpha / beta) by default unless explicitly marked [publish]
    if (
      (/(?:^|[-_.\s])(?:rc[0-9]*|release\s*candidate|alpha|beta)(?:$|[-_.\s0-9])/i.test(`${tag} ${title}`)) &&
      !/\[publish\]/i.test(`${title} ${body}`)
    ) {
      return { eligible: false, reason: "Release candidate / pre-release tag ignored by default" };
    }
    if (/^(?:fix|chore|ci|build)\b/i.test(title) && !/\[publish\]/i.test(body)) {
      return { eligible: false, reason: "Routine bugfix/chore release ignored" };
    }
    const publicSourceUrl = projectMeta?.private
      ? projectMeta.publicUrl || projectMeta.overviewUrl
      : rel.html_url || payload?.repository?.html_url || projectMeta?.overviewUrl;

    return {
      eligible: true,
      category: "release",
      repoFullName,
      project: projectMeta,
      version: tag.replace(/^v/, "") || undefined,
      title: title.replace(/\[publish\]/gi, "").trim() || `${projectMeta?.name ?? repoFullName} Release`,
      summarySource: body.replace(/\[publish\]/gi, "").trim(),
      publishedAt: (rel.published_at || new Date().toISOString()).slice(0, 10),
      sourceUrl: publicSourceUrl,
      sourceEventId: `${repoFullName}#release:${tag || rel.id}`,
    };
  }

  if (eventType === "milestone") {
    const ms = payload?.milestone;
    if (payload?.action !== "closed" || !ms) {
      return { eligible: false, reason: `Ignored milestone action: ${payload?.action ?? "none"}` };
    }
    const desc = String(ms.description ?? "").trim();
    const title = String(ms.title ?? "").trim();
    if (!/\[publish\]/i.test(desc) && !/\[publish\]/i.test(title)) {
      return { eligible: false, reason: "Milestone not explicitly marked with [publish]" };
    }

    // Quality guard: never interpret milestone closure as proof of a release unless explicit
    // Reject low-information, routine, or empty milestone summaries
    const cleanDesc = desc.replace(/\[publish\]/gi, "").trim();
    const cleanTitle = title.replace(/\[publish\]/gi, "").trim();
    if (!cleanDesc || cleanDesc.length < 20) {
      return {
        eligible: false,
        reason: "Milestone description is too brief or lacks meaningful verified user-facing changes",
      };
    }

    // Require meaningful bullet points or detailed narrative (prevent routine chore/refactor publishing)
    const bulletCount = (cleanDesc.match(/^[-*]\s+/gm) || []).length;
    if (bulletCount === 0 && cleanDesc.length < 50) {
      return {
        eligible: false,
        reason: "Milestone lacks detailed changes or bullet points describing user-facing improvements",
      };
    }

    // Guard against stale milestones (closed date vs created date / old software activity)
    const closedDateStr = ms.closed_at || new Date().toISOString();
    const closedDate = new Date(closedDateStr);
    const now = new Date();
    // If milestone was closed more than 14 days ago, reject as stale
    if (now.getTime() - closedDate.getTime() > 14 * 24 * 60 * 60 * 1000) {
      return {
        eligible: false,
        reason: `Milestone closed date (${closedDateStr.slice(0, 10)}) is older than 14 days; rejected as stale`,
      };
    }

    const publicSourceUrl = projectMeta?.private
      ? projectMeta.publicUrl || projectMeta.overviewUrl
      : ms.html_url || payload?.repository?.html_url || projectMeta?.overviewUrl;

    return {
      eligible: true,
      category: "milestone",
      repoFullName,
      project: projectMeta,
      title: cleanTitle,
      summarySource: cleanDesc,
      publishedAt: closedDateStr.slice(0, 10),
      eventDate: closedDateStr.slice(0, 10),
      sourceUrl: publicSourceUrl,
      sourceEventId: `${repoFullName}#milestone:${ms.number || ms.id}`,
    };
  }

  return { eligible: false, reason: `Ignored routine event type: ${eventType}` };
}

/**
 * Checks whether a sourceEventId has already been published in src/content/blog/.
 */
export function isDuplicateEvent({ sourceEventId, blogDir = "src/content/blog", knownIds = new Set(), processedEventIds = [] }) {
  if (!sourceEventId) return false;
  if (knownIds.has(sourceEventId)) return true;
  if (Array.isArray(processedEventIds) && processedEventIds.includes(sourceEventId)) return true;
  if (processedEventIds && typeof processedEventIds === "object" && processedEventIds[sourceEventId]) return true;
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

function localizeReleaseText(text, targetLang) {
  if (!text || typeof text !== "string") return text;
  if (targetLang === "uk") {
    return text
      .replace(/Live Web Deployment & Features/gi, "онлайн-реліз та можливості")
      .replace(/Android Launch & iOS Testing/gi, "реліз на Android та тест iOS")
      .replace(/Release Candidate & iOS Prep/gi, "Android RC та підготовка iOS")
      .replace(/Smart Notebook UI & Identity/gi, "інтерфейс Smart Notebook")
      .replace(/Verified release update/gi, "Підтверджене оновлення релізу")
      .replace(/Verified milestone update/gi, "Підтверджений етап розробки")
      .replace(/Verified devlog update/gi, "Підтверджений запис журналу розробки")
      .replace(/Released to Google Play production/gi, "Випущено в робочу версію Google Play")
      .replace(/Released to Google Play/gi, "Випущено в Google Play")
      .replace(/Currently in testing/gi, "Наразі проходить тестування")
      .replace(/Closed testing is complete/gi, "Закрите тестування завершено")
      .replace(/production access approved/gi, "доступ до публікації схвалено")
      .replace(/Get ([a-zA-Z0-9_-]+) on Google Play/gi, "Завантажити $1 у Google Play")
      .replace(/visit the ([a-zA-Z0-9_-]+) product page/gi, "відвідати сторінку продукту $1")
      .replace(/Source reference/gi, "Джерело інформації")
      .replace(/Verified changes/gi, "Підтверджені зміни");
  }
  if (targetLang === "nl") {
    return text
      .replace(/Live Web Deployment & Features/gi, "live webimplementatie & functies")
      .replace(/Android Launch & iOS Testing/gi, "Android-launch & iOS-test")
      .replace(/Release Candidate & iOS Prep/gi, "Android RC & iOS MVP")
      .replace(/Smart Notebook UI & Identity/gi, "Smart Notebook-interface")
      .replace(/Verified release update/gi, "Geverifieerde release-update")
      .replace(/Verified milestone update/gi, "Geverifieerde mijlpaalupdate")
      .replace(/Verified devlog update/gi, "Geverifieerd ontwikkeljournaal")
      .replace(/Released to Google Play production/gi, "Uitgebracht naar Google Play-productie")
      .replace(/Released to Google Play/gi, "Uitgebracht naar Google Play")
      .replace(/Currently in testing/gi, "Momenteel in testfase")
      .replace(/Closed testing is complete/gi, "Gesloten testen is afgerond")
      .replace(/production access approved/gi, "productietoegang goedgekeurd")
      .replace(/Get ([a-zA-Z0-9_-]+) on Google Play/gi, "Download $1 op Google Play")
      .replace(/visit the ([a-zA-Z0-9_-]+) product page/gi, "bezoek de $1-productpagina")
      .replace(/Source reference/gi, "Bronreferentie")
      .replace(/Verified changes/gi, "Geverifieerde wijzigingen");
  }
  return text;
}

/**
 * Validates that all three required language variants (EN, UK, NL) are present,
 * properly formatted, non-empty, and share the identical publication ID.
 * Throws an error to prevent partial publication if any translation is missing.
 */
export function assertTrilingualPublicationCompleteness(draft) {
  if (!draft) {
    throw new Error("Missing publication draft");
  }
  if (!draft.slug) {
    throw new Error("Missing publication ID (slug)");
  }
  const variants = [
    { lang: "en", path: draft.filePath, content: draft.markdown, title: draft.title },
    { lang: "uk", path: draft.filePathUk, content: draft.markdownUk, title: draft.titleUk },
    { lang: "nl", path: draft.filePathNl, content: draft.markdownNl, title: draft.titleNl },
  ];

  for (const v of variants) {
    if (!v.path || typeof v.path !== "string" || !v.path.endsWith(".md")) {
      throw new Error(`Missing or invalid file path for ${v.lang.toUpperCase()} translation in draft ${draft.slug}`);
    }
    if (!v.content || typeof v.content !== "string" || v.content.trim().length === 0) {
      throw new Error(`Missing or empty markdown content for ${v.lang.toUpperCase()} translation in draft ${draft.slug}`);
    }
    if (!v.title || typeof v.title !== "string" || v.title.length === 0 || v.title.length > 56) {
      throw new Error(`Invalid title length (${v.title?.length ?? 0}) for ${v.lang.toUpperCase()} translation in draft ${draft.slug}`);
    }
    if (!v.content.includes("---") || !v.content.includes("title:") || !v.content.includes("description:")) {
      throw new Error(`Missing frontmatter metadata in ${v.lang.toUpperCase()} translation for draft ${draft.slug}`);
    }
  }
  return true;
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
  assertNoSensitiveData(`${event.title}\n${event.summarySource}\n${event.sourceUrl ?? ""}`);

  const projectName = event.project?.name ?? event.repoFullName.split("/").pop();
  const versionSuffix = event.version && !event.title.includes(event.version) ? ` ${event.version}` : "";
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

  // Build concise 2-3 sentence summary for human review card
  const extraSentence = bullets.length > 0
    ? bullets.slice(0, 2).map((b) => b.replace(/^- /, "").replace(/\.$/, "")).join("; ") + "."
    : `Оновлення підготовлено для публікації у блозі HomeLabCore.`;
  const shortSummary = `${firstParagraph.replace(/\.*$/, ".")} ${extraSentence}`.trim();

  const datePrefix = event.publishedAt || new Date().toISOString().slice(0, 10);
  const slug = `${datePrefix}-${slugify(fullTitle)}`;
  const draftId = crypto.createHash("sha256").update(slug, "utf8").digest("hex").slice(0, 16);
  const tags = [
    ...(event.project?.tag ? [event.project.tag] : ["HomeLabCore"]),
    event.category === "release" ? "Release" : "Milestone",
  ];

  // English variant (canonical)
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(fullTitle)}`,
    `description: ${JSON.stringify(description)}`,
    `published: "${datePrefix}"`,
    `category: "${event.category}"`,
    ...(event.project?.id ? [`project: "${event.project.id}"`] : []),
    ...(event.version ? [`version: ${JSON.stringify(event.version)}`] : []),
    `lang: "en"`,
    "tags:",
    ...tags.map((t) => `  - ${JSON.stringify(t)}`),
    `sourceEventId: ${JSON.stringify(event.sourceEventId)}`,
    ...(event.sourceUrl ? [`sourceUrl: ${JSON.stringify(event.sourceUrl)}`] : []),
    "---",
  ].join("\n");

  const refLabel = event.project?.name || event.repoFullName;
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
    bodySections.push("", `Source reference: [${refLabel}](${event.sourceUrl}).`);
  }

  const markdown = `${frontmatter}\n\n${bodySections.join("\n")}\n`;
  assertNoSensitiveData(markdown);

  // Ukrainian localized variant
  const rawTitleUk = localizeReleaseText(fullTitle, "uk");
  const titleUk = rawTitleUk.length > 56 ? rawTitleUk.slice(0, 55).replace(/\s+\S*$/, "") : rawTitleUk;
  const firstParaUk = localizeReleaseText(firstParagraph, "uk");
  const bulletsUk = bullets.map((b) => localizeReleaseText(b, "uk"));
  const descUk = normalizeSeoDescription(
    `${projectName}${versionSuffix}: ${firstParaUk.replace(/^[-*]\s*/, "")}`,
    projectName,
    titleUk,
  );
  const frontmatterUk = [
    "---",
    `title: ${JSON.stringify(titleUk)}`,
    `description: ${JSON.stringify(descUk)}`,
    `published: "${datePrefix}"`,
    `category: "${event.category}"`,
    ...(event.project?.id ? [`project: "${event.project.id}"`] : []),
    ...(event.version ? [`version: ${JSON.stringify(event.version)}`] : []),
    `lang: "uk"`,
    "tags:",
    ...tags.map((t) => `  - ${JSON.stringify(t)}`),
    `sourceEventId: ${JSON.stringify(event.sourceEventId)}`,
    ...(event.sourceUrl ? [`sourceUrl: ${JSON.stringify(event.sourceUrl)}`] : []),
    "---",
  ].join("\n");
  const bodySectionsUk = [
    firstParaUk,
    "",
    "## Підтверджені зміни",
    "",
    ...(bulletsUk.length > 0 ? bulletsUk : [`- Опубліковано оновлення для ${projectName}${versionSuffix}.`]),
  ];
  if (event.sourceUrl) {
    bodySectionsUk.push("", `Джерело інформації: [${refLabel}](${event.sourceUrl}).`);
  }
  const markdownUk = `${frontmatterUk}\n\n${bodySectionsUk.join("\n")}\n`;
  assertNoSensitiveData(markdownUk);

  // Dutch localized variant
  const rawTitleNl = localizeReleaseText(fullTitle, "nl");
  const titleNl = rawTitleNl.length > 56 ? rawTitleNl.slice(0, 55).replace(/\s+\S*$/, "") : rawTitleNl;
  const firstParaNl = localizeReleaseText(firstParagraph, "nl");
  const bulletsNl = bullets.map((b) => localizeReleaseText(b, "nl"));
  const descNl = normalizeSeoDescription(
    `${projectName}${versionSuffix}: ${firstParaNl.replace(/^[-*]\s*/, "")}`,
    projectName,
    titleNl,
  );
  const frontmatterNl = [
    "---",
    `title: ${JSON.stringify(titleNl)}`,
    `description: ${JSON.stringify(descNl)}`,
    `published: "${datePrefix}"`,
    `category: "${event.category}"`,
    ...(event.project?.id ? [`project: "${event.project.id}"`] : []),
    ...(event.version ? [`version: ${JSON.stringify(event.version)}`] : []),
    `lang: "nl"`,
    "tags:",
    ...tags.map((t) => `  - ${JSON.stringify(t)}`),
    `sourceEventId: ${JSON.stringify(event.sourceEventId)}`,
    ...(event.sourceUrl ? [`sourceUrl: ${JSON.stringify(event.sourceUrl)}`] : []),
    "---",
  ].join("\n");
  const bodySectionsNl = [
    firstParaNl,
    "",
    "## Geverifieerde wijzigingen",
    "",
    ...(bulletsNl.length > 0 ? bulletsNl : [`- Update gepubliceerd voor ${projectName}${versionSuffix}.`]),
  ];
  if (event.sourceUrl) {
    bodySectionsNl.push("", `Bronreferentie: [${refLabel}](${event.sourceUrl}).`);
  }
  const markdownNl = `${frontmatterNl}\n\n${bodySectionsNl.join("\n")}\n`;
  assertNoSensitiveData(markdownNl);

  const files = [
    { path: `src/content/blog/${slug}.md`, content: markdown, lang: "en" },
    { path: `src/content/blog/uk/${slug}.md`, content: markdownUk, lang: "uk" },
    { path: `src/content/blog/nl/${slug}.md`, content: markdownNl, lang: "nl" },
  ];

  const draftResult = {
    draftId,
    slug,
    filePath: `src/content/blog/${slug}.md`,
    filePathUk: `src/content/blog/uk/${slug}.md`,
    filePathNl: `src/content/blog/nl/${slug}.md`,
    projectName,
    title: fullTitle,
    titleUk,
    titleNl,
    description,
    descriptionUk: descUk,
    descriptionNl: descNl,
    shortSummary,
    summaryUa: shortSummary,
    publishedAt: datePrefix,
    category: event.category,
    project: event.project?.id,
    version: event.version,
    sourceEventId: event.sourceEventId,
    sourceUrl: event.sourceUrl,
    liveUrl: `https://homelabcore.dev/blog/${slug}/`,
    liveUrlUk: `https://homelabcore.dev/uk/blog/${slug}/`,
    liveUrlNl: `https://homelabcore.dev/nl/blog/${slug}/`,
    markdown,
    markdownUk,
    markdownNl,
    files,
  };

  assertTrilingualPublicationCompleteness(draftResult);
  return draftResult;
}

/**
 * Verifies that reusing the Telegram bot will not conflict with any existing
 * webhook or polling consumer, and ensures @homelab_core_bot is never overwritten.
 */
export function verifyTelegramBotConsumerSafety({
  getMeResult,
  webhookInfo,
  expectedWebhookUrl = HOMELAB_TELEGRAM_BOTS.infoBot.webhookUrl,
  activePollers = 0,
}) {
  if (!getMeResult || typeof getMeResult !== "object") {
    return { safe: false, reason: "Missing Telegram getMe metadata" };
  }
  if (
    Number(getMeResult.id) === HOMELAB_TELEGRAM_BOTS.assistantBot.id ||
    getMeResult.username === HOMELAB_TELEGRAM_BOTS.assistantBot.username
  ) {
    return {
      safe: false,
      reason: "Refusing to reuse @homelab_core_bot (reserved for AgentLab telegram-p0-gateway webhook)",
    };
  }
  if (
    Number(getMeResult.id) !== HOMELAB_TELEGRAM_BOTS.infoBot.id ||
    getMeResult.username !== HOMELAB_TELEGRAM_BOTS.infoBot.username
  ) {
    return {
      safe: false,
      reason: `Unexpected Telegram bot identity: ${getMeResult.username ?? "unknown"} (${getMeResult.id ?? "?"})`,
    };
  }
  if (Number(activePollers) > 0) {
    return {
      safe: false,
      reason: "Active getUpdates polling consumer detected; Telegram prohibits concurrent polling and webhook consumers",
    };
  }

  const currentUrl = String(webhookInfo?.url ?? "").trim();
  if (!currentUrl) {
    return {
      safe: true,
      state: "outbound-only-no-webhook",
      canRegisterWebhook: true,
      preservesUptimeKumaAndBackupPush: true,
    };
  }
  if (currentUrl === expectedWebhookUrl) {
    return {
      safe: true,
      state: "already-bound-to-publishing-webhook",
      canRegisterWebhook: false,
      preservesUptimeKumaAndBackupPush: true,
    };
  }
  return {
    safe: false,
    state: "conflicting-webhook",
    reason: `HomeLab Info webhook is already bound to a different consumer: ${currentUrl}`,
  };
}

/**
 * Builds the non-conflicting Telegram setWebhook payload for HomeLab Info (@Home_Lab_info_bot).
 */
export function buildHomeLabInfoWebhookSpec({
  webhookUrl = HOMELAB_TELEGRAM_BOTS.infoBot.webhookUrl,
  secretToken,
  allowedUpdates = HOMELAB_TELEGRAM_BOTS.infoBot.allowedUpdates,
}) {
  if (!secretToken || typeof secretToken !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(secretToken)) {
    throw new Error("Telegram webhook secret_token must be 32-256 characters matching [A-Za-z0-9_-]");
  }
  return {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: [...allowedUpdates],
    drop_pending_updates: false,
    max_connections: 20,
  };
}

/**
 * Signs a commit-SHA-bound callback action (`p|<a|r>|<draftId16>|<sha10>|<sig16>`)
 * or legacy (`hlc-pub|<approve|reject>|<shortSlug>|<sig16>`) within Telegram's 64-byte limit.
 */
export function signTelegramCallback({ action, slug, draftId, commitSha, secret }) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Missing callback secret for HMAC signing");
  }
  if (action === "unpublish" || action === "u" || action === "confirm_unpublish" || action === "cu") {
    const id16 = String(draftId).slice(0, 16);
    const code = action === "confirm_unpublish" || action === "cu" ? "cu" : "u";
    const sig = crypto
      .createHmac("sha256", secret)
      .update(`u|${code}|${id16}`, "utf8")
      .digest("hex")
      .slice(0, 16);
    return `u|${code}|${id16}|${sig}`;
  }
  if (commitSha && draftId) {
    const shortAction = action === "approve" || action === "a" ? "a" : "r";
    const id16 = String(draftId).slice(0, 16);
    const sha10 = String(commitSha).slice(0, 10);
    const fullSha = String(commitSha);
    const sig = crypto
      .createHmac("sha256", secret)
      .update(`p|${shortAction}|${id16}|${sha10}|${fullSha}`, "utf8")
      .digest("hex")
      .slice(0, 16);
    return `p|${shortAction}|${id16}|${sha10}|${sig}`;
  }
  const prefix = HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix;
  const shortSlug = String(slug ?? "").slice(0, 28);
  const payload = `${prefix}|${action}|${shortSlug}`;
  const sig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex").slice(0, 16);
  return `${payload}|${sig}`;
}

/**
 * Builds concise, human-readable Ukrainian approval messages (with zero technical noise)
 * for all authorized family members, linking directly to the GitHub Draft PR.
 */
export function buildUkrainianApprovalNotifications({
  draft,
  prNumber,
  prUrl,
  draftPrNumber,
  draftPrUrl,
  reviewedCommitSha,
  authorizedUsers,
  callbackSecret,
}) {
  const finalPrUrl = draftPrUrl || prUrl;
  const finalPrNumber = draftPrNumber || prNumber;
  if (!finalPrUrl || !reviewedCommitSha) {
    throw new Error("Draft PR URL and reviewedCommitSha are required before sending Telegram approval prompts");
  }
  const users = Array.isArray(authorizedUsers) && authorizedUsers.length > 0
    ? authorizedUsers.map(String)
    : [];
  if (users.length === 0) {
    throw new Error("At least one authorized user ID is required");
  }
  const draftId = draft.draftId || crypto.createHash("sha256").update(draft.slug, "utf8").digest("hex").slice(0, 16);
  const approveData = signTelegramCallback({
    action: "approve",
    draftId,
    commitSha: reviewedCommitSha,
    secret: callbackSecret,
  });
  const rejectData = signTelegramCallback({
    action: "reject",
    draftId,
    commitSha: reviewedCommitSha,
    secret: callbackSecret,
  });

  const text = [
    `📰 *Нова стаття для сайту HomeLabCore*`,
    ``,
    `*Проєкт:* ${draft.projectName || "HomeLabCore"}`,
    `*Заголовок:* ${draft.title}`,
    `*Дата події:* ${draft.publishedAt || "Сьогодні"}`,
    ``,
    `*Короткий зміст:*`,
    `${draft.shortSummary || draft.description}`,
    ``,
    `🔗 [Переглянути повний текст статті у чернетці PR #${finalPrNumber}](${finalPrUrl})`,
    ``,
    `Оберіть дію після перегляду статті:`,
  ].join("\n");

  return users.map((chatId) => ({
    chat_id: String(chatId),
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    text,
    shortSlug: draftId,
    draftId,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Схвалити та опублікувати", callback_data: approveData },
          { text: "🛑 Відхилити", callback_data: rejectData },
        ],
      ],
    },
  }));
}

/**
 * Backward-compatible single-chat wrapper around buildUkrainianApprovalNotifications.
 */
export function buildTelegramApprovalRequest({
  draft,
  chatId,
  callbackSecret,
  prNumber = 1,
  prUrl = "https://github.com/HomeLab-NL/HomeLabCore-Web/pulls",
  reviewedCommitSha = null,
}) {
  if (reviewedCommitSha) {
    return buildUkrainianApprovalNotifications({
      draft,
      prNumber,
      prUrl,
      reviewedCommitSha,
      authorizedUsers: [chatId],
      callbackSecret,
    })[0];
  }
  const approveData = signTelegramCallback({ action: "approve", slug: draft.slug, secret: callbackSecret });
  const rejectData = signTelegramCallback({ action: "reject", slug: draft.slug, secret: callbackSecret });
  return {
    chat_id: String(chatId),
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    text: [
      `📰 *Нова стаття для сайту HomeLabCore*`,
      ``,
      `*Проєкт:* ${draft.projectName || "HomeLabCore"}`,
      `*Заголовок:* ${draft.title}`,
      ``,
      `*Короткий зміст:*`,
      `${draft.shortSummary || draft.description}`,
      ``,
      `🔗 [Переглянути повний текст статті у чернетці PR #${finalPrNumber}](${finalPrUrl})`,
      ``,
      `Оберіть дію після перегляду статті:`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Схвалити та опублікувати", callback_data: approveData },
          { text: "🛑 Відхилити", callback_data: rejectData },
        ],
      ],
    },
  };
}

/**
 * Handles `/start` or `/enroll` messages from a family member.
 * NEVER grants approval rights automatically — always requires explicit Owner confirmation.
 */
export function processSpouseEnrollmentRequest({
  update,
  ownerId,
  ownerUserId,
  authorizedUsers = [],
  pendingEnrollments = {},
  callbackSecret,
}) {
  const actualOwnerId = ownerId || ownerUserId;
  const msg = update?.message;
  if (!msg || msg.chat?.type !== "private") {
    return { handled: false, reason: "Not a private chat message" };
  }
  const text = String(msg.text ?? "").trim();
  if (!/^\/(?:start|enroll)\b/i.test(text)) {
    return { handled: false, reason: "Not a /start or /enroll command" };
  }
  const senderId = String(msg.from?.id ?? "");
  const chatId = String(msg.chat?.id ?? "");
  if (!senderId || senderId !== chatId) {
    return { handled: false, reason: "Invalid sender/chat ID" };
  }
  const authSet = new Set([String(actualOwnerId), ...authorizedUsers.map(String)]);
  if (authSet.has(senderId)) {
    return {
      handled: true,
      status: "already-authorized",
      alreadyAuthorized: true,
      grantsApprovalRightsImmediately: false,
      candidateReply: {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: "👋 Вітаємо в *HomeLab Info*! Ви вже маєте підтверджений доступ до перегляду та схвалення публікацій на сайті HomeLabCore.dev.",
      },
      candidateMessage: {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: "👋 Вітаємо в *HomeLab Info*! Ви вже маєте підтверджений доступ до перегляду та схвалення публікацій на сайті HomeLabCore.dev.",
      },
    };
  }

  const firstName = String(msg.from?.first_name || "Член родини").replace(/[*_`[\]]/g, "");
  pendingEnrollments[senderId] = {
    userId: senderId,
    chatId,
    firstName,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };

  const approveSig = crypto
    .createHmac("sha256", callbackSecret)
    .update(`e|a|${senderId}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  const rejectSig = crypto
    .createHmac("sha256", callbackSecret)
    .update(`e|r|${senderId}`, "utf8")
    .digest("hex")
    .slice(0, 16);

  const candidateReply = {
    chat_id: chatId,
    parse_mode: "Markdown",
    text: "👋 Запит на сімейний доступ до публікацій *HomeLabCore.dev* надіслано власнику на підтвердження. Доки власник не підтвердить запит, права на схвалення статей не надаються.",
  };
  const ownerConfirmationPrompt = {
    chat_id: String(actualOwnerId),
    parse_mode: "Markdown",
    text: [
      `🔐 *Запит на сімейний доступ (HomeLabCore.dev)*`,
      ``,
      `Користувач *${firstName}* надіслав команду \`/start\` і просить доступ до отримання та схвалення нових статей сайту.`,
      ``,
      `Надати права схвалення публікацій?`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Підтвердити доступ", callback_data: `e|a|${senderId}|${approveSig}` },
          { text: "🛑 Відхилити запит", callback_data: `e|r|${senderId}|${rejectSig}` },
        ],
      ],
    },
  };

  return {
    handled: true,
    status: "pending-owner-confirmation",
    alreadyAuthorized: false,
    grantsApprovalRightsImmediately: false,
    candidateId: senderId,
    candidateReply,
    candidateMessage: candidateReply,
    ownerConfirmationPrompt,
    ownerConfirmationMessage: ownerConfirmationPrompt,
  };
}

/**
 * Processes the Owner's explicit confirmation or rejection of a spouse enrollment request.
 * Only the primary Owner (`ownerId`) can confirm or reject enrollment.
 */
export function confirmSpouseEnrollment({
  update,
  ownerId,
  ownerUserId,
  authorizedUsers = [],
  pendingEnrollments = {},
  callbackSecret,
}) {
  const actualOwnerId = ownerId || ownerUserId;
  const cb = update?.callback_query;
  const rawData = String(cb?.data ?? "");
  if (!cb || !rawData.startsWith("e|")) {
    return { authorized: false, reason: "Not an enrollment callback" };
  }
  const actorId = String(cb.from?.id ?? "");
  const chatId = String(cb.message?.chat?.id ?? "");
  if (cb.message?.chat?.type !== "private" || actorId !== String(actualOwnerId) || chatId !== String(actualOwnerId)) {
    return { authorized: false, reason: "Only the primary owner can confirm or reject family enrollment" };
  }
  const parts = rawData.split("|");
  if (parts.length !== 4) {
    return { authorized: false, reason: "Malformed enrollment callback_data" };
  }
  const [, shortAction, candidateId, sig] = parts;
  if (!["a", "r"].includes(shortAction)) {
    return { authorized: false, reason: "Invalid enrollment action" };
  }
  const expectedSig = crypto
    .createHmac("sha256", callbackSecret)
    .update(`e|${shortAction}|${candidateId}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { authorized: false, reason: "Invalid enrollment HMAC signature" };
  }
  const record = pendingEnrollments[candidateId];
  if (!record || record.status !== "pending") {
    return { authorized: false, alreadyProcessed: true, reason: "Enrollment request is not pending" };
  }

  const approved = shortAction === "a";
  record.status = approved ? "approved" : "rejected";
  record.decidedAt = new Date().toISOString();

  if (approved && !authorizedUsers.includes(candidateId)) {
    authorizedUsers.push(candidateId);
  }
  const updatedUsers = Array.from(new Set([String(actualOwnerId), ...authorizedUsers.map(String)]));

  const candidateNotification = approved
    ? {
        chat_id: candidateId,
        parse_mode: "Markdown",
        text: "✅ *Доступ підтверджено!* Тепер ви отримуватимете сповіщення про нові статті для сайту HomeLabCore.dev і зможете схвалювати або відхиляти їх публікацію.",
      }
    : null;

  return {
    authorized: true,
    decision: approved ? "approve" : "reject",
    approved,
    candidateId,
    authorizedUsers: updatedUsers,
    ownerEditMessage: {
      chat_id: String(actualOwnerId),
      message_id: cb.message?.message_id,
      parse_mode: "Markdown",
      text: approved
        ? `✅ *Сімейний доступ надано:* користувач *${record.firstName}* тепер отримуватиме сповіщення про нові чернетки статей та зможе їх схвалювати або відхиляти.`
        : `🛑 *Запит на сімейний доступ відхилено* (${record.firstName}).`,
      reply_markup: { inline_keyboard: [] },
    },
    candidateNotification,
    spouseNotificationMessage: candidateNotification,
  };
}

/**
 * Verifies a Telegram webhook callback query received from HomeLab Info (@Home_Lab_info_bot).
 * Supports both authorized family members (`allowedUsers`), commit-SHA-bound callbacks,
 * and first-valid-decision-wins locking.
 */
export function verifyTelegramApproval({
  update,
  secretTokenHeader,
  expectedWebhookSecret,
  allowedChatId,
  allowedUserId,
  allowedUsers = null,
  authorizedUsers = null,
  callbackSecret,
  seenUpdateIds = null,
  pendingDrafts = null,
}) {
  if (!secretTokenHeader || !expectedWebhookSecret) {
    return { authorized: false, reason: "Missing Telegram webhook secret token" };
  }
  const expectedBuf = Buffer.from(String(expectedWebhookSecret), "utf8");
  const actualBuf = Buffer.from(String(secretTokenHeader), "utf8");
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { authorized: false, reason: "Invalid Telegram webhook secret token" };
  }

  if (seenUpdateIds instanceof Set && update?.update_id !== undefined) {
    if (seenUpdateIds.has(update.update_id)) {
      return { authorized: false, duplicateUpdate: true, reason: "Duplicate Telegram update_id replay ignored" };
    }
  }

  const cb = update?.callback_query;
  if (!cb) {
    return { authorized: false, ignored: true, reason: "No callback_query in Telegram update" };
  }

  const rawData = String(cb.data ?? "");
  const isV2 = rawData.startsWith("p|");
  const isUnpublish = rawData.startsWith("u|");
  const isLegacy = rawData.startsWith(`${HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix}|`);
  if (!isV2 && !isLegacy && !isUnpublish) {
    return { authorized: false, ignored: true, reason: "Callback data outside publication namespace" };
  }

  const senderBot = cb.message?.from;
  if (senderBot?.id !== undefined && Number(senderBot.id) !== HOMELAB_TELEGRAM_BOTS.infoBot.id) {
    return { authorized: false, reason: "Callback message did not originate from HomeLab Info bot" };
  }
  if (senderBot?.username && senderBot.username !== HOMELAB_TELEGRAM_BOTS.infoBot.username) {
    return { authorized: false, reason: "Callback message bot username mismatch" };
  }

  const chatType = cb.message?.chat?.type;
  if (chatType && chatType !== "private") {
    return { authorized: false, reason: "Publication approvals are restricted to private chats" };
  }

  const chatId = String(cb.message?.chat?.id ?? "");
  const userId = String(cb.from?.id ?? "");
  const candidateUsers = authorizedUsers || allowedUsers;
  const validUserSet = new Set(
    Array.isArray(candidateUsers) && candidateUsers.length > 0
      ? candidateUsers.map(String)
      : [allowedChatId, allowedUserId].filter(Boolean).map(String),
  );
  if (!chatId || !userId || chatId !== userId || !validUserSet.has(userId)) {
    return { authorized: false, reason: "Unauthorized Telegram chat or user ID" };
  }

  let decision = "";
  let shortSlug = "";
  let reviewedCommitSha = null;

  if (isUnpublish) {
    const parts = rawData.split("|");
    if (parts.length !== 4) {
      return { authorized: false, reason: "Malformed unpublish callback_data" };
    }
    const [, uAction, draftId, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", callbackSecret)
      .update(`u|${uAction}|${draftId}`, "utf8")
      .digest("hex")
      .slice(0, 16);
    const sigBuf = Buffer.from(sig, "utf8");
    const expSigBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { authorized: false, reason: "Invalid unpublish callback HMAC signature" };
    }

    const isConfirmed = uAction === "cu";
    const draftRecord = pendingDrafts ? pendingDrafts[draftId] : null;

    if (!isConfirmed) {
      // Step 1: prompt for confirmation
      const confirmCb = signTelegramCallback({ action: "confirm_unpublish", draftId, secret: callbackSecret });
      const cancelCb = signTelegramCallback({ action: "reject", draftId, commitSha: "cancel", secret: callbackSecret });
      return {
        authorized: true,
        decision: "unpublish_prompt",
        draftId,
        actorUserId: userId,
        shortSlug: draftId,
        callbackQueryId: cb.id ?? null,
        messageId: cb.message?.message_id ?? null,
        confirmationPrompt: {
          chat_id: chatId,
          message_id: cb.message?.message_id,
          parse_mode: "Markdown",
          text: `⚠️ *Підтвердження відкликання публікації*\n\nВи дійсно бажаєте видалити цю статтю з сайту HomeLabCore.dev та RSS-стрічки?`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔴 Так, видалити з сайту", callback_data: confirmCb },
                { text: "❌ Скасувати", callback_data: cancelCb },
              ],
            ],
          },
        },
      };
    }

    // Step 2: Confirmed unpublish execution
    if (draftRecord) {
      if (draftRecord.unpublishStatus === "in_progress" || draftRecord.unpublishStatus === "completed") {
        return {
          authorized: false,
          alreadyDecided: true,
          idempotent: true,
          reason: "Unpublish operation already in progress or completed for this article",
        };
      }
      draftRecord.unpublishStatus = "in_progress";
      draftRecord.unpublishedBy = userId;
      draftRecord.unpublishedAt = new Date().toISOString();
    }

    const targetSlug = draftRecord?.slug || draftId;
    const targetFiles = [
      `src/content/blog/${targetSlug}.md`,
      `src/content/blog/uk/${targetSlug}.md`,
      `src/content/blog/nl/${targetSlug}.md`,
    ];

    return {
      authorized: true,
      decision: "unpublish_confirmed",
      draftId,
      actorUserId: userId,
      slug: targetSlug,
      filePath: draftRecord?.filePath || `src/content/blog/${targetSlug}.md`,
      targetFiles,
      reviewedCommitSha: draftRecord?.reviewedCommitSha || null,
      shortSlug: draftId,
      callbackQueryId: cb.id ?? null,
      messageId: cb.message?.message_id ?? null,
    };
  }

  if (isV2) {
    const parts = rawData.split("|");
    if (parts.length !== 5) {
      return { authorized: false, reason: "Malformed v2 publication callback_data" };
    }
    const [, shortAction, draftId, sha10, sig] = parts;
    if (!["a", "r"].includes(shortAction)) {
      return { authorized: false, reason: `Unsupported callback action: ${shortAction}` };
    }
    decision = shortAction === "a" ? "approve" : "reject";
    shortSlug = draftId;

    const draftRecord = pendingDrafts ? pendingDrafts[draftId] : null;
    if (pendingDrafts && !draftRecord) {
      return { authorized: false, staleCallback: true, reason: "Unknown or expired publication draft" };
    }
    const fullSha = draftRecord?.reviewedCommitSha ?? sha10;
    reviewedCommitSha = fullSha;
    if (!String(fullSha).startsWith(sha10)) {
      return { authorized: false, shaMismatch: true, reason: "Callback commit SHA prefix does not match pending draft" };
    }
    const expectedCb = signTelegramCallback({
      action: decision,
      draftId,
      commitSha: fullSha,
      secret: callbackSecret,
    });
    const expectedSig = expectedCb.split("|")[4];
    const sigBuf = Buffer.from(sig, "utf8");
    const expSigBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { authorized: false, reason: "Invalid callback_data HMAC signature" };
    }

    if (draftRecord) {
      if (draftRecord.status !== "pending" && draftRecord.status !== "pending_approval") {
        if (seenUpdateIds instanceof Set && update?.update_id !== undefined) {
          seenUpdateIds.add(update.update_id);
        }
        return {
          authorized: false,
          staleOrResolved: true,
          alreadyDecided: true,
          previousDecision: draftRecord.status,
          decidedBy: draftRecord.decidedBy,
          reason: "First valid approval or rejection already recorded for this draft",
        };
      }
      draftRecord.status = decision === "approve" ? "approved" : "rejected";
      draftRecord.decidedBy = userId;
      draftRecord.decidedAt = new Date().toISOString();
    }
  } else {
    const parts = rawData.split("|");
    if (parts.length !== 4) {
      return { authorized: false, reason: "Malformed hlc-pub callback_data" };
    }
    const [ns, action, slugPart, sig] = parts;
    if (ns !== HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix || !["approve", "reject"].includes(action)) {
      return { authorized: false, reason: `Unsupported callback action: ${action}` };
    }
    const expectedCallback = signTelegramCallback({ action, slug: slugPart, secret: callbackSecret });
    const expectedSig = expectedCallback.split("|")[3];
    const sigBuf = Buffer.from(sig, "utf8");
    const expSigBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { authorized: false, reason: "Invalid callback_data HMAC signature" };
    }
    decision = action;
    shortSlug = slugPart;
  }

  if (seenUpdateIds instanceof Set && update?.update_id !== undefined) {
    seenUpdateIds.add(update.update_id);
  }

  return {
    authorized: true,
    decision,
    shortSlug,
    reviewedCommitSha,
    reviewerId: userId,
    actorUserId: userId,
    callbackQueryId: cb.id ?? null,
    messageId: cb.message?.message_id ?? null,
  };
}

/**
 * Builds the Telegram callback acknowledgement and button-invalidation updates
 * for ALL notified family members (`notifiedMessages = [{ chatId, messageId }, ...]`).
 */
export function buildTelegramCallbackResponse({
  verification,
  chatId,
  prUrl = null,
  prNumber = null,
  draft = null,
  notifiedMessages = null,
}) {
  if (!verification?.authorized) {
    throw new Error("Cannot build callback response for unauthorized verification");
  }
  const isApproved = verification.decision === "approve";
  const toastText = isApproved
    ? "✅ Схвалено — перевіряємо CI та публікуємо статтю на сайт"
    : "🛑 Відхилено — чернетку PR буде закрито";
  const statusLine = isApproved
    ? `✅ *Статус:* Схвалено — виконується перевірка та публікація на сайт...`
    : `🛑 *Статус:* Відхилено — чернетку скасовано, стаття не публікуватиметься.`;

  const targets = Array.isArray(notifiedMessages) && notifiedMessages.length > 0
    ? notifiedMessages
    : [{ chatId: String(chatId), messageId: verification.messageId }];

  const updatedText = draft
    ? [
        `📰 *Нова стаття для сайту HomeLabCore*`,
        ``,
        `*Проєкт:* ${draft.projectName || "HomeLabCore"}`,
        `*Заголовок:* ${draft.title}`,
        ...(prUrl ? [`🔗 [Чернетка PR${prNumber ? ` #${prNumber}` : ""}](${prUrl})`] : []),
        ``,
        statusLine,
      ].join("\n")
    : statusLine;

  return {
    shouldCreatePullRequest: isApproved,
    shouldMergePullRequest: isApproved,
    answerCallbackQuery: {
      callback_query_id: verification.callbackQueryId,
      text: toastText,
      show_alert: false,
    },
    editMessageReplyMarkup: {
      chat_id: String(chatId),
      message_id: verification.messageId,
      reply_markup: { inline_keyboard: [] },
    },
    editAllNotifiedMessages: targets.map((m) => ({
      chat_id: String(m.chatId),
      message_id: m.messageId,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      text: updatedText,
      reply_markup: { inline_keyboard: [] },
    })),
    statusSummary: statusLine,
  };
}

/**
 * Revalidates exact reviewed commit SHA and CI check status before merging an approved Draft PR.
 * Ensures modified-after-approval or failing-CI content is NEVER merged.
 */
export function validateMergeReadiness({ draft, reviewedCommitSha, prData, checkRuns = [], checkRunsData = null }) {
  const expectedSha = String(reviewedCommitSha || draft?.reviewedCommitSha || "");
  const runs = Array.isArray(checkRuns) && checkRuns.length > 0
    ? checkRuns
    : Array.isArray(checkRunsData?.check_runs)
      ? checkRunsData.check_runs
      : [];

  if (draft && draft.status !== "approved") {
    return { ready: false, readyToMerge: false, reason: "Draft is not in approved state" };
  }
  if (!prData || prData.state !== "open") {
    return { ready: false, readyToMerge: false, reason: "Pull Request is not open" };
  }
  const actualHeadSha = String(prData.head?.sha ?? "");
  if (!actualHeadSha || actualHeadSha !== expectedSha) {
    return {
      ready: false,
      readyToMerge: false,
      shaMismatch: true,
      reason: "Вміст PR було змінено після відправки на перевірку (SHA коміту не збігається з перевіреним).",
    };
  }

  if (runs.length === 0) {
    return {
      ready: false,
      readyToMerge: false,
      ciPending: true,
      reason: "Перевірки CI ще не розпочалися для цього коміту.",
    };
  }
  const failing = runs.filter(
    (r) => r.status === "completed" && !["success", "neutral", "skipped"].includes(String(r.conclusion ?? "")),
  );
  if (failing.length > 0) {
    return {
      ready: false,
      readyToMerge: false,
      ciFailed: true,
      reason: `Перевірка CI завершилася помилкою (${failing.map((f) => f.name).join(", ")}).`,
    };
  }
  const pending = runs.filter((r) => r.status !== "completed");
  if (pending.length > 0) {
    return {
      ready: false,
      readyToMerge: false,
      ciPending: true,
      reason: `Перевірки CI ще виконуються (${pending.map((p) => p.name).join(", ")}).`,
    };
  }

  return {
    ready: true,
    readyToMerge: true,
    mergeSpec: {
      prNumber: prData.number,
      sha: expectedSha,
      merge_method: "squash",
    },
    liveUrl: draft?.liveUrl || `https://homelabcore.dev/blog/${draft?.slug || ""}/`,
  };
}

/**
 * Builds the final Ukrainian notification sent to all authorized family members
 * after publication succeeds, is rejected, or encounters an auto-merge error.
 */
export function buildUkrainianFinalNotification({
  outcome,
  draft,
  projectName,
  title,
  slug,
  draftPrUrl,
  reason,
  prNumber,
  prUrl,
  liveUrl,
  errorReason = "",
  authorizedUsers = [],
  callbackSecret = null,
}) {
  const users = Array.isArray(authorizedUsers) ? authorizedUsers.map(String) : [];
  const finalProjectName = projectName || draft?.projectName || "HomeLabCore";
  const finalTitle = title || draft?.title || "";
  const finalSlug = slug || draft?.slug || "";
  const finalPrUrl = draftPrUrl || prUrl || "";
  const finalReason = reason || errorReason || "";
  let text = "";
  if (outcome === "published") {
    const finalLiveUrl = liveUrl || draft?.liveUrl || (finalSlug ? `https://homelabcore.dev/blog/${finalSlug}/` : "https://homelabcore.dev/blog/");
    text = [
      `🚀 *Статтю опубліковано на HomeLabCore.dev!*`,
      ``,
      `*Проєкт:* ${finalProjectName}`,
      `*Заголовок:* ${finalTitle}`,
      ``,
      `🌐 *Читати на сайті:* ${finalLiveUrl}`,
      ...(finalPrUrl ? [`🔗 [Переглянути PR${prNumber ? ` #${prNumber}` : ""}](${finalPrUrl})`] : []),
    ].join("\n");

    const draftId = draft?.draftId || (finalSlug ? crypto.createHash("sha256").update(finalSlug, "utf8").digest("hex").slice(0, 16) : "");
    const replyMarkup = callbackSecret && draftId
      ? {
          inline_keyboard: [
            [
              {
                text: "↩️ Скасувати публікацію",
                callback_data: signTelegramCallback({
                  action: "unpublish",
                  draftId,
                  commitSha: draft?.reviewedCommitSha || "head",
                  secret: callbackSecret,
                }),
              },
            ],
          ],
        }
      : undefined;

    return users.map((chatId) => ({
      chat_id: chatId,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }));
  } else if (outcome === "rejected") {
    text = [
      `🛑 *Публікацію скасовано*`,
      ``,
      `*Проєкт:* ${finalProjectName}`,
      `*Заголовок:* ${finalTitle}`,
      ``,
      `Чернетку ${finalPrUrl ? `[PR #${prNumber || ""}](${finalPrUrl})` : "PR"} закрито, стаття не була опублікована.`,
    ].join("\n");
  } else {
    text = [
      `⚠️ *Автоматичне злиття призупинено*`,
      ``,
      `*Проєкт:* ${finalProjectName}`,
      `*Заголовок:* ${finalTitle}`,
      ...(finalReason ? [`*Причина:* ${finalReason.trim()}`] : []),
      ``,
      `🔗 Перевірте PR вручну: ${finalPrUrl}`,
    ].join("\n");
  }

  return users.map((chatId) => ({
    chat_id: chatId,
    parse_mode: "Markdown",
    disable_web_page_preview: false,
    text,
  }));
}

/**
 * Prepares the isolated GitHub Draft PR specification for a verified draft.
 * Created as a Draft PR (`draft: true`) before Telegram review so family members
 * can read the exact full article before approving.
 */
export function prepareIsolatedPullRequestSpec({ draft }) {
  assertTrilingualPublicationCompleteness(draft);
  const branchName = `auton-pub/${draft.slug}`;
  const files = draft.files || [
    { filePath: draft.filePath, content: draft.markdown, lang: "en" },
    { filePath: draft.filePathUk || `src/content/blog/uk/${draft.slug}.md`, content: draft.markdownUk || draft.markdown, lang: "uk" },
    { filePath: draft.filePathNl || `src/content/blog/nl/${draft.slug}.md`, content: draft.markdownNl || draft.markdown, lang: "nl" },
  ];
  return {
    baseBranch: "main",
    headBranch: branchName,
    filePath: draft.filePath,
    filePathUk: draft.filePathUk || `src/content/blog/uk/${draft.slug}.md`,
    filePathNl: draft.filePathNl || `src/content/blog/nl/${draft.slug}.md`,
    files,
    isDraft: true,
    commitMessage: `docs(blog): publish ${draft.title} [automated trilingual]`,
    prTitle: `docs(blog): ${draft.title} (EN/UK/NL)`,
    prBody: [
      `## Чернетка публікації блогу / Automated Publication Draft (EN / UK / NL)`,
      ``,
      `- **Проєкт / Project:** ${draft.projectName || "HomeLabCore"}`,
      `- **Заголовок / Title:** ${draft.title}`,
      `- **Файли публікації / Trilingual Target Files:**`,
      `  - EN: \`${draft.filePath}\``,
      `  - UK: \`${draft.filePathUk || `src/content/blog/uk/${draft.slug}.md`}\``,
      `  - NL: \`${draft.filePathNl || `src/content/blog/nl/${draft.slug}.md`}\``,
      `- **Канал схвалення / Approval Channel:** HomeLab Info (\`@Home_Lab_info_bot\`)`,
      ``,
      `### Короткий зміст / Summary`,
      `${draft.shortSummary || draft.description}`,
      ``,
      `### Перевірка та публікація / Validation & Merge Policy`,
      `- [x] Підпис GitHub Webhook HMAC-SHA256 перевірено`,
      `- [x] Перевірку безпеки (відсутність секретів та приватних IP) пройдено`,
      `- [x] Усі три мовні версії (EN, UK, NL) згенеровані та перевірені`,
      `- [ ] Очікує схвалення власника або авторизованого члена родини в Telegram (\`@Home_Lab_info_bot\`)`,
      `- [ ] Перевірка точного SHA коміту та CI (\`build-and-test\`, \`Cloudflare Pages\`) перед автоматичним злиттям`,
    ].join("\n"),
    requiresOwnerMergeApproval: true,
    autoMerge: false,
  };
}

export function prepareUnpublishPullRequestSpec({ draft, targetFilePath, initiatedBy }) {
  const filePath = targetFilePath || draft?.filePath;
  const slug = draft?.slug || (filePath ? filePath.split("/").pop().replace(/\.md$/, "") : "article");
  const branchName = `rollback/unpublish-${slug}`;
  const title = draft?.title || slug;
  const targetFiles = [
    `src/content/blog/${slug}.md`,
    `src/content/blog/uk/${slug}.md`,
    `src/content/blog/nl/${slug}.md`,
  ];
  return {
    baseBranch: "main",
    headBranch: branchName,
    filePath,
    targetArticleSlug: slug,
    targetFiles,
    isDraft: false,
    commitMessage: `fix(blog): unpublish ${title} [automated undo]`,
    prTitle: `fix(blog): unpublish ${title} (EN/UK/NL)`,
    prBody: [
      `## Відкликання публікації статті / Automated Article Unpublish`,
      ``,
      `- **Проєкт / Project:** ${draft?.projectName || "HomeLabCore"}`,
      `- **Заголовок / Title:** ${title}`,
      `- **Цільові файли для видалення / Target Files:**`,
      `  - EN: \`src/content/blog/${slug}.md\``,
      `  - UK: \`src/content/blog/uk/${slug}.md\``,
      `  - NL: \`src/content/blog/nl/${slug}.md\``,
      `- **Ініціатор відкликання / Initiated By:** ${initiatedBy || "Authorized Family Member"}`,
      `- **Вихідна подія / Source Event:** \`${draft?.sourceEventId || "N/A"}\``,
      ``,
      `### Аудит та можливість відновлення / Audit & Restoration`,
      `- Даний PR видаляє всі три мовні версії (EN, UK, NL) зазначеної статті, не зачіпаючи інший вміст сайту.`,
      `- Історія та вміст збережені в історії комітів Git для можливості відновлення за потреби.`,
      `- Злиття виконується автоматично після успішного проходження CI тестів та деплою.`,
    ].join("\n"),
  };
}
