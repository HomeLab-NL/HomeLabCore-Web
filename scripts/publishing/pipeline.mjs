// Autonomous publishing pipeline for HomeLabCore-Web.
// Implements:
//   GitHub Event -> Signature Verification -> Release/Milestone Filter ->
//   Deduplication -> Concise English Draft + Secret/IP Guard ->
//   HomeLab Info (@Home_Lab_info_bot) Approval Verification ->
//   Isolated GitHub PR -> Build Validation -> Owner-Authorized Merge -> Cloudflare Pages.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROJECT_MAP = {
  "HomeLab-NL/whats-for-dinner": { id: "cookfrom", name: "CookFrom", tag: "CookFrom" },
  "HomeLab-NL/homework-tutor": { id: "ai-tutor", name: "Homework Tutor", tag: "Homework Tutor" },
  "homelabnl-alt/KeyQuest": { id: "keyboard-trainer", name: "KeyQuest", tag: "KeyQuest" },
  "HomeLab-NL/HomeLab-Core": { id: "agentlab", name: "AgentLab", tag: "AgentLab" },
};

/**
 * Metadata for the two Telegram bots in the HomeLab ecosystem.
 * - HomeLab Info (@Home_Lab_info_bot, id 8967925790) sends Uptime Kuma monitoring
 *   alerts (/healthz + HomeLab Backup push heartbeats) and handles HomeLabCore-Web
 *   publication approvals via webhook callback queries.
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
    allowedUpdates: Object.freeze(["callback_query"]),
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
  assertNoSensitiveData(`${event.title}\n${event.summarySource}\n${event.sourceUrl ?? ""}`);

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
 * Restricts inbound deliveries to ["callback_query"] so Uptime Kuma / backup messages
 * and plain chat messages never trigger unnecessary webhook executions.
 */
export function buildHomeLabInfoWebhookSpec({
  webhookUrl = HOMELAB_TELEGRAM_BOTS.infoBot.webhookUrl,
  secretToken,
}) {
  if (!secretToken || typeof secretToken !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(secretToken)) {
    throw new Error("Telegram webhook secret_token must be 32-256 characters matching [A-Za-z0-9_-]");
  }
  return {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: [...HOMELAB_TELEGRAM_BOTS.infoBot.allowedUpdates],
    drop_pending_updates: false,
    max_connections: 20,
  };
}

/**
 * Signs a namespaced HomeLab Info callback action (hlc-pub|action|shortSlug|sig)
 * using HMAC-SHA256 truncated to 16 hex chars so total length <= 61 bytes
 * (strictly within Telegram's 64-byte callback_data limit).
 */
export function signTelegramCallback({ action, slug, secret }) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Missing callback secret for HMAC signing");
  }
  const prefix = HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix;
  const shortSlug = String(slug ?? "").slice(0, 28);
  const payload = `${prefix}|${action}|${shortSlug}`;
  const sig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex").slice(0, 16);
  return `${payload}|${sig}`;
}

/**
 * Builds the HomeLab Info (@Home_Lab_info_bot) approval message and inline keyboard payload.
 * Formatted to coexist cleanly alongside Uptime Kuma (/healthz + HomeLab Backup) alerts.
 */
export function buildTelegramApprovalRequest({ draft, chatId, callbackSecret }) {
  const approveData = signTelegramCallback({ action: "approve", slug: draft.slug, secret: callbackSecret });
  const rejectData = signTelegramCallback({ action: "reject", slug: draft.slug, secret: callbackSecret });
  return {
    chat_id: String(chatId),
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    text: [
      `🌐 *HomeLabCore Web — Publication Approval*`,
      `_via HomeLab Info (@Home_Lab_info_bot)_`,
      ``,
      `*Title:* ${draft.title}`,
      `*Category:* \`${draft.category}\``,
      `*Branch:* \`auton-pub/${draft.slug}\``,
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
          { text: "🛑 Reject Draft", callback_data: rejectData },
        ],
      ],
    },
  };
}

