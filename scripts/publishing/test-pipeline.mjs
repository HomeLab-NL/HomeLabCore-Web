// Automated validation suite for the HomeLabCore autonomous publishing pipeline (v2.0),
// Draft-PR-first Ukrainian UX, family access (Owner + Spouse), commit SHA + CI merge guard,
// multi-repository event classification, and importable n8n workflow JSON.
// Run: npm run test:publishing

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  HOMELAB_TELEGRAM_BOTS,
  PROJECT_REPO_MAP,
  SecurityPolicyError,
  assertNoSensitiveData,
  assertTrilingualPublicationCompleteness,
  buildHomeLabInfoWebhookSpec,
  buildTelegramApprovalRequest,
  buildTelegramCallbackResponse,
  buildUkrainianApprovalNotifications,
  buildUkrainianFinalNotification,
  classifyGitHubEvent,
  confirmSpouseEnrollment,
  generateArticleDraft,
  isDuplicateEvent,
  prepareIsolatedPullRequestSpec,
  prepareUnpublishPullRequestSpec,
  processSpouseEnrollmentRequest,
  validateMergeReadiness,
  verifyGitHubSignature,
  verifyTelegramApproval,
  verifyTelegramBotConsumerSafety,
} from "./pipeline.mjs";

const WEBHOOK_SECRET = "test-webhook-secret-do-not-use-in-prod";
const TG_WEBHOOK_SECRET = "test_homelab_info_webhook_secret_token_32chars";
const TG_CALLBACK_SECRET = "test-homelab-info-callback-secret";
const OWNER_USER_ID = "900100200";
const SPOUSE_USER_ID = "900100300";
const STRANGER_USER_ID = "999999999";

function signPayload(payloadObj, secret = WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(payloadObj);
  const hex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return { rawBody, signatureHeader: `sha256=${hex}` };
}

console.log("=== Scenario A: Automated Publishing v2.0 (Draft-PR-First, Ukrainian UX, Family Access & Multi-Repo) ===");

// 1. Validate n8n workflow JSON structure, HomeLab Info bindings, and security
const workflowPath = path.resolve("automation/n8n/homelabcore-autonomous-publishing.workflow.json");
assert.ok(fs.existsSync(workflowPath), "n8n workflow JSON must exist");
const wfRaw = fs.readFileSync(workflowPath, "utf8");
assertNoSensitiveData(wfRaw);
const wf = JSON.parse(wfRaw);
assert.equal(wf.active, false, "n8n workflow must default to inactive until owner enables it");
assert.ok(Array.isArray(wf.nodes) && wf.nodes.length >= 30, "n8n v2.0 workflow must define Draft-PR-first, family access, and merge-guard nodes");
assert.ok(wfRaw.includes("homelab-info-web-approval"), "n8n workflow must use dedicated HomeLab Info webhook path");
assert.ok(wfRaw.includes("HomeLab Info Bot (Web Publishing)"), "n8n workflow must use encrypted HomeLab Info telegramApi credential");
assert.ok(wfRaw.includes("HomeLab Info Web Approval Secret"), "n8n workflow must use encrypted HomeLab Info headerAuth credential");
assert.ok(wfRaw.includes("Create Isolated GitHub PR") && wfRaw.includes("draft: true"), "n8n workflow must create Draft PR before sending Telegram review prompt");
assert.ok(wfRaw.includes("Mark Draft PR Ready for Review"), "n8n workflow must mark Draft PR ready before merging");
assert.ok(wfRaw.includes("Merge Approved PR with SHA Guard"), "n8n workflow must merge with exact reviewed commit SHA");
assert.ok(!wfRaw.includes("$env."), "n8n workflow must not rely on $env when N8N_BLOCK_ENV_ACCESS_IN_NODE=true");
assert.ok(!wfRaw.includes("telegram-p0-gateway"), "n8n workflow must never collide with telegram-p0-gateway");
console.log("✓ 1. n8n v2.0 workflow JSON valid, Draft-PR-first, bound to HomeLab Info, and free of secrets/private IPs");

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

