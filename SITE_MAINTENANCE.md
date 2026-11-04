# SITE_MAINTENANCE.md — Operations, Autonomous Publishing & Runbook

This runbook documents the operational lifecycle of **HomeLabCore-Web** (`https://homelabcore.dev`), including the n8n autonomous publishing workflow, **HomeLab Info** (`@Home_Lab_info_bot`) Telegram approval integration, Cloudflare Pages deployment, rollback procedures, and credential management.

---

## 1. Publishing Architecture Overview

```
GitHub Event (Release / [publish] Milestone)
  │
  ▼
1. Webhook Signature & Filter (HMAC-SHA256 + ignore routine commits/bugfixes)
  │
  ▼
2. Deduplication Check (verify sourceEventId not already in src/content/blog/)
  │
  ▼
3. AI Draft & Security Guard (concise English Markdown, 50-230 char SEO, block secrets/private IPs)
  │
  ▼
4. HomeLab Info (@Home_Lab_info_bot) Owner Approval Prompt (✅ Approve & Open PR / 🛑 Reject Draft)
  │
  ▼
5. Isolated GitHub PR (branch: auton-pub/<slug> -> base: main)
  │
  ▼
6. GitHub Actions Build & Validation (npm run check && npm run build && npm test && npm run test:publishing)
  │
  ▼
7. Authorized Merge -> Cloudflare Pages Production Deployment -> Live Verification
```

### Key Files
- **n8n Workflow (importable):** `automation/n8n/homelabcore-autonomous-publishing.workflow.json`
- **Pipeline Module, Bot Separation & Security Guard:** `scripts/publishing/pipeline.mjs`
- **Automated Pipeline Test Suite:** `scripts/publishing/test-pipeline.mjs` (`npm run test:publishing`)
- **GitHub Actions CI:** `.github/workflows/verify.yml`

---

## 2. Event Filtering & Deduplication Rules

### Eligible Events
1. **GitHub Releases (`release.published`):**
   - Must be non-draft (`draft: false`) and non-prerelease (`prerelease: false`).
   - Ignored if title/body contains `[skip-publish]` or starts with routine prefixes (`fix:`, `chore:`, `ci:`, `build:`) without `[publish]`.
2. **GitHub Milestones (`milestone.closed`):**
   - Must explicitly include `[publish]` in the milestone title or description.
3. **Merged Pull Requests (`pull_request.closed` + `merged: true`):**
   - Must carry the `publish-milestone` or `release-note` label.

### Ignored Events
- Routine `push` commits, dependabot updates, minor bug fixes, unlabelled PRs, and draft releases are silently dropped at the filter stage.

### Deduplication
- Every eligible event is assigned a deterministic `sourceEventId` (e.g., `homelabnl-alt/KeyQuest#release:v1.1.0`) stored in the blog article frontmatter (`sourceEventId`).
- Before generating a draft, the pipeline checks existing files in `src/content/blog/*.md`. If `sourceEventId` or the target slug already exists, execution stops cleanly.

---

## 3. HomeLab Info (`@Home_Lab_info_bot`) Integration & Coexistence

### 3.1 Bot Separation in the HomeLab Ecosystem

| Bot Name | Username | Bot ID | Role | Webhook / Consumer |
|---|---|---|---|---|
| **HomeLab Info** | `@Home_Lab_info_bot` | `8967925790` | 1. Uptime Kuma monitoring alerts (`HomeLab production /healthz` + `HomeLab Backup` push heartbeat)<br>2. **HomeLabCore-Web publication approvals** | Outbound `sendMessage` from Uptime Kuma + dedicated n8n webhook `/webhook/homelab-info-web-approval` (`allowed_updates: ["callback_query"]`) |
| **HomeLab Assistant** | `@homelab_core_bot` | `8633834424` | AgentLab / HomeLab worker task intake & systemd `OnFailure` alerts (`homelab-alert-telegram`) | Reserved for `/webhook/telegram-p0-gateway` — **never reused or modified by web publishing** |

