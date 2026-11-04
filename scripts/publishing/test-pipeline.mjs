// Automated validation suite for the HomeLabCore autonomous publishing pipeline,
// HomeLab Info (@Home_Lab_info_bot) integration, and importable n8n workflow JSON.
// Run: npm run test:publishing

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  HOMELAB_TELEGRAM_BOTS,
  SecurityPolicyError,
  assertNoSensitiveData,
  buildHomeLabInfoWebhookSpec,
  buildTelegramApprovalRequest,
  buildTelegramCallbackResponse,
  classifyGitHubEvent,
  generateArticleDraft,
  isDuplicateEvent,
  prepareIsolatedPullRequestSpec,
  verifyGitHubSignature,
  verifyTelegramApproval,
  verifyTelegramBotConsumerSafety,
} from "./pipeline.mjs";

const WEBHOOK_SECRET = "test-webhook-secret-do-not-use-in-prod";
const TG_WEBHOOK_SECRET = "test_homelab_info_webhook_secret_token_32chars";
const TG_CALLBACK_SECRET = "test-homelab-info-callback-secret";
const OWNER_CHAT_ID = "900100200";
const OWNER_USER_ID = "900100200";

function signPayload(payloadObj, secret = WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(payloadObj);
  const hex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return { rawBody, signatureHeader: `sha256=${hex}` };
}

console.log("=== Scenario A: Automated Publishing & HomeLab Info Bot Integration Validation ===");

// 1. Validate n8n workflow JSON structure, HomeLab Info bindings, and security
const workflowPath = path.resolve("automation/n8n/homelabcore-autonomous-publishing.workflow.json");
assert.ok(fs.existsSync(workflowPath), "n8n workflow JSON must exist");
const wfRaw = fs.readFileSync(workflowPath, "utf8");
assertNoSensitiveData(wfRaw);
const wf = JSON.parse(wfRaw);
assert.equal(wf.active, false, "n8n workflow must default to inactive until owner enables it");
assert.ok(Array.isArray(wf.nodes) && wf.nodes.length >= 10, "n8n workflow must define all pipeline nodes");
assert.ok(wfRaw.includes("homelab-info-web-approval"), "n8n workflow must use dedicated HomeLab Info webhook path");
assert.ok(wfRaw.includes("HOMELAB_INFO_BOT_TOKEN"), "n8n workflow must reference HOMELAB_INFO_BOT_TOKEN");
assert.ok(!wfRaw.includes("telegram-p0-gateway"), "n8n workflow must never collide with telegram-p0-gateway");
console.log("✓ 1. n8n workflow JSON valid, bound to HomeLab Info, inactive by default, and free of secrets/private IPs");

// 2. Webhook signature verification
const releaseEventPayload = {
  action: "published",
  repository: {
    full_name: "homelabnl-alt/KeyQuest",
    html_url: "https://github.com/homelabnl-alt/KeyQuest",
  },
  release: {
    id: 501,
    tag_name: "v1.1.0",
    name: "KeyQuest 1.1.0: New Practice Drills",
    draft: false,
    prerelease: false,
    published_at: "2026-11-04T12:00:00Z",
    html_url: "https://github.com/homelabnl-alt/KeyQuest/releases/tag/v1.1.0",
    body: "Published new keyboard practice drills for children.\n- Added custom word practice drills\n- Improved on-screen keyboard accessibility",
  },
};
const { rawBody, signatureHeader } = signPayload(releaseEventPayload);
assert.equal(verifyGitHubSignature({ rawBody, signatureHeader, secret: WEBHOOK_SECRET }), true);
assert.equal(verifyGitHubSignature({ rawBody, signatureHeader: "sha256=deadbeef", secret: WEBHOOK_SECRET }), false);
assert.equal(verifyGitHubSignature({ rawBody, signatureHeader, secret: "wrong-secret" }), false);
console.log("✓ 2. GitHub webhook HMAC-SHA256 signature verification passed");

// 3. Event classification: accept published release & [publish] milestone; ignore routine commits & minor bugfixes
const classifiedRelease = classifyGitHubEvent({ eventType: "release", payload: releaseEventPayload });
assert.equal(classifiedRelease.eligible, true);
assert.equal(classifiedRelease.category, "release");
assert.equal(classifiedRelease.project?.id, "keyboard-trainer");
assert.equal(classifiedRelease.sourceEventId, "homelabnl-alt/KeyQuest#release:v1.1.0");

const routinePush = classifyGitHubEvent({
  eventType: "push",
  payload: { ref: "refs/heads/main", commits: [{ message: "fix: typo in button label" }] },
});
assert.equal(routinePush.eligible, false);