// 3. Multi-repository mapping & filtering (CookFrom, KeyQuest, Homework Tutor, Ops Planner)
assert.equal(PROJECT_REPO_MAP["homelab-nl/whats-for-dinner"]?.id, "cookfrom");
assert.equal(PROJECT_REPO_MAP["homelabnl-alt/keyquest"]?.id, "keyboard-trainer");
assert.equal(PROJECT_REPO_MAP["homelab-nl/keyboard-trainer"]?.id, "keyboard-trainer");
assert.equal(PROJECT_REPO_MAP["homelab-nl/homework-tutor"]?.id, "ai-tutor");
assert.equal(PROJECT_REPO_MAP["homelab-nl/ops-planner"]?.id, "ops-planner");

const classifiedRelease = classifyGitHubEvent({ eventType: "release", payload: releaseEventPayload });
assert.equal(classifiedRelease.eligible, true);
assert.equal(classifiedRelease.category, "release");
assert.equal(classifiedRelease.project?.id, "keyboard-trainer");
assert.equal(classifiedRelease.sourceEventId, "homelabnl-alt/KeyQuest#release:v1.1.0");

// Ignore routine commits
const routinePush = classifyGitHubEvent({
  eventType: "push",
  payload: { ref: "refs/heads/main", commits: [{ message: "fix: typo in button label" }] },
});
assert.equal(routinePush.eligible, false);

// Ignore release candidates (-rc, alpha, beta)
const rcRelease = classifyGitHubEvent({
  eventType: "release",
  payload: {
    action: "published",
    repository: { full_name: "HomeLab-NL/ops-planner" },
    release: { tag_name: "v1.4.0-rc.1", name: "Ops Planner 1.4.0 RC1", draft: false, prerelease: false, body: "Release candidate" },
  },
});
assert.equal(rcRelease.eligible, false);
assert.ok(rcRelease.reason.includes("Release candidate"));

// Ignore self-generated auton-pub/* PRs (loop prevention)
const selfGeneratedPr = classifyGitHubEvent({
  eventType: "pull_request",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/HomeLabCore-Web" },
    pull_request: {
      number: 18,
      merged: true,
      head: { ref: "auton-pub/2026-11-05-cookfrom-0-12-0" },
      labels: [{ name: "publish-milestone" }],
      title: "docs(blog): CookFrom 0.12.0",
    },
  },
});
assert.equal(selfGeneratedPr.eligible, false);
assert.ok(selfGeneratedPr.reason.includes("auton-pub/"));

// Accept multi-repo [publish] milestones (e.g., Ops Planner & Homework Tutor)
const opsPlannerMilestone = classifyGitHubEvent({
  eventType: "milestone",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/ops-planner", html_url: "https://github.com/HomeLab-NL/ops-planner" },
    milestone: {
      number: 2,
      title: "Ops Planner 1.3: Multi-Standard Clause Cross-Walk [publish]",
      description: "[publish] Added cross-walk mapping between ISO 9001 and IATF 16949 clauses.\n- Clause comparison table\n- Action item export",
      closed_at: new Date().toISOString(),
      html_url: "https://github.com/HomeLab-NL/ops-planner/milestone/2",
    },
  },
});
assert.equal(opsPlannerMilestone.eligible, true);
assert.equal(opsPlannerMilestone.project?.id, "ops-planner");
assert.equal(opsPlannerMilestone.sourceEventId, "HomeLab-NL/ops-planner#milestone:2");

// Reject stale milestone closed more than 14 days ago
const staleMilestone = classifyGitHubEvent({
  eventType: "milestone",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/ops-planner" },
    milestone: {
      number: 99,
      title: "Old refactoring [publish]",
      description: "[publish] Old changes.\n- item 1\n- item 2",
      closed_at: "2025-01-01T00:00:00Z",
    },
  },
});
assert.equal(staleMilestone.eligible, false);
assert.ok(staleMilestone.reason.includes("older than 14 days"));

// Reject low-information milestone lacking verified user-facing changes
const lowInfoMilestone = classifyGitHubEvent({
  eventType: "milestone",
  payload: {
    action: "closed",
    repository: { full_name: "HomeLab-NL/ops-planner" },
    milestone: {
      number: 100,
      title: "Cleanup [publish]",
      description: "[publish] done",
      closed_at: new Date().toISOString(),
    },
  },
});
assert.equal(lowInfoMilestone.eligible, false);
assert.ok(lowInfoMilestone.reason.includes("too brief"));
console.log("✓ 3. Multi-repo event classification passed (releases & [publish] milestones accepted; RCs, routine pushes, and self-PRs ignored)");

