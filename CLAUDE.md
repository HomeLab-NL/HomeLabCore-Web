# CLAUDE.md — Ad-Hoc Maintenance Guide for Claude Code

Read **[AGENTS.md](./AGENTS.md)** first for shared repository rules, schemas, validation suites, and security constraints. This guide covers day-to-day ad-hoc maintenance performed by Claude Code on the owner's PC.

---

## 1. Standard Ad-Hoc Workflow (Zero n8n Dependency)

Ordinary manual website updates use a direct GitHub workflow with **no n8n or Telegram bot dependency**:

```
Owner request → Claude Code → GitHub (branch & PR) → GitHub Actions CI → Cloudflare Pages
```

GitHub (`HomeLab-NL/HomeLabCore-Web`) is the single source of truth. Never edit `main` directly and never rely on unpushed local branches. Even if the n8n autonomous publishing workflow is paused or offline, ad-hoc updates through Claude Code work identically.

```bash
# 1. Fetch latest remote state and prune merged branches
git fetch origin --prune

# 2. Create an isolated worktree (preferred) or branch from origin/main
git worktree add ../hlc-worktree-task -b claude/<short-task-name> origin/main
cd ../hlc-worktree-task
npm ci

# 3. Make requested content or portfolio updates
# ...

# 4. Run full verification (regenerate OG if cover images changed)
npm run og
npm run check && npm run build && npm test && npm run test:publishing

# 5. Commit, push branch, and open a Pull Request
git add -A
git commit -m "content(<scope>): <concise description>"
git push -u origin claude/<short-task-name>
gh pr create --base main --head claude/<short-task-name> --fill

# 6. Wait for CI (build-and-test, verify, Cloudflare Pages preview) to pass, then merge & verify live site
gh pr checks --watch
gh pr merge --squash --delete-branch
```

After the PR is merged on GitHub and Cloudflare Pages deploys `main` to `https://homelabcore.dev`, clean up the worktree:

```bash
cd /path/to/HomeLabCore-Web
git worktree remove ../hlc-worktree-task
git checkout main && git pull --ff-only origin main
```

---

## 2. Common Maintenance Recipes

### 2.1 Updating CookFrom Platform Status (Android / iOS)

CookFrom platform readiness is stored as structured data so status updates require editing only two files:

1. **`src/content/projects/cookfrom.json`:**
   - Update `"status"` (e.g., `"closed-testing"` → `"live"` once publicly confirmed).
   - Update `"version"` and the `"platformStatus"` array entries for `"Android"` and `"iOS"`.
   - When the public store listing is live, add `"googlePlay"` / `"appStore"` under `"urls"` and remove the corresponding item from `"missing"`.
2. **`src/i18n/projects.ts`:**
   - Update `PROJECT_TEXT.nl.cookfrom.platformStatus` and `PROJECT_TEXT.uk.cookfrom.platformStatus` (and `missing`).
3. **`src/views/CookFrom.astro` (if availability prose changes):**
   - Update `availText` in `COPY.en`, `COPY.nl`, and `COPY.uk`.

 Both the top project metadata block (`ProjectMeta.astro`) and the bottom Availability panel on `/apps/cookfrom` automatically render `platformStatus`.

### 2.2 Editing or Adding a Portfolio Project

1. **Assets:** Place WebP images in `src/assets/projects/<project-id>/` (keep individual gallery WebP files around 25–140 KB so the page stays well under the 250 KB total page budget).
2. **Project JSON:** Create or edit `src/content/projects/<project-id>.json`.
   - Ensure `summary` is **50–230 characters** (enforced by `scripts/check-meta.mjs`).
   - Label every image accurately (`"screenshot"`, `"composition"`, `"promo"`, `"concept"`, `"diagram"`, or `"illustration"`).
3. **Translations:** Update `src/i18n/projects.ts` (`PROJECT_TEXT.nl["<project-id>"]` and `PROJECT_TEXT.uk["<project-id>"]`).
   - Ensure `figures.length` in `nl` and `uk` matches `figures.length` in the JSON file.
   - Ensure `summary` in `nl` and `uk` is also **50–230 characters**.
4. **Routes (if adding a brand-new project):**
   - Register the route in `src/data/routes.ts` and `TRANSLATED_PATHS` in `src/i18n/locales.ts`.
   - Add the product name to `PRODUCT_NAMES` in `src/middleware.ts`.
5. **Social preview image:** Run `npm run og` to render `public/og/<project-id>.jpg` (`1200×630`).

### 2.3 Creating a Technical Blog or Devlog Article

1. Create `src/content/blog/YYYY-MM-DD-<slug>.md` with validated frontmatter:
   ```markdown
   ---
   title: "Descriptive English Title"
   description: "Summary between 50 and 230 characters for SEO and RSS feeds."
   published: "YYYY-MM-DD"
   category: "devlog" # release | devlog | architecture | milestone
   project: "ai-tutor" # optional project ID from src/content/projects/
   version: "0.2.0" # optional
   tags:
     - "Homework Tutor"
     - "Android"
   ---

   Article body in Markdown...
   ```
2. Run `npm run check && npm run build && npm test`.
   - Astro automatically generates `/blog/YYYY-MM-DD-<slug>/`, lists the article on `/blog/`, `/nl/blog/`, and `/uk/blog/`, adds it to `/sitemap.xml`, and publishes it in `/rss.xml`.

---

## 3. Avoiding Conflicts with Autonomous Publishing

- Automated publishing (`automation/n8n/homelabcore-autonomous-publishing.workflow.json`) **only** creates branches named `auton-pub/<date>-<slug>` and **only** adds a single new file `src/content/blog/<date>-<slug>.md`.
- Ad-hoc maintenance on `claude/*` or `content/*` branches will never conflict with `auton-pub/*` as long as each task uses a distinct dated blog filename and an isolated branch.
- Before starting an ad-hoc session, run `gh pr list` to see if any `auton-pub/*` PRs are open awaiting owner approval.