### 3.2 Preserving Uptime Kuma & Backup Notifications
- **Outbound Monitoring:** Uptime Kuma (`notification id=1`, `"HomeLab alert bot"`) sends alerts for `HomeLab production /healthz` (HTTP poll every 300s) and `HomeLab Backup` (Push heartbeat every 26h triggered by `ExecStartPost=-/usr/local/sbin/homelab-backup-push` in `homelab-prod-backup.service`).
- **Why Zero Conflict Exists:**
  1. Uptime Kuma's Telegram provider (`telegram.js`) is strictly outbound-only (`GET /bot<token>/sendMessage`) and never calls `getUpdates` or `setWebhook`.
  2. No process polls `getUpdates` on `@Home_Lab_info_bot`.
  3. When the n8n workflow is activated in production, `@Home_Lab_info_bot`'s webhook is registered with `allowed_updates: ["callback_query"]` and `drop_pending_updates: false` via `buildHomeLabInfoWebhookSpec()`. Outbound `sendMessage` calls from Uptime Kuma are completely orthogonal to inbound `callback_query` webhooks.
  4. `verifyTelegramBotConsumerSafety()` explicitly blocks accidental reuse of `@homelab_core_bot` (`8633834424`), blocks concurrent `getUpdates` pollers, and refuses to overwrite any foreign webhook URL.

### 3.3 Owner-Only Approval & Callback Verification (`verifyTelegramApproval`)
1. **Draft Notification:** `@Home_Lab_info_bot` sends a clearly labeled message (`🌐 HomeLabCore Web — Publication Approval`) to `HOMELAB_OWNER_TELEGRAM_ID` with two namespaced inline buttons:
   - `✅ Approve & Open PR` (`hlc-pub|approve|<shortSlug>|<hmac16>`)
   - `🛑 Reject Draft` (`hlc-pub|reject|<shortSlug>|<hmac16>`)
2. **Strict Multi-Layer Callback Verification:**
   - Constant-time comparison of `X-Telegram-Bot-Api-Secret-Token` against `HOMELAB_INFO_WEBHOOK_SECRET`.
   - Deduplication of `update.update_id` (`seenUpdateIds`) so webhook retries never create duplicate PRs.
   - Namespace check requiring `callback_query.data` to start with `hlc-pub|`.
   - Origin check verifying the prompt message came from `@Home_Lab_info_bot` (`id: 8967925790`).
   - **Owner-only restriction:** Requires `callback_query.message.chat.type === "private"`, `callback_query.from.id === HOMELAB_OWNER_TELEGRAM_ID`, and `callback_query.message.chat.id === HOMELAB_OWNER_TELEGRAM_ID`.
   - Constant-time HMAC-SHA256 verification of `hlc-pub|<action>|<shortSlug>|<sig>` using `HOMELAB_INFO_CALLBACK_SECRET`.
3. **Callback Acknowledgement:**
   - Immediately calls `answerCallbackQuery` and clears the inline keyboard (`editMessageReplyMarkup`) so buttons cannot be double-clicked.
   - Only `decision === "approve"` proceeds to create the isolated `auton-pub/<slug>` GitHub PR; `decision === "reject"` discards the draft cleanly.

---

## 4. Credential Management & Production Activation Steps (Zero-Secret Policy)

Never commit credentials, webhook secrets, chat IDs, or private URLs to Git. The n8n workflow (`automation/n8n/homelabcore-autonomous-publishing.workflow.json`) is committed with `"active": false`.

When the owner authorizes enabling live n8n automated publishing in production:

1. **Configure n8n Environment Variables:**

| Variable / Credential | Purpose | Source / Storage |
|---|---|---|
| `GITHUB_WEBHOOK_SECRET` | HMAC-SHA256 secret configured on GitHub repository webhooks (`X-Hub-Signature-256`) | Random 32-byte hex in n8n env + GitHub Webhook settings |
| `HOMELAB_INFO_BOT_TOKEN` | Existing **HomeLab Info** (`@Home_Lab_info_bot`, `8967925790`) Bot API token | Existing token from Uptime Kuma notification #1 (stored in n8n env) |
| `HOMELAB_INFO_WEBHOOK_SECRET` | Secret token sent by Telegram in `X-Telegram-Bot-Api-Secret-Token` (32–256 chars `[A-Za-z0-9_-]`) | Generated once and stored in n8n env + passed to `setWebhook` |
| `HOMELAB_INFO_CALLBACK_SECRET` | HMAC key used to sign `hlc-pub\|...` inline button `callback_data` payloads | Random 32-byte hex in n8n env |
| `HOMELAB_OWNER_TELEGRAM_ID` | Numeric Telegram user/chat ID of the authorized repository owner | Same owner chat ID configured in Uptime Kuma notification #1 |
| `GitHub API Token` | Fine-grained PAT scoped to `HomeLab-NL/HomeLabCore-Web` (`contents:write`, `pull_requests:write`, `checks:read`) | Stored in n8n Credentials (`httpHeaderAuth`) |

