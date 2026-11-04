# AGENTS.md — Shared Multi-Agent Repository Instructions

This document is the authoritative contract for all AI agents and automation systems working on **HomeLabCore-Web** (`https://homelabcore.dev`, repository `HomeLab-NL/HomeLabCore-Web`):

- **Gemini (Antigravity):** Architecture, portfolio engineering, and publishing automation.
- **Claude Code (Owner PC):** Ad-hoc content updates, status adjustments, and blog posts.
- **n8n Autonomous Publishing (`auton-pub/*`):** Event-driven release and milestone draft PRs.

---

## 1. Core Principles & Single Source of Truth

1. **GitHub (`HomeLab-NL/HomeLabCore-Web`) is the single source of truth.** Never rely on local uncommitted state or manual file copying between machines.
2. **Never commit or push directly to `main`.** Pushing to `main` triggers a production deployment on Cloudflare Pages (`homelabcore.dev`).
3. **Never merge a Pull Request to `main` without explicit owner authorization.**
4. **Always use isolated branches or Git worktrees per task:**
   - Gemini branches: `feat/<topic>` or `fix/<topic>`
   - Claude Code ad-hoc branches: `claude/<topic>` or `content/<topic>`
   - Automated publishing branches: `auton-pub/<date>-<slug>`
5. **Never force-push (`git push --force`) shared branches.**
6. **Never expose secrets, tokens, internal IPs, or private infrastructure hostnames.** This is a **public** repository.

---

## 2. Content Architecture & Schemas (`src/content.config.ts`)

All structured content is validated at build time by Astro Content Collections (`src/content.config.ts`).

### 2.1 Projects (`src/content/projects/*.json` + `src/i18n/projects.ts`)

Each project JSON entry defines the English source of truth:

- `name` (`string`): Display name of the product (e.g., `"CookFrom"`, `"Homework Tutor"`, `"KeyQuest"`). Note: also register product names in `src/middleware.ts` so `translate="no"` protects them.
- `section` (`"apps" | "lab"`): Determines whether the project is listed under `/apps/` or `/lab/`.
- `kind` (`string`): Short category label (e.g., `"Android app"`, `"Web app"`, `"Game"`).
- `platforms` (`string[]`): `"Android"`, `"iOS"`, `"Web"`, `"Self-hosted"`, or `[]` (TBA).
- `status`: `"closed-testing" | "active-development" | "experiment" | "live" | "archived"`.
- `version` (`string`, optional): Verified release or build version (e.g., `"0.12.0+141 RC"`).
- `releaseDate` (`string`, optional): Verified ISO date (`YYYY-MM-DD`).
- `platformStatus` (`{ platform: string; status: string; version?: string }[]`, optional): Per-platform release status (used by multi-platform apps like CookFrom).
- `summary` (`string`): Factual 1–2 sentence description. **Must be 50–230 characters** because generic project pages use `summary` as `<meta name="description">`.
- `workingTitle` (`string`, optional): Earlier or internal working name.
- `urls`:
  - `overview` (`string` starting with `/`): Canonical site path.
  - `privacy`, `support` (`string` starting with `/`, optional): Legal and support routes.
  - `live`, `repo`, `googlePlay`, `appStore` (`string` URL, optional): Verified external links.
- `features` (`{ title: string; description: string }[]`, optional): Verified feature list rendered on generic project pages.
- `contextNote` (`string`, optional): Verified background or community context (e.g., hackathon participation).
- `cover`, `hero` (`figure`, optional) & `figures` (`figure[]`):
  - `src`: Relative path to WebP image in `src/assets/projects/<id>/`.
  - `alt`, `caption`: Non-empty strings.
  - `kind`: `"screenshot" | "composition" | "illustration" | "diagram" | "concept" | "promo"`.
- `visualNote` (`string`, optional): Provenance note explaining what the visuals show.
- `missing` (`string[]`): Unconfirmed or upcoming items disclosed openly on the project page.

**Localization rule:** Every project in `src/content/projects/*.json` **must** have a matching Dutch (`nl`) and Ukrainian (`uk`) entry in `src/i18n/projects.ts` (`PROJECT_TEXT`), with the **exact same number of `figures`**.

### 2.2 Technical Blog & Devlog (`src/content/blog/*.md`)