// 4. Duplicate prevention check against src/content/blog/ and in-memory state
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
assert.equal(
  isDuplicateEvent({
    sourceEventId: "HomeLab-NL/ops-planner#milestone:2",
    processedEventIds: ["HomeLab-NL/ops-planner#milestone:2"],
  }),
  true,
  "In-memory processedEventIds must block duplicate webhook delivery across repositories",
);
console.log("✓ 4. Cross-repository duplicate publication prevention verified");

// 5. Trilingual article draft generation (EN/UK/NL), shared publication ID, and Draft PR specification (isDraft: true)
const draft = generateArticleDraft(classifiedRelease);
assert.ok(draft.description.length >= 50 && draft.description.length <= 230, "Draft description must be 50-230 chars");
assert.ok(draft.summaryUa && draft.summaryUa.length >= 40, "Draft must include a concise 2-3 sentence Ukrainian summary");
assert.ok(draft.markdown.includes('project: "keyboard-trainer"'));
assert.ok(draft.markdown.includes('sourceEventId: "homelabnl-alt/KeyQuest#release:v1.1.0"'));

// Verify Trilingual variants share exact publication ID (slug)
assert.equal(draft.filePath, `src/content/blog/${draft.slug}.md`);
assert.equal(draft.filePathUk, `src/content/blog/uk/${draft.slug}.md`);
assert.equal(draft.filePathNl, `src/content/blog/nl/${draft.slug}.md`);
assert.ok(draft.markdownUk.includes('lang: "uk"'), "Ukrainian markdown must have lang: 'uk'");
assert.ok(draft.markdownUk.includes("## Підтверджені зміни"), "Ukrainian markdown must have localized header");
assert.ok(draft.markdownNl.includes('lang: "nl"'), "Dutch markdown must have lang: 'nl'");
assert.ok(draft.markdownNl.includes("## Geverifieerde wijzigingen"), "Dutch markdown must have localized header");
assert.ok(assertTrilingualPublicationCompleteness(draft), "Trilingual completeness validation must pass");

// Guard: prevent partial publication if a translation is missing
assert.throws(
  () => assertTrilingualPublicationCompleteness({ ...draft, markdownUk: "" }),
  /Missing or empty markdown content for UK translation/,
  "Must block publication if Ukrainian translation is missing",
);
assert.throws(
  () => assertTrilingualPublicationCompleteness({ ...draft, markdownNl: "" }),
  /Missing or empty markdown content for NL translation/,
  "Must block publication if Dutch translation is missing",
);

const draftPrSpec = prepareIsolatedPullRequestSpec({ draft, isDraft: true });
assert.equal(draftPrSpec.baseBranch, "main");
assert.ok(draftPrSpec.headBranch.startsWith("auton-pub/"));
assert.equal(draftPrSpec.isDraft, true, "PR must be created as a GitHub Draft PR first");
assert.equal(draftPrSpec.autoMerge, false);
assert.equal(draftPrSpec.files.length, 3, "Draft PR must bundle all three language variants (EN, UK, NL)");
assert.equal(draftPrSpec.files[0].lang, "en");
assert.equal(draftPrSpec.files[1].lang, "uk");
assert.equal(draftPrSpec.files[2].lang, "nl");
console.log("✓ 5. Trilingual article draft (EN/UK/NL), shared publication ID, and GitHub Draft PR specification verified");

// 6. Ukrainian Telegram approval messages (zero technical metadata, sent to both authorized family members)
const draftPrUrl = "https://github.com/HomeLab-NL/HomeLabCore-Web/pull/25";
const reviewedCommitSha = "a1b2c3d4e5f60123456789abcdef0123456789ab";
const authorizedUsers = [OWNER_USER_ID, SPOUSE_USER_ID];