2. **Import & Activate Workflow in n8n:**
   - Import `automation/n8n/homelabcore-autonomous-publishing.workflow.json` into n8n, bind the `GitHub API Token` credential, and activate the workflow.
3. **Register the Non-Conflicting Webhook on `@Home_Lab_info_bot`:**
   - Verify `getWebhookInfo` is empty (`url: ""`), then register the callback-only webhook:
     ```bash
     curl -fsS -X POST "https://api.telegram.org/bot${HOMELAB_INFO_BOT_TOKEN}/setWebhook" \
       -H "Content-Type: application/json" \
       -d "{
         \"url\": \"https://n8n.homelabcore.dev/webhook/homelab-info-web-approval\",
         \"secret_token\": \"${HOMELAB_INFO_WEBHOOK_SECRET}\",
         \"allowed_updates\": [\"callback_query\"],
         \"drop_pending_updates\": false,
         \"max_connections\": 20
       }"
     ```

---

## 5. Deployment, Autonomous Merge Policy & Rollback

### Autonomous Website Deployment Policy
1. Website changes are developed on isolated branches (`feat/*`, `fix/*`, `claude/*`, `content/*`, `auton-pub/*`) and opened as Pull Requests targeting `main`.
2. **Pre-Merge Gate:** Confirm zero merge conflicts and verify that all required CI checks (`CI/build-and-test`, `verify`, and `Cloudflare Pages` preview) pass.
3. **Merge & Live Verification:** Merge the PR into `main`, wait for the Cloudflare Pages production build on `main` to succeed, and verify the live site (`https://homelabcore.dev`), including affected routes and favicons.
4. **Automatic Recovery:** If a deployment check or live verification fails, immediately fix or revert the change via a follow-up PR or Cloudflare Pages rollback.

### Rollback Procedures
- **Option A — Git Revert PR (Recommended, preserves Git history):**
  ```bash
  git fetch origin
  git checkout -b fix/revert-last-publication origin/main
  git revert -m 1 HEAD --no-edit
  git push -u origin fix/revert-last-publication
  gh pr create --base main --head fix/revert-last-publication --title "revert: roll back last publication" --body "Rolling back the previous merge to main."
  ```
- **Option B — Instant Cloudflare Pages Rollback:**
  In the Cloudflare dashboard (`Workers & Pages` → `HomeLabCore-Web` → `Deployments`), select the previous known-good production deployment and click **Rollback to this deployment**.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `test:meta` fails with `description length N (want 50–230)` | Project `summary` or blog `description` is shorter than 50 or longer than 230 characters. | Edit the `summary` / `description` in JSON/Markdown or `src/i18n/projects.ts` so it is 50–230 characters. |
| `test:meta` fails with `og:image file missing` | Added a project `cover` without regenerating `public/og/<id>.jpg`. | Run `npm run og` and commit `public/og/<id>.jpg`. |
| `test:headers` fails with CSP violation | `dist/_headers` inline script SHA-256 hashes are stale. | Always run `npm run build` (which runs `node scripts/build-headers.mjs` after `astro build`) before `npm test`. |
| `test:budget` fails (`> 250 KB`) | Unoptimized image added to a page. | Compress WebP assets in `src/assets/projects/` (target ≤ 140 KB per source WebP). |
| `SecurityPolicyError` in `test:publishing` | Draft contains a token pattern, RFC1918/Tailscale IP, or internal hostname. | Remove sensitive infrastructure details before publishing. |
