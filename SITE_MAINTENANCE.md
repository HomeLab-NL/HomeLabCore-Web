# SITE_MAINTENANCE.md — Operations, Autonomous Publishing & Runbook

This runbook documents the operational lifecycle of **HomeLabCore-Web** (`https://homelabcore.dev`), including the n8n v2.0 Draft-PR-first autonomous publishing workflow, **HomeLab Info** (`@Home_Lab_info_bot`) Ukrainian Telegram approval & family access integration, multi-repository GitHub monitoring, Cloudflare Pages deployment, and rollback procedures.

---

## 1. Publishing Architecture Overview (v2.0 — Draft-PR-First & Family Access)

```
GitHub Event across Monitored Repositories (Release / [publish] Milestone)
  │
  ▼
1. Webhook Signature & Filter (HMAC-SHA256 + ignore routine commits, RCs, and self-PRs)
  │
  ▼
2. Cross-Repository Deduplication Check (verify sourceEventId not in src/content/blog/ or staticData)
  │
  ▼
3. AI Draft & Security Guard (English Markdown article + 2-3 sentence Ukrainian summary, block secrets/IPs)
  │
  ▼
4. Isolated GitHub Draft PR Created Immediately (branch: auton-pub/<slug> -> base: main, draft: true)
  │
  ▼
5. HomeLab Info (@Home_Lab_info_bot) Sends Concise Ukrainian Review Message to Authorized Family Members
   (Project, Title, 2-3 sentence summary, direct Draft PR link, ✅ Схвалити та опублікувати / 🛑 Відхилити)
  │
  ├──► If Rejected: Close Draft PR, delete branch auton-pub/<slug>, invalidate buttons for both users
  │
  ▼
6. On First Valid Approval: Lock state, invalidate buttons for both users, revalidate exact reviewedCommitSha & CI
  │
  ▼
7. Mark Draft PR Ready (GraphQL) -> Merge with exact SHA -> Poll Live URL -> Send Final Ukrainian Confirmation
```

### Key Files
- **n8n Workflow (importable v2.0):** `automation/n8n/homelabcore-autonomous-publishing.workflow.json`
- **Pipeline Module, Family Access, Multi-Repo Map & Security Guard:** `scripts/publishing/pipeline.mjs`
- **Automated Pipeline Test Suite:** `scripts/publishing/test-pipeline.mjs` (`npm run test:publishing`)
- **GitHub Actions CI:** `.github/workflows/verify.yml`

---

## 2. Multi-Repository Monitoring, Event Filtering & Deduplication

### 2.1 Monitored Repositories & Project Mapping

| Project | Source Repository | Events Monitored | Webhook Endpoint |
|---|---|---|---|
| **CookFrom** (`cookfrom`) | `HomeLab-NL/whats-for-dinner` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **KeyQuest** (`keyboard-trainer`) | `homelabnl-alt/KeyQuest`, `HomeLab-NL/keyboard-trainer` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **Homework Tutor** (`ai-tutor`) | `HomeLab-NL/homework-tutor` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **Ops Planner** (`ops-planner`) | `HomeLab-NL/ops-planner` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **AgentLab** (`agentlab`) | `HomeLab-NL/HomeLab-Core` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **At the Mountains of Madness** (`amom`) | `HomeLab-NL/amom-godot` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |
| **HomeLabCore-Web** (`homelabcore-web`) | `HomeLab-NL/HomeLabCore-Web` | `release`, `milestone` | `https://n8n.homelabcore.dev/webhook/homelabcore-github-events` |

### 2.2 Eligible Events
1. **GitHub Releases (`release.published`):**
   - Must be non-draft (`draft: false`) and non-prerelease (`prerelease: false`).
   - Ignored if tag/title matches release-candidate patterns (`-rc`, `alpha`, `beta`), contains `[skip-publish]`, or starts with routine prefixes (`fix:`, `chore:`, `ci:`, `build:`) without `[publish]`.