const minorBugfixRelease = classifyGitHubEvent({
  eventType: "release",
  payload: {
    action: "published",
    repository: { full_name: "HomeLab-NL/whats-for-dinner" },
    release: { tag_name: "v0.12.1", name: "fix: minor padding tweak", draft: false, prerelease: false, body: "Minor fix" },
  },
});
assert.equal(minorBugfixRelease.eligible, false);

const unmarkedMilestone = classifyGitHubEvent({
  eventType: "milestone",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/homework-tutor" },
    milestone: { number: 3, title: "Internal refactor", description: "Routine cleanup" },
  },
});
assert.equal(unmarkedMilestone.eligible, false);

const markedMilestone = classifyGitHubEvent({
  eventType: "milestone",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/homework-tutor", html_url: "https://github.com/HomeLab-NL/homework-tutor" },
    milestone: {
      number: 4,
      title: "Smart Notebook Step Hint Refinements [publish]",
      description: "[publish] Refined progressive hint clarity in the built-in sample tutoring flow.\n- Updated Level 1 hint prompts\n- Improved notebook step layout",
      closed_at: "2026-11-04T15:00:00Z",
      html_url: "https://github.com/HomeLab-NL/homework-tutor/milestone/4",
    },
  },
});
assert.equal(markedMilestone.eligible, true);
assert.equal(markedMilestone.category, "milestone");
console.log("✓ 3. Event classification: releases & [publish] milestones accepted; routine commits & minor fixes ignored");

// 4. Duplicate prevention check against src/content/blog/
assert.equal(
  isDuplicateEvent({ sourceEventId: "homelabnl-alt/KeyQuest#deployment:2026-10-28" }),
  true,
  "Existing published sourceEventId must be detected as duplicate",
);
assert.equal(
  isDuplicateEvent({ sourceEventId: classifiedRelease.sourceEventId }),
  false,
  "New release sourceEventId must not be flagged as duplicate",
);
console.log("✓ 4. Duplicate publication prevention verified against src/content/blog/");

// 5. AI draft generation & SEO / security guard
const draft = generateArticleDraft(classifiedRelease);
assert.ok(draft.description.length >= 50 && draft.description.length <= 230, "Draft description must be 50-230 chars");
assert.ok(draft.markdown.includes('project: "keyboard-trainer"'));
assert.ok(draft.markdown.includes('sourceEventId: "homelabnl-alt/KeyQuest#release:v1.1.0"'));

assert.throws(
  () => assertNoSensitiveData("Server at 192.168.1.50 with token ghp_1234567890abcdefghijklmnopqrstuv"),
  SecurityPolicyError,
  "Security guard must reject private IPs and tokens",
);
console.log("✓ 5. Concise English draft generated (50-230 char SEO description) and secret/private-IP guard verified");

// 6. HomeLab Info consumer non-conflict & Uptime Kuma / backup coexistence checks
const safeOutboundState = verifyTelegramBotConsumerSafety({
  getMeResult: { id: 8967925790, username: "Home_Lab_info_bot", first_name: "HomeLab Info" },
  webhookInfo: { url: "", pending_update_count: 0 },
  activePollers: 0,
});
assert.equal(safeOutboundState.safe, true);
assert.equal(safeOutboundState.state, "outbound-only-no-webhook");
assert.equal(safeOutboundState.canRegisterWebhook, true);
assert.equal(safeOutboundState.preservesUptimeKumaAndBackupPush, true);

const wrongAssistantBot = verifyTelegramBotConsumerSafety({
  getMeResult: { id: 8633834424, username: "homelab_core_bot", first_name: "HomeLab Assistant" },
  webhookInfo: { url: "https://n8n.homelabcore.dev/webhook/telegram-p0-gateway" },
  activePollers: 0,
});
assert.equal(wrongAssistantBot.safe, false);
assert.ok(wrongAssistantBot.reason.includes("@homelab_core_bot"));

const conflictingWebhook = verifyTelegramBotConsumerSafety({
  getMeResult: { id: 8967925790, username: "Home_Lab_info_bot" },
  webhookInfo: { url: "https://other.example.com/webhook" },
  activePollers: 0,
});
assert.equal(conflictingWebhook.safe, false);
assert.equal(conflictingWebhook.state, "conflicting-webhook");

const conflictingPoller = verifyTelegramBotConsumerSafety({
  getMeResult: { id: 8967925790, username: "Home_Lab_info_bot" },
  webhookInfo: { url: "" },
  activePollers: 1,
});
assert.equal(conflictingPoller.safe, false);