const uaNotifications = buildUkrainianApprovalNotifications({
  draft,
  draftPrUrl,
  draftPrNumber: 25,
  reviewedCommitSha,
  authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(uaNotifications.length, 2, "Must generate approval notifications for both authorized family members");
for (const msg of uaNotifications) {
  assert.ok(msg.text.includes("*Проєкт:* KeyQuest"), "Must include project name in Ukrainian");
  assert.ok(msg.text.includes(`*Заголовок:* ${draft.title}`), "Must include publication title");
  assert.ok(msg.text.includes("*Дата події:*"), "Must include source event date");
  assert.ok(msg.text.includes("*Короткий зміст:*") || msg.text.includes("*Короткий опис:*"), "Must include 2-3 sentence Ukrainian summary");
  assert.ok(msg.text.includes(draftPrUrl), "Must include direct link to the GitHub Draft PR");
  // Must NOT contain technical metadata (branch names, file paths, event IDs, commit SHAs)
  assert.ok(!msg.text.includes("auton-pub/"), "Normal notification must NOT include branch names");
  assert.ok(!msg.text.includes("src/content/blog/"), "Normal notification must NOT include file paths");
  assert.ok(!msg.text.includes("sourceEventId"), "Normal notification must NOT include event IDs");
  assert.ok(!msg.text.includes(reviewedCommitSha), "Normal notification must NOT include raw commit SHA");
  const btns = msg.reply_markup.inline_keyboard[0];
  assert.equal(btns[0].text, "✅ Схвалити та опублікувати");
  assert.equal(btns[1].text, "🛑 Відхилити");
  assert.ok(Buffer.byteLength(btns[0].callback_data, "utf8") <= 64, "Approve callback_data must be <= 64 bytes");
  assert.ok(Buffer.byteLength(btns[1].callback_data, "utf8") <= 64, "Reject callback_data must be <= 64 bytes");
}
console.log("✓ 6. Ukrainian Telegram approval messages verified (Project, Title, Summary, Draft PR link, zero technical metadata)");

// 7. Secure Family Enrollment: /start from spouse requires explicit Owner confirmation
const enrollmentState = {
  authorizedUsers: [OWNER_USER_ID],
  pendingEnrollments: {},
};

const spouseStartReq = processSpouseEnrollmentRequest({
  update: {
    update_id: 800001,
    message: {
      message_id: 10,
      from: { id: Number(SPOUSE_USER_ID), first_name: "Olena", username: "olena_family" },
      chat: { id: Number(SPOUSE_USER_ID), type: "private" },
      text: "/start",
    },
  },
  ownerUserId: OWNER_USER_ID,
  authorizedUsers: enrollmentState.authorizedUsers,
  pendingEnrollments: enrollmentState.pendingEnrollments,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(spouseStartReq.handled, true);
assert.equal(spouseStartReq.status, "pending-owner-confirmation");
assert.equal(
  enrollmentState.authorizedUsers.includes(SPOUSE_USER_ID),
  false,
  "/start must NEVER automatically grant approval rights before owner confirmation",
);
assert.equal(spouseStartReq.candidateReply.chat_id, SPOUSE_USER_ID);
assert.equal(spouseStartReq.ownerConfirmationPrompt.chat_id, OWNER_USER_ID);

const enrollButtons = spouseStartReq.ownerConfirmationPrompt.reply_markup.inline_keyboard[0];
const confirmEnrollCallbackData = enrollButtons[0].callback_data;
assert.ok(Buffer.byteLength(confirmEnrollCallbackData, "utf8") <= 64);

// Stranger or spouse trying to self-confirm enrollment must be rejected
const selfConfirmAttempt = confirmSpouseEnrollment({
  update: {
    update_id: 800002,
    callback_query: {
      id: "cbq-self-enroll",
      from: { id: Number(SPOUSE_USER_ID) },
      message: {
        message_id: 11,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(SPOUSE_USER_ID), type: "private" },
      },
      data: confirmEnrollCallbackData,
    },
  },
  ownerUserId: OWNER_USER_ID,
  authorizedUsers: enrollmentState.authorizedUsers,
  pendingEnrollments: enrollmentState.pendingEnrollments,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(selfConfirmAttempt.authorized, false);
assert.equal(enrollmentState.authorizedUsers.includes(SPOUSE_USER_ID), false);

// Owner explicitly confirms spouse enrollment
const ownerConfirmEnrollment = confirmSpouseEnrollment({
  update: {
    update_id: 800003,
    callback_query: {
      id: "cbq-owner-enroll",
      from: { id: Number(OWNER_USER_ID) },
      message: {
        message_id: 12,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(OWNER_USER_ID), type: "private" },
      },
      data: confirmEnrollCallbackData,
    },
  },
  ownerUserId: OWNER_USER_ID,
  authorizedUsers: enrollmentState.authorizedUsers,
  pendingEnrollments: enrollmentState.pendingEnrollments,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(ownerConfirmEnrollment.authorized, true);
assert.equal(ownerConfirmEnrollment.decision, "approve");
assert.deepEqual(enrollmentState.authorizedUsers, [OWNER_USER_ID, SPOUSE_USER_ID]);
assert.equal(ownerConfirmEnrollment.candidateNotification.chat_id, SPOUSE_USER_ID);
console.log("✓ 7. Spouse /start enrollment verified (/start does not auto-grant; only Owner callback grants access)");

// 8. Dual-user approval, first-decision-wins locking, and button invalidation for both users
const webhookSpec = buildHomeLabInfoWebhookSpec({ secretToken: TG_WEBHOOK_SECRET });
assert.equal(webhookSpec.url, HOMELAB_TELEGRAM_BOTS.infoBot.webhookUrl);
assert.deepEqual(webhookSpec.allowed_updates, ["message", "callback_query"]);
assert.equal(webhookSpec.drop_pending_updates, false);

const shortSlug = uaNotifications[0].shortSlug;
const approveCallbackData = uaNotifications[0].reply_markup.inline_keyboard[0][0].callback_data;
const rejectCallbackData = uaNotifications[0].reply_markup.inline_keyboard[0][1].callback_data;

const seenUpdateIds = new Set();
const pendingDrafts = {
  [shortSlug]: {
    status: "pending_approval",
    slug: draft.slug,
    shortSlug,
    title: draft.title,
    projectName: draft.projectName,
    draftPrNumber: 25,
    draftPrUrl,
    reviewedCommitSha,
    notifiedMessages: [
      { chatId: OWNER_USER_ID, messageId: 101 },
      { chatId: SPOUSE_USER_ID, messageId: 202 },
    ],
  },
};

// Unauthorized third party must be rejected
const strangerAttempt = verifyTelegramApproval({
  update: {
    update_id: 900001,
    callback_query: {
      id: "cbq-stranger",
      from: { id: Number(STRANGER_USER_ID) },
      message: {
        message_id: 999,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(STRANGER_USER_ID), type: "private" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
  pendingDrafts,
});
assert.equal(strangerAttempt.authorized, false);
assert.equal(pendingDrafts[shortSlug].status, "pending_approval");

// Spouse approves first -> succeeds and locks draft to "approved"
const spouseApproval = verifyTelegramApproval({
  update: {
    update_id: 900002,
    callback_query: {
      id: "cbq-spouse-approve",
      from: { id: Number(SPOUSE_USER_ID), first_name: "Olena" },
      message: {
        message_id: 202,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(SPOUSE_USER_ID), type: "private" },
      },
      data: approveCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
  pendingDrafts,
});
assert.equal(spouseApproval.authorized, true);
assert.equal(spouseApproval.decision, "approve");
assert.equal(spouseApproval.actorUserId, SPOUSE_USER_ID);
assert.equal(spouseApproval.reviewedCommitSha, reviewedCommitSha);
assert.equal(pendingDrafts[shortSlug].status, "approved");

const callbackResp = buildTelegramCallbackResponse({
  verification: spouseApproval,
  chatId: SPOUSE_USER_ID,
  notifiedMessages: pendingDrafts[shortSlug].notifiedMessages,
});
assert.equal(
  callbackResp.editAllNotifiedMessages.length,
  2,
  "Must invalidate inline buttons for BOTH Owner and Spouse immediately",
);

// Owner clicks Reject (or Approve) 2 seconds later -> blocked because first valid decision already won
const lateOwnerClick = verifyTelegramApproval({
  update: {
    update_id: 900003,
    callback_query: {
      id: "cbq-owner-late",
      from: { id: Number(OWNER_USER_ID), first_name: "Serhii" },
      message: {
        message_id: 101,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(OWNER_USER_ID), type: "private" },
      },
      data: rejectCallbackData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
  seenUpdateIds,
  pendingDrafts,
});
assert.equal(lateOwnerClick.authorized, false);
assert.equal(lateOwnerClick.staleOrResolved, true);
console.log("✓ 8. Dual-user authorization, first-decision-wins lock, and dual-message button invalidation passed");

// 9. Exact Commit SHA & CI revalidation before merge
const readyToMerge = validateMergeReadiness({
  reviewedCommitSha,
  prData: {
    number: 25,
    state: "open",
    merged: false,
    mergeable: true,
    head: { sha: reviewedCommitSha },
  },
  checkRunsData: {
    total_count: 2,
    check_runs: [
      { name: "build-and-test", status: "completed", conclusion: "success" },
      { name: "Cloudflare Pages", status: "completed", conclusion: "success" },
    ],
  },
});
assert.equal(readyToMerge.ready, true);

// Modified-after-approval commit SHA must NEVER be merged
const modifiedAfterApproval = validateMergeReadiness({
  reviewedCommitSha,
  prData: {
    number: 25,
    state: "open",
    merged: false,
    mergeable: true,
    head: { sha: "ffffffffffffffffffffffffffffffffffffffff" },
  },
  checkRunsData: {
    total_count: 1,
    check_runs: [{ name: "build-and-test", status: "completed", conclusion: "success" }],
  },
});
assert.equal(modifiedAfterApproval.ready, false);
assert.equal(modifiedAfterApproval.shaMismatch, true);

// Failing CI check must block merge
const failingCi = validateMergeReadiness({
  reviewedCommitSha,
  prData: {
    number: 25,
    state: "open",
    merged: false,
    mergeable: true,
    head: { sha: reviewedCommitSha },
  },
  checkRunsData: {
    total_count: 1,
    check_runs: [{ name: "build-and-test", status: "completed", conclusion: "failure" }],
  },
});
assert.equal(failingCi.ready, false);
assert.equal(failingCi.ciFailed, true);
console.log("✓ 9. Pre-merge commit SHA lock & CI check-runs revalidation passed (blocks post-approval tampering and failing CI)");

// 10. Final Ukrainian notifications (live article URL on success, PR URL on fallback/failure)
const finalSuccessMsgs = buildUkrainianFinalNotification({
  outcome: "published",
  projectName: "KeyQuest",
  title: draft.title,
  slug: draft.slug,
  draftPrUrl,
  authorizedUsers: enrollmentState.authorizedUsers,
});
assert.equal(finalSuccessMsgs.length, 2);
assert.ok(finalSuccessMsgs[0].text.includes(`https://homelabcore.dev/blog/${draft.slug}/`));
assert.ok(finalSuccessMsgs[0].text.includes("Статтю опубліковано на HomeLabCore.dev!"));

const finalFallbackMsgs = buildUkrainianFinalNotification({
  outcome: "merge_blocked",
  projectName: "KeyQuest",
  title: draft.title,
  slug: draft.slug,
  draftPrUrl,
  reason: "Очікується завершення перевірок CI.",
  authorizedUsers: enrollmentState.authorizedUsers,
});
assert.equal(finalFallbackMsgs.length, 2);
assert.ok(finalFallbackMsgs[0].text.includes(draftPrUrl));
assert.ok(finalFallbackMsgs[0].text.includes("Автоматичне злиття призупинено"));
// 11. Telegram Undo / Unpublish workflow (idempotency, confirmation prompt, authorized user lock)
const finalPublishedMsgs = buildUkrainianFinalNotification({
  outcome: "published",
  projectName: "KeyQuest",
  title: draft.title,
  slug: draft.slug,
  draftPrUrl,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.ok(finalPublishedMsgs[0].reply_markup?.inline_keyboard?.length > 0, "Must provide Unpublish action button");
const unpublishCbData = finalPublishedMsgs[0].reply_markup.inline_keyboard[0][0].callback_data;
assert.ok(unpublishCbData.startsWith("u|u|"), "Unpublish callback must start with u|u|");

// Step 1 of Unpublish: Triggering unpublish sends a second confirmation prompt
const unpublishPrompt = verifyTelegramApproval({
  update: {
    update_id: 950001,
    callback_query: {
      id: "cbq-unpub-1",
      from: { id: Number(OWNER_USER_ID) },
      message: {
        message_id: 301,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(OWNER_USER_ID), type: "private" },
      },
      data: unpublishCbData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
});
assert.equal(unpublishPrompt.authorized, true);
assert.equal(unpublishPrompt.decision, "unpublish_prompt");
assert.ok(unpublishPrompt.confirmationPrompt.reply_markup.inline_keyboard[0][0].text.includes("Так, видалити"));
const confirmUnpublishCbData = unpublishPrompt.confirmationPrompt.reply_markup.inline_keyboard[0][0].callback_data;
assert.ok(confirmUnpublishCbData.startsWith("u|cu|"));

// Step 2: Confirming unpublish executes removal and transitions draft state
const pendingUnpublishDrafts = {
  [draft.draftId]: {
    slug: draft.slug,
    filePath: draft.filePath,
    reviewedCommitSha,
    status: "merged",
    unpublishStatus: "none",
  },
};

const confirmedUnpublish = verifyTelegramApproval({
  update: {
    update_id: 950002,
    callback_query: {
      id: "cbq-unpub-2",
      from: { id: Number(OWNER_USER_ID) },
      message: {
        message_id: 302,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(OWNER_USER_ID), type: "private" },
      },
      data: confirmUnpublishCbData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
  pendingDrafts: pendingUnpublishDrafts,
});
assert.equal(confirmedUnpublish.authorized, true);
assert.equal(confirmedUnpublish.decision, "unpublish_confirmed");
assert.equal(confirmedUnpublish.filePath, draft.filePath);
assert.equal(confirmedUnpublish.targetFiles.length, 3);
assert.equal(confirmedUnpublish.targetFiles[0], `src/content/blog/${draft.slug}.md`);
assert.equal(confirmedUnpublish.targetFiles[1], `src/content/blog/uk/${draft.slug}.md`);
assert.equal(confirmedUnpublish.targetFiles[2], `src/content/blog/nl/${draft.slug}.md`);
assert.equal(pendingUnpublishDrafts[draft.draftId].unpublishStatus, "in_progress");

// Step 3: Idempotent replay of confirmation must be safely rejected
const replayedUnpublish = verifyTelegramApproval({
  update: {
    update_id: 950003,
    callback_query: {
      id: "cbq-unpub-3",
      from: { id: Number(OWNER_USER_ID) },
      message: {
        message_id: 302,
        from: { id: 8967925790, username: "Home_Lab_info_bot" },
        chat: { id: Number(OWNER_USER_ID), type: "private" },
      },
      data: confirmUnpublishCbData,
    },
  },
  secretTokenHeader: TG_WEBHOOK_SECRET,
  expectedWebhookSecret: TG_WEBHOOK_SECRET,
  authorizedUsers: enrollmentState.authorizedUsers,
  callbackSecret: TG_CALLBACK_SECRET,
  pendingDrafts: pendingUnpublishDrafts,
});
assert.equal(replayedUnpublish.authorized, false);
assert.equal(replayedUnpublish.idempotent, true);

// Verify isolated unpublish PR specification targets exact article across all three languages
const unpublishPrSpec = prepareUnpublishPullRequestSpec({
  draft,
  targetFilePath: draft.filePath,
  initiatedBy: "Serhii (Owner)",
});
assert.equal(unpublishPrSpec.baseBranch, "main");
assert.equal(unpublishPrSpec.headBranch, `rollback/unpublish-${draft.slug}`);
assert.equal(unpublishPrSpec.filePath, draft.filePath);
assert.equal(unpublishPrSpec.targetFiles.length, 3);
assert.equal(unpublishPrSpec.targetFiles[0], `src/content/blog/${draft.slug}.md`);
assert.equal(unpublishPrSpec.targetFiles[1], `src/content/blog/uk/${draft.slug}.md`);
assert.equal(unpublishPrSpec.targetFiles[2], `src/content/blog/nl/${draft.slug}.md`);
assert.equal(unpublishPrSpec.isDraft, false);
assert.ok(unpublishPrSpec.prTitle.includes(`unpublish ${draft.title}`));
assert.ok(unpublishPrSpec.prBody.includes(draft.filePath));
assert.ok(unpublishPrSpec.prBody.includes(`src/content/blog/uk/${draft.slug}.md`));
assert.ok(unpublishPrSpec.prBody.includes(`src/content/blog/nl/${draft.slug}.md`));
assert.ok(unpublishPrSpec.prBody.includes("Аудит та можливість відновлення"));

console.log("✓ 11. Safe 2-step Undo / Unpublish verified (authorized users, confirmation prompt, exact article target, idempotency)");