/**
 * Verifies a Telegram webhook callback query received from HomeLab Info (@Home_Lab_info_bot):
 *   1. Validates X-Telegram-Bot-Api-Secret-Token header in constant time
 *   2. Rejects duplicate Telegram update_id replays when seenUpdateIds Set is provided
 *   3. Validates callback_query exists and carries the hlc-pub| namespace prefix
 *   4. Validates message origin is HomeLab Info (@Home_Lab_info_bot, id 8967925790) when present
 *   5. Restricts Approve/Reject strictly to the authorized owner's private chat & user ID
 *   6. Validates HMAC-SHA256 signature inside callback_data in constant time
 */
export function verifyTelegramApproval({
  update,
  secretTokenHeader,
  expectedWebhookSecret,
  allowedChatId,
  allowedUserId,
  callbackSecret,
  seenUpdateIds = null,
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
  const prefix = `${HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix}|`;
  if (!rawData.startsWith(prefix)) {
    return { authorized: false, ignored: true, reason: "Callback data outside hlc-pub namespace" };
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
    return { authorized: false, reason: "Publication approvals are restricted to the owner private chat" };
  }

  const chatId = String(cb.message?.chat?.id ?? "");
  const userId = String(cb.from?.id ?? "");
  if (!allowedChatId || !allowedUserId || chatId !== String(allowedChatId) || userId !== String(allowedUserId)) {
    return { authorized: false, reason: "Unauthorized Telegram chat or user ID" };
  }

  const parts = rawData.split("|");
  if (parts.length !== 4) {
    return { authorized: false, reason: "Malformed hlc-pub callback_data" };
  }
  const [ns, action, shortSlug, sig] = parts;
  if (ns !== HOMELAB_TELEGRAM_BOTS.infoBot.callbackPrefix || !["approve", "reject"].includes(action)) {
    return { authorized: false, reason: `Unsupported callback action: ${action}` };
  }

  const expectedCallback = signTelegramCallback({ action, slug: shortSlug, secret: callbackSecret });
  const expectedSig = expectedCallback.split("|")[3];
  const sigBuf = Buffer.from(sig, "utf8");
  const expSigBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
    return { authorized: false, reason: "Invalid callback_data HMAC signature" };
  }

  if (seenUpdateIds instanceof Set && update?.update_id !== undefined) {
    seenUpdateIds.add(update.update_id);
  }

  return {
    authorized: true,
    decision: action,
    shortSlug,
    reviewerId: userId,
    callbackQueryId: cb.id ?? null,
    messageId: cb.message?.message_id ?? null,
  };
}

/**
 * Builds the Telegram answerCallbackQuery and editMessageReplyMarkup payloads
 * so HomeLab Info immediately acknowledges owner Approve/Reject clicks and
 * removes the inline buttons to prevent duplicate clicks.
 */
export function buildTelegramCallbackResponse({ verification, chatId, prUrl = null }) {
  if (!verification?.authorized) {
    throw new Error("Cannot build callback response for unauthorized verification");
  }
  const isApproved = verification.decision === "approve";
  const toastText = isApproved
    ? "✅ Approved — opening isolated GitHub PR for HomeLabCore-Web"
    : "🛑 Rejected — publication draft discarded";
  const statusLine = isApproved
    ? `✅ *Approved by owner*${prUrl ? ` — [PR opened](${prUrl})` : ` (\`auton-pub/${verification.shortSlug}\`)`}`
    : `🛑 *Rejected by owner* (\`${verification.shortSlug}\` discarded)`;

  return {
    shouldCreatePullRequest: isApproved,
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
    statusSummary: statusLine,
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
      `- **Approval Channel:** HomeLab Info (\`@Home_Lab_info_bot\`)`,
      ``,
      `### Validation & Merge Policy`,
      `- [x] Webhook HMAC-SHA256 verified`,
      `- [x] Secret & private-IP guard passed`,
      `- [x] HomeLab Info (\`@Home_Lab_info_bot\`) owner approval verified`,
      `- [ ] GitHub Actions \`verify\` suite (\`astro check\`, \`npm run build\`, \`npm test\`) must pass`,
      `- [ ] Explicit owner merge authorization required before Cloudflare Pages production deployment`,
    ].join("\n"),
    requiresOwnerMergeApproval: true,
    autoMerge: false,
  };
}
