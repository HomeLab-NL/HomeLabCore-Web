# SITE_MAINTENANCE.md — Operations, Autonomous Publishing & Runbook

This runbook documents the operational lifecycle of **HomeLabCore-Web** (`https://homelabcore.dev`), including the n8n autonomous publishing workflow, Telegram approval gate, Cloudflare Pages deployment, rollback procedures, and credential management.

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
4. Telegram Owner Approval Prompt (✅ Approve & Open PR / 🛑 Reject)
  │
  ▼
5. Isolated GitHub PR (branch: auton-pub/<slug> -> base: main)
  │
  ▼
6. GitHub Actions Build & Validation (npm run check && npm run build && npm test)
  │
  ▼
7. Owner-Authorized Merge -> Cloudflare Pages Production Deployment
```

### Key Files
- **n8n Workflow (importable):** `automation/n8n/homelabcore-autonomous-publishing.workflow.json`
- **Pipeline Module & Security Guard:** `scripts/publishing/pipeline.mjs`
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

## 3. Telegram Approval & Owner Authorization

1. **Draft Notification:** When a new draft passes the security guard, the Telegram bot sends a preview message to `TELEGRAM_OWNER_CHAT_ID` containing the title, target branch (`auton-pub/<slug>`), event ID, and SEO summary, along with two inline buttons:
   - `✅ Approve & Open PR`
   - `🛑 Reject`
2. **Callback Verification (`verifyTelegramApproval`):**
   - Validates the `X-Telegram-Bot-Api-Secret-Token` HTTP header against `TELEGRAM_WEBHOOK_SECRET` using constant-time comparison.
   - Verifies `callback_query.from.id === TELEGRAM_OWNER_USER_ID` and `callback_query.message.chat.id === TELEGRAM_OWNER_CHAT_ID`.
   - Verifies the truncated HMAC-SHA256 signature embedded in `callback_data` (`action|shortSlug|sig`) using `TELEGRAM_CALLBACK_SECRET`.
3. **Production Merge Gate:**
   - Approving the Telegram prompt creates an isolated branch (`auton-pub/<slug>`) and opens a GitHub Pull Request against `main`.
   - GitHub Actions automatically runs `.github/workflows/verify.yml`.
   - **Production deployment never happens automatically on draft generation.** Merging to `main` requires passing CI checks and explicit owner merge authorization.

---

## 4. Credential Management (Zero-Secret Policy)

Never commit credentials, webhook secrets, chat IDs, or private URLs to Git. Configure the following environment variables inside the n8n runtime environment (or secret manager) when activating the workflow in production:

| Variable / Credential | Purpose | Rotation / Storage |
|---|---|---|
| `GITHUB_WEBHOOK_SECRET` | HMAC-SHA256 secret configured on GitHub repository webhooks (`X-Hub-Signature-256`) | Stored in n8n env + GitHub Webhook settings |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token used to send draft previews | Stored in n8n env / credential store |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token sent by Telegram in `X-Telegram-Bot-Api-Secret-Token` | Set via Telegram `setWebhook` `secret_token` |
| `TELEGRAM_CALLBACK_SECRET` | HMAC key used to sign inline button `callback_data` payloads | Random 32-byte hex in n8n env |
| `TELEGRAM_OWNER_CHAT_ID` | Numeric Telegram chat ID authorized to receive and approve drafts | Stored in n8n env |
| `TELEGRAM_OWNER_USER_ID` | Numeric Telegram user ID of the repository owner | Stored in n8n env |
| `GitHub API Token` | Fine-grained PAT scoped to `HomeLab-NL/HomeLabCore-Web` (`contents:write`, `pull_requests:write`, `checks:read`) | Stored in n8n Credentials (`httpHeaderAuth`) |

---

## 5. Deployment & Rollback

### Normal Production Deployment
1. Review the open PR on `https://github.com/HomeLab-NL/HomeLabCore-Web/pulls`.
2. Confirm the **verify** check (`.github/workflows/verify.yml`) is green.
3. Authorize and squash-merge the PR into `main`.
4. Cloudflare Pages automatically builds `main` (`npm run build`) and deploys `dist/` to `https://homelabcore.dev`.

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