2. **GitHub Milestones (`milestone.closed`):**
   - Must explicitly include `[publish]` in the milestone title or description.
3. **Merged Pull Requests (`pull_request.closed` + `merged: true`):**
   - Must carry the `publish-milestone` or `release-note` label and must **not** originate from an `auton-pub/*` branch (self-trigger loop prevention).

### 2.3 Cross-Repository Deduplication
- Every eligible event is assigned a deterministic `sourceEventId` (`<owner>/<repo>#<type>:<id>`) recorded in the blog post frontmatter and in n8n's `$getWorkflowStaticData('global').processedEvents`.
- If `sourceEventId` or the target slug already exists in `src/content/blog/*.md` or `processedEvents`, execution stops cleanly.

---

## 3. HomeLab Info (`@Home_Lab_info_bot`) Integration, Family Access & Coexistence

### 3.1 Bot Separation in the HomeLab Ecosystem

| Bot Name | Username | Bot ID | Role | Webhook / Consumer |
|---|---|---|---|---|
| **HomeLab Info** | `@Home_Lab_info_bot` | `8967925790` | 1. Uptime Kuma monitoring alerts (`HomeLab production /healthz` + `HomeLab Backup` push heartbeat)<br>2. **HomeLabCore-Web Ukrainian publication approvals & family enrollment** | Outbound `sendMessage` from Uptime Kuma + dedicated n8n webhook `/webhook/homelab-info-web-approval` (`allowed_updates: ["message", "callback_query"]`) |
| **HomeLab Assistant** | `@homelab_core_bot` | `8633834424` | AgentLab / HomeLab worker task intake & systemd `OnFailure` alerts (`homelab-alert-telegram`) | Reserved for `/webhook/telegram-p0-gateway` — **never reused or modified by web publishing** |

### 3.2 Family Access & Secure Spouse Enrollment (2 Steps)
Both the Owner and the Spouse can review Draft PRs and approve or reject publications through `@Home_Lab_info_bot`:
1. **Spouse Initiates `/start`:** The spouse opens `@Home_Lab_info_bot` in Telegram and taps **Start** (`/start`).
   - `/start` **never** grants approval permissions automatically.
   - The bot replies to the spouse in Ukrainian confirming that the request has been forwarded to the owner, and sends an enrollment confirmation prompt to the Owner with inline buttons: `✅ Підтвердити доступ` (`e|a|<candidateId>|<hmac16>`) and `🛑 Відхилити` (`e|r|<candidateId>|<hmac16>`).
2. **Owner Confirms Access:** Only the primary Owner (`ownerTelegramId`) can tap `✅ Підтвердити доступ`. Once confirmed, the spouse's Telegram user ID is added to `staticData.global.config.authorizedUsers` (capped at 2 authorized family members), and the spouse receives a Ukrainian confirmation message.

### 3.3 Ukrainian Review Messages, Exact SHA Binding & First-Decision-Wins
1. **Draft PR Created First:** Before sending any Telegram message, the pipeline creates branch `auton-pub/<slug>`, commits the Markdown file, and opens a **GitHub Draft PR** (`draft: true`), capturing the exact `reviewedCommitSha`.
2. **Human-Readable Ukrainian Prompt:** `@Home_Lab_info_bot` sends a concise Ukrainian notification to all `authorizedUsers` containing:
   - `*Проєкт:*` Project name
   - `*Заголовок:*` Article title
   - `*Короткий опис:*` 2–3 sentence summary in Ukrainian
   - `*Чернетка (Draft PR):*` Direct link to the GitHub Draft PR so the full article can be read before approval
   - Inline buttons: `✅ Схвалити та опублікувати` and `🛑 Відхилити`
   - Technical metadata (branch names, file paths, event IDs, commit SHAs) are omitted from user notifications and kept only in execution logs.