const webhookSpec = buildHomeLabInfoWebhookSpec({ secretToken: TG_WEBHOOK_SECRET });
assert.equal(webhookSpec.url, HOMELAB_TELEGRAM_BOTS.infoBot.webhookUrl);
assert.deepEqual(webhookSpec.allowed_updates, ["callback_query"]);
assert.equal(webhookSpec.drop_pending_updates, false);
console.log("✓ 6. HomeLab Info (@Home_Lab_info_bot) consumer non-conflict & Uptime Kuma/backup coexistence verified");

// 7. HomeLab Info owner-only Approve/Reject, callback namespace, and replay protection
const tgMessage = buildTelegramApprovalRequest({
  draft,
  chatId: OWNER_CHAT_ID,
  callbackSecret: TG_CALLBACK_SECRET,
});
const buttons = tgMessage.reply_markup.inline_keyboard[0];
const approveCallbackData = buttons[0].callback_data;
const rejectCallbackData = buttons[1].callback_data;
assert.ok(Buffer.byteLength(approveCallbackData, "utf8") <= 64, "approve callback_data must fit Telegram 64-byte limit");
assert.ok(Buffer.byteLength(rejectCallbackData, "utf8") <= 64, "reject callback_data must fit Telegram 64-byte limit");
assert.ok(approveCallbackData.startsWith("hlc-pub|approve|"));
assert.ok(rejectCallbackData.startsWith("hlc-pub|reject|"));

const seenUpdateIds = new Set();

const validApprove = verifyTelegramApproval({
  update: {
    update_id: 700101,
    callback_query: {
      id: "cbq-approve-1",
      from: { id: OWNER_USER_ID },
      message: {
        message_id: 42,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: OWNER_CHAT_ID, type: "private" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
});
assert.equal(validApprove.authorized, true);
assert.equal(validApprove.decision, "approve");

const approveResp = buildTelegramCallbackResponse({
  verification: validApprove,
  chatId: OWNER_CHAT_ID,
  prUrl: "https://github.com/HomeLab-NL/HomeLabCore-Web/pull/99",
});
assert.equal(approveResp.shouldCreatePullRequest, true);
assert.deepEqual(approveResp.editMessageReplyMarkup.reply_markup.inline_keyboard, []);

// Replay of the exact same update_id must be rejected
const replayedApprove = verifyTelegramApproval({
  update: {
    update_id: 700101,
    callback_query: {
      id: "cbq-approve-1",
      from: { id: OWNER_USER_ID },
      message: {
        message_id: 42,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: OWNER_CHAT_ID, type: "private" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
});
assert.equal(replayedApprove.authorized, false);
assert.equal(replayedApprove.duplicateUpdate, true);

const validReject = verifyTelegramApproval({
  update: {
    update_id: 700102,
    callback_query: {
      id: "cbq-reject-1",
      from: { id: OWNER_USER_ID },
      message: {
        message_id: 43,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: OWNER_CHAT_ID, type: "private" },
      },
      data: rejectCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
});
assert.equal(validReject.authorized, true);
assert.equal(validReject.decision, "reject");

const rejectResp = buildTelegramCallbackResponse({
  verification: validReject,
  chatId: OWNER_CHAT_ID,
});
assert.equal(rejectResp.shouldCreatePullRequest, false);

// Unauthorized user ID must be rejected
const spoofedUser = verifyTelegramApproval({
  update: {
    update_id: 700103,
    callback_query: {
      id: "cbq-spoof-1",
      from: { id: "999999999" },
      message: {
        message_id: 44,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: OWNER_CHAT_ID, type: "private" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
});
assert.equal(spoofedUser.authorized, false);

// Group chat callback must be rejected even if clicked by owner
const groupChatAttempt = verifyTelegramApproval({
  update: {
    update_id: 700104,
    callback_query: {
      id: "cbq-group-1",
      from: { id: OWNER_USER_ID },
      message: {
        message_id: 45,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: OWNER_CHAT_ID, type: "supergroup" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
});
assert.equal(groupChatAttempt.authorized, false);
console.log("✓ 7. HomeLab Info Approve/Reject, owner-only private chat restriction, and replay guard passed");

// 8. Isolated GitHub PR specification
const prSpec = prepareIsolatedPullRequestSpec({ draft });
assert.equal(prSpec.baseBranch, "main");
assert.ok(prSpec.headBranch.startsWith("auton-pub/"));
assert.equal(prSpec.autoMerge, false);
assert.equal(prSpec.requiresOwnerMergeApproval, true);
assert.ok(prSpec.prBody.includes("@Home_Lab_info_bot"));
console.log("✓ 8. Isolated GitHub PR specification verified (branch prefix auton-pub/*, autoMerge: false)");