Markdown files in `src/content/blog/` use the following frontmatter schema:

```yaml
---
title: "Concise English Title (max 56 chars)"
description: "Single-paragraph summary strictly between 50 and 230 characters for SEO and RSS validation."
published: "YYYY-MM-DD"
updated: "YYYY-MM-DD" # optional
category: "release" # "release" | "devlog" | "architecture" | "milestone"
project: "cookfrom" # optional reference to src/content/projects/<id>.json
version: "0.12.0" # optional
tags:
  - "CookFrom"
  - "Android"
sourceEventId: "HomeLab-NL/whats-for-dinner#release:v0.12.0" # optional deduplication ID
sourceUrl: "https://github.com/HomeLab-NL/whats-for-dinner" # optional
draft: false
---
```

- Blog articles are published in **English** at `/blog/<slug>/` and indexed automatically in `/blog/`, `/nl/blog/`, `/uk/blog/`, `/sitemap.xml`, and `/rss.xml`.
- Automated publishing writes only one new file per PR (`src/content/blog/YYYY-MM-DD-<slug>.md`) on an `auton-pub/*` branch, preventing merge conflicts with portfolio edits.

### 2.3 Site Updates (`src/content/updates.json` + `UPDATE_TEXT` in `src/i18n/projects.ts`)

Dated entries shown on the homepage under "Recent updates". Every `id` added to `src/content/updates.json` should have `nl` and `uk` translations in `UPDATE_TEXT` (`src/i18n/projects.ts`).

---

## 3. Build & Validation Commands

Run these commands in order before opening or updating any Pull Request:

```bash
# 1. Regenerate 1200x630 Open Graph preview images (required if any project cover changed)
npm run og

# 2. Astro & TypeScript content schema typecheck
npm run check

# 3. Production static build + CSS minification + CSP sha256 header injection
npm run build

# 4. Full 7-stage automated verification suite against dist/
npm test

# 5. Automated publishing pipeline & security guard unit tests
npm run test:publishing
```

### What `npm test` enforces:
1. **`test:urls` (`scripts/check-urls.mjs`):** All 24 legacy URLs (`scripts/legacy-urls.txt`), all internal `href`/`src`/`srcset` links, and all `<loc>` entries in `sitemap.xml` resolve in `dist/`.
2. **`test:html` (`html-validate`):** Strict HTML5 validation across every generated `.html` file.
3. **`test:meta` (`scripts/check-meta.mjs`):** Unique `<title>` per language, `<meta name="description">` strictly **50–230 characters**, `<link rel="icon">`, `canonical === og:url`, complete Open Graph & Twitter tags, existing `og:image` matching `1200×630`, complete `hreflang` (`en,nl,uk,x-default`), and no `localhost` or `pages.dev` in `<head>`.
4. **`test:headers` (`scripts/check-headers.mjs`):** Zero CSP violations or console errors in headless Chromium across all pages, light/dark themes, and 390px/1280px viewports.
5. **`test:a11y` (`scripts/check-a11y.mjs`):** Zero WCAG 2.0/2.1/2.2 A & AA axe-core violations across all pages, themes, and viewports.
6. **`test:theme` (`scripts/check-theme.mjs`):** Deterministic light default, localStorage persistence, keyboard toggle, and no-JS fallback.
7. **`test:budget` (`scripts/check-budget.mjs`):** Every page load at 390px and 1280px must stay under **250 KB total**, **40 KB CSS**, and **10 KB JS**.

---

## 4. Security & Editorial Guardrails

- **No secrets or internal network details:** Never commit API keys, tokens, webhook secrets, RFC1918 private IPs (`10.x`, `192.168.x`, `172.16-31.x`), Tailscale IPs (`100.64-127.x`), or internal hostnames (`qnap`, `minisforum`, `.local`, `.lan`).
- **Evidence-only claims:**
  - Do **not** claim an app is publicly released on Google Play or App Store / TestFlight without verified evidence.
  - Do **not** claim in-development features (such as Homework Tutor live AI backend) are production-ready.
  - For **KeyQuest**, mention participation in the Stripe Eindhoven Community hackathon associated with One Horizon, and **never** mention leaderboard positions, votes, rankings, awards, or victories.
  - Do **not** substitute the HomeLabCore studio flask logo for the Homework Tutor notebook-and-pencil app icon.