3. **First Valid Decision Wins & Dual Button Invalidation:**
   - The first valid click from either authorized family member immediately transitions `pendingDrafts[shortSlug].status` from `pending_approval` to `approved` or `rejected` and removes the inline buttons from **both** family members' Telegram messages (`editMessageReplyMarkup`).
   - Any subsequent or duplicate callback is safely ignored.
4. **Pre-Merge Commit SHA & CI Guard:**
   - On approval, the pipeline polls GitHub `pulls/<N>` and `commits/<sha>/check-runs`.
   - If the PR head commit SHA no longer matches `reviewedCommitSha`, auto-merge is aborted immediately and both family members are alerted.
   - Once CI checks pass and the SHA matches, the Draft PR is marked ready for review via GraphQL (`markPullRequestReadyForReview`) and merged via `PUT /repos/HomeLab-NL/HomeLabCore-Web/pulls/<N>/merge` with `"sha": reviewedCommitSha`.
   - After verifying HTTP 200 on `https://homelabcore.dev/blog/<slug>/`, the bot sends the final Ukrainian confirmation with the live article link to both family members.

---

## 4. Production n8n Configuration & Rollback

### 4.1 Production Workflow (`homelab-prod-n8n-1`)
- **Workflow Name:** `HomeLabCore Autonomous Publishing Pipeline (HomeLab Info Bot)` (`v2.0.0`)
- **Production Workflow ID:** `qsOj6VaoKwwXJCVr` (`active: true`)
- **Encrypted n8n Credentials:**
  - `HomeLab Info Bot (Web Publishing)` (`telegramApi`)
  - `HomeLab Info Web Approval Secret` (`httpHeaderAuth`)
  - `HomeLabCore Web GitHub API` (`httpHeaderAuth`)

### 4.2 Rollback Procedures

#### Option A — Disable or Roll Back n8n Workflow to v1.2.0
1. **Deactivate the workflow immediately:**
   ```bash
   curl -fsS -X POST "https://n8n.homelabcore.dev/api/v1/workflows/qsOj6VaoKwwXJCVr/deactivate" \
     -H "X-N8N-API-KEY: ${N8N_API_KEY}"
   ```
2. **Restore previous workflow definition (`v1.2.0`) if needed:**
   A full backup of the pre-v2.0 workflow nodes and connections is stored on the production host at `/srv/homelab/config/production/workflow_v1.2.0_backup.json`.

#### Option B — Git Revert PR (Website Content/Code Rollback)
```bash
git fetch origin
git checkout -b fix/revert-last-publication origin/main
git revert -m 1 HEAD --no-edit
git push -u origin fix/revert-last-publication
gh pr create --base main --head fix/revert-last-publication --title "revert: roll back last publication" --body "Rolling back the previous merge to main."
```

#### Option C — Instant Cloudflare Pages Rollback
In the Cloudflare dashboard (`Workers & Pages` → `homelabcore-web` → `Deployments`), select the previous known-good production deployment and click **Rollback to this deployment**.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `test:meta` fails with `description length N (want 50–230)` | Project `summary` or blog `description` is shorter than 50 or longer than 230 characters. | Edit the `summary` / `description` in JSON/Markdown or `src/i18n/projects.ts` so it is 50–230 characters. |
| `test:meta` fails with `og:image file missing` | Added a project `cover` without regenerating `public/og/<id>.jpg`. | Run `npm run og` and commit `public/og/<id>.jpg`. |
| `test:headers` fails with CSP violation | `dist/_headers` inline script SHA-256 hashes are stale. | Always run `npm run build` (which runs `node scripts/build-headers.mjs` after `astro build`) before `npm test`. |
| `test:budget` fails (`> 250 KB`) | Unoptimized image added to a page. | Compress WebP assets in `src/assets/projects/` (target ≤ 140 KB per source WebP). |
| `SecurityPolicyError` in `test:publishing` | Draft contains a token pattern, RFC1918/Tailscale IP, or internal hostname. | Remove sensitive infrastructure details before publishing. |
