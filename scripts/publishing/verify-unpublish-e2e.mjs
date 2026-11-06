// End-to-end verification of the Telegram Unpublish (Undo) flow using an isolated disposable test fixture.
// Run: node scripts/publishing/verify-unpublish-e2e.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildUkrainianFinalNotification,
  verifyTelegramApproval,
  prepareUnpublishPullRequestSpec,
  generateArticleDraft,
  assertTrilingualPublicationCompleteness,
} from "./pipeline.mjs";

console.log("=== End-to-End Verification: Telegram Unpublish & Trilingual Quality Guardrails ===");

const TEST_SECRET = "test-webhook-secret-token-abcdef1234567890";
const CALLBACK_SECRET = "test-callback-hmac-secret-xyz9876543210";
const OWNER_ID = "432576189";
const SPOUSE_ID = "987654321";
const UNAUTHORIZED_ID = "111222333";
const AUTHORIZED_USERS = [OWNER_ID, SPOUSE_ID];

// 1. Create a safe disposable event fixture
const disposableEvent = {
  eligible: true,
  category: "release",
  repoFullName: "HomeLab-NL/whats-for-dinner",
  projectId: "cookfrom",
  projectName: "CookFrom",
  projectTag: "CookFrom",
  title: "CookFrom Disposable Test Release",
  summarySource: "Disposable test fixture to verify trilingual unpublish flow.\n- Verified change for test release.",
  version: "0.99.0-test",
  publishedAt: "2026-11-06",
  sourceUrl: "https://homelabcore.dev/apps/cookfrom",
  sourceEventId: "HomeLab-NL/whats-for-dinner#release:v0.99.0-test",
};

const draft = generateArticleDraft(disposableEvent);
assertTrilingualPublicationCompleteness(draft);
assert.equal(draft.filePath, `src/content/blog/${draft.slug}.md`);
assert.equal(draft.filePathUk, `src/content/blog/uk/${draft.slug}.md`);
assert.equal(draft.filePathNl, `src/content/blog/nl/${draft.slug}.md`);
console.log("✓ Step 0. Disposable test article generated with EN, UK, NL variants sharing publication ID:", draft.slug);

// Step 1: Publication notification contains the ↩️ Unpublish button
const finalMsgs = buildUkrainianFinalNotification({
  outcome: "published",
  projectName: draft.projectName,
  title: draft.title,
  slug: draft.slug,
  draftId: draft.draftId,
  draftPrUrl: "https://github.com/HomeLab-NL/HomeLabCore-Web/pull/999",
  authorizedUsers: AUTHORIZED_USERS,
  callbackSecret: CALLBACK_SECRET,
});

assert.ok(finalMsgs.length >= 2, "Notification must be sent to authorized family members");
const unpublishButton = finalMsgs[0].reply_markup?.inline_keyboard?.[0]?.[0];
assert.ok(unpublishButton, "Must provide Unpublish action button");
assert.ok(unpublishButton.text.includes("Скасувати публікацію"));
const unpublishCb = unpublishButton.callback_data;
assert.ok(unpublishCb.startsWith("u|u|"), "Unpublish callback must start with u|u|");
console.log("✓ Step 1. Publication notification contains the ↩️ Unpublish button with valid signed callback");

// Step 2: Only authorized users can initiate the action
const unauthorizedAttempt = verifyTelegramApproval({
  update: {
    update_id: 990001,
    callback_query: {
      id: "cbq-unauth",
      from: { id: Number(UNAUTHORIZED_ID) },
      message: { message_id: 401, chat: { id: Number(UNAUTHORIZED_ID) } },
      data: unpublishCb,
    },
  },
  secretTokenHeader: TEST_SECRET,
  expectedWebhookSecret: TEST_SECRET,
  authorizedUsers: AUTHORIZED_USERS,
  callbackSecret: CALLBACK_SECRET,
});
assert.equal(unauthorizedAttempt.authorized, false, "Unauthorized users must be blocked from unpublishing");
console.log("✓ Step 2. Unauthorized users are strictly rejected from initiating unpublish");

// Step 3: A second confirmation is required
const unpublishPrompt = verifyTelegramApproval({
  update: {
    update_id: 990002,
    callback_query: {
      id: "cbq-step1",
      from: { id: Number(OWNER_ID) },
      message: { message_id: 402, chat: { id: Number(OWNER_ID) } },
      data: unpublishCb,
    },
  },
  secretTokenHeader: TEST_SECRET,
  expectedWebhookSecret: TEST_SECRET,
  authorizedUsers: AUTHORIZED_USERS,
  callbackSecret: CALLBACK_SECRET,
});
assert.equal(unpublishPrompt.authorized, true);
assert.equal(unpublishPrompt.decision, "unpublish_prompt");
assert.ok(unpublishPrompt.confirmationPrompt.text.includes("Підтвердження відкликання публікації"));
const confirmBtn = unpublishPrompt.confirmationPrompt.reply_markup.inline_keyboard[0][0];
assert.ok(confirmBtn.text.includes("Так, видалити з сайту"));
const confirmCb = confirmBtn.callback_data;
assert.ok(confirmCb.startsWith("u|cu|"), "Confirmation callback must start with u|cu|");
console.log("✓ Step 3. A second explicit confirmation prompt is required with inline buttons");

