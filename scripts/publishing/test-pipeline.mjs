// Automated validation suite for the HomeLabCore autonomous publishing pipeline
// and the importable n8n workflow JSON.
// Run: npm run test:publishing

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  SecurityPolicyError,
  assertNoSensitiveData,
  buildTelegramApprovalRequest,
  classifyGitHubEvent,
  generateArticleDraft,
  isDuplicateEvent,
  prepareIsolatedPullRequestSpec,
  verifyGitHubSignature,
  verifyTelegramApproval,
} from "./pipeline.mjs";

const WEBHOOK_SECRET = "test-webhook-secret-do-not-use-in-prod";
const TG_WEBHOOK_SECRET = "test-telegram-webhook-secret";
const TG_CALLBACK_SECRET = "test-telegram-callback-secret";
const OWNER_CHAT_ID = "900100200";
const OWNER_USER_ID = "900100200";

function signPayload(payloadObj, secret = WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(payloadObj);
  const hex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return { rawBody, signatureHeader: `sha256=${hex}` };
}

console.log("=== Scenario A: Automated Publishing Pipeline Validation ===");

// 1. Validate n8n workflow JSON structure and security
const workflowPath = path.resolve("automation/n8n/homelabcore-autonomous-publishing.workflow.json");
assert.ok(fs.existsSync(workflowPath), "n8n workflow JSON must exist");
const wfRaw = fs.readFileSync(workflowPath, "utf8");
assertNoSensitiveData(wfRaw);
const wf = JSON.parse(wfRaw);
assert.equal(wf.active, false, "n8n workflow must default to inactive until owner enables it");
assert.ok(Array.isArray(wf.nodes) && wf.nodes.length >= 8, "n8n workflow must define all pipeline nodes");
console.log("✓ 1. n8n workflow JSON valid, inactive by default, and free of secrets/private IPs");

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

// 6. Telegram approval & rejection verification
const tgMessage = buildTelegramApprovalRequest({
  draft,
  chatId: OWNER_CHAT_ID,
  callbackSecret: TG_CALLBACK_SECRET,
});
const buttons = tgMessage.reply_markup.inline_keyboard[0];
const approveCallbackData = buttons[0].callback_data;
const rejectCallbackData = buttons[1].callback_data;

const validApprove = verifyTelegramApproval({
  update: {
    callback_query: {
      from: { id: OWNER_USER_ID },
      message: { chat: { id: OWNER_CHAT_ID } },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(validApprove.authorized, true);
assert.equal(validApprove.decision, "approve");

const validReject = verifyTelegramApproval({
  update: {
    callback_query: {
      from: { id: OWNER_USER_ID },
      message: { chat: { id: OWNER_CHAT_ID } },
      data: rejectCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(validReject.authorized, true);
assert.equal(validReject.decision, "reject");

const spoofedUser = verifyTelegramApproval({
  update: {
    callback_query: {
      from: { id: "999999999" },
      message: { chat: { id: OWNER_CHAT_ID } },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  allowedChatId: OWNER_CHAT_ID,
  allowedUserId: OWNER_USER_ID,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(spoofedUser.authorized, false);
console.log("✓ 6. Telegram Approve/Reject and owner authorization verification passed");

// 7. Isolated GitHub PR specification
const prSpec = prepareIsolatedPullRequestSpec({ draft });
assert.equal(prSpec.baseBranch, "main");
assert.ok(prSpec.headBranch.startsWith("auton-pub/"));
assert.equal(prSpec.autoMerge, false);
assert.equal(prSpec.requiresOwnerMergeApproval, true);
console.log("✓ 7. Isolated GitHub PR specification verified (branch prefix auton-pub/*, autoMerge: false)");