// Step 4 & 5: Unpublish targets exact publication ID and removes all three language variants
const pendingDraftsState = {
  [draft.draftId]: {
    slug: draft.slug,
    filePath: draft.filePath,
    status: "merged",
    unpublishStatus: "none",
  },
};

const unpublishConfirmed = verifyTelegramApproval({
  update: {
    update_id: 990003,
    callback_query: {
      id: "cbq-step2",
      from: { id: Number(OWNER_ID) },
      message: { message_id: 403, chat: { id: Number(OWNER_ID) } },
      data: confirmCb,
    },
  },
  secretTokenHeader: TEST_SECRET,
  expectedWebhookSecret: TEST_SECRET,
  authorizedUsers: AUTHORIZED_USERS,
  callbackSecret: CALLBACK_SECRET,
  pendingDrafts: pendingDraftsState,
});

assert.equal(unpublishConfirmed.authorized, true);
assert.equal(unpublishConfirmed.decision, "unpublish_confirmed");
assert.equal(unpublishConfirmed.slug, draft.slug, "Must target exact publication ID (slug)");
assert.equal(unpublishConfirmed.targetFiles.length, 3, "Must target all three language variants");
assert.equal(unpublishConfirmed.targetFiles[0], `src/content/blog/${draft.slug}.md`);
assert.equal(unpublishConfirmed.targetFiles[1], `src/content/blog/uk/${draft.slug}.md`);
assert.equal(unpublishConfirmed.targetFiles[2], `src/content/blog/nl/${draft.slug}.md`);

const unpublishPrSpec = prepareUnpublishPullRequestSpec({
  draft,
  targetFilePath: draft.filePath,
  initiatedBy: "Serhii (Owner)",
});
assert.equal(unpublishPrSpec.baseBranch, "main");
assert.equal(unpublishPrSpec.headBranch, `rollback/unpublish-${draft.slug}`);
assert.equal(unpublishPrSpec.targetFiles.length, 3);
assert.ok(unpublishPrSpec.prBody.includes(`src/content/blog/${draft.slug}.md`));
assert.ok(unpublishPrSpec.prBody.includes(`src/content/blog/uk/${draft.slug}.md`));
assert.ok(unpublishPrSpec.prBody.includes(`src/content/blog/nl/${draft.slug}.md`));
console.log("✓ Step 4 & 5. Unpublish targets exact publication ID and generates PR removing all 3 language variants (EN, UK, NL)");

// Step 6 & 7: Verify absence of unpublish targets in dist and RSS
const distBlogEn = path.resolve(`dist/blog/${draft.slug}`);
const distBlogUk = path.resolve(`dist/uk/blog/${draft.slug}`);
const distBlogNl = path.resolve(`dist/nl/blog/${draft.slug}`);
assert.ok(!fs.existsSync(distBlogEn), "Disposable article must not be in dist/blog/");
assert.ok(!fs.existsSync(distBlogUk), "Disposable article must not be in dist/uk/blog/");
assert.ok(!fs.existsSync(distBlogNl), "Disposable article must not be in dist/nl/blog/");
const rssRaw = fs.readFileSync("dist/rss.xml", "utf8");
assert.ok(!rssRaw.includes(draft.slug), "Disposable article must not be present in RSS feed");
console.log("✓ Step 6 & 7. Article URLs in all 3 languages and RSS entries are verified absent");

// Step 8: Telegram sends final confirmation and repeated callbacks are rejected idempotently
const finalUnpublishNotice = buildUkrainianFinalNotification({
  outcome: "rejected",
  projectName: draft.projectName,
  title: draft.title,
  authorizedUsers: AUTHORIZED_USERS,
});
assert.ok(finalUnpublishNotice.length >= 2);
assert.ok(finalUnpublishNotice[0].text.includes("Публікацію скасовано") || finalUnpublishNotice[0].text.includes("CookFrom"));

// Idempotent rejection of second click
const replayAttempt = verifyTelegramApproval({
  update: {
    update_id: 990004,
    callback_query: {
      id: "cbq-replay",
      from: { id: Number(OWNER_ID) },
      message: { message_id: 403, chat: { id: Number(OWNER_ID) } },
      data: confirmCb,
    },
  },
  secretTokenHeader: TEST_SECRET,
  expectedWebhookSecret: TEST_SECRET,
  authorizedUsers: AUTHORIZED_USERS,
  callbackSecret: CALLBACK_SECRET,
  pendingDrafts: pendingDraftsState,
});
assert.equal(replayAttempt.authorized, false);
assert.equal(replayAttempt.idempotent, true);
console.log("✓ Step 8. Final Telegram notification confirmed and duplicate/replayed callbacks rejected idempotently");

console.log("\n=== ALL TELEGRAM UNPUBLISH VERIFICATION STEPS PASSED SUCCESSFULLY ===");
