# HomeLabCore-Web

Public home of **HomeLabCore**: apps, lab projects, games and AI workflow
benchmarks. Served at <https://homelabcore.dev/>.

## Stack

A static [Astro](https://astro.build/) site. Every page is rendered to plain
HTML at build time; the browser gets HTML, one CSS file, one small vanilla
JavaScript file and optimised images (AVIF with WebP fallback).

- Node.js 22.12 or later (see `.nvmrc`)
- `npm ci` installs everything

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with live reload |
| `npm run build` | Build the site into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run check` | Type-check `.astro` and `.ts` files |
| `npm run test:urls` | Every legacy URL, internal link and sitemap URL resolves |
| `npm run test:html` | Validate built HTML (`html-validate`) |
| `npm run test:a11y` | axe (WCAG A/AA) on every page, light and dark, phone and desktop |
| `npm run test:theme` | Theme default, persistence, no flash, keyboard toggle, no-JS |
| `npm run test:budget` | Per-page download budget (total, CSS, JS) |
| `npm run test:meta` | Titles, descriptions, canonical, Open Graph/Twitter tags, social images, sitemap/robots |
| `npm run og` | Re-render the social preview images in `public/og/` |
| `npm test` | All of the above (after `npm run build`) |

CI (`.github/workflows/ci.yml`) runs the type check, the build and every
check on each pull request and on pushes to `main`.

## Structure

```
src/
  content.config.ts             Schemas: projects, updates, benchmarks
  content/projects/*.json       One entry per app or lab project
  content/updates.json          Dated site updates ("Recent updates")
  content/benchmarks/           Benchmark write-ups (none published yet)
  assets/                       Images processed by Astro (screenshots, illustrations)
  data/site.ts                  Site URL, contacts, navigation
  data/routes.ts                Every page's path + lastmod (canonical URLs, sitemap)
  lib/                          Project helpers, contrast maths, theme token reader
  layouts/                      BaseLayout (head, theme, header, footer), ProductLayout
  components/                   Header, footer, theme toggle, cards, figures, ...
  pages/                        One .astro file per page; apps/[slug] and lab/[slug]
                                generate pages for projects without a hand-written one
public/
  assets/css/styles.css         All styles: theme tokens + components
  assets/js/main.js             Menu, theme toggle, footer year
scripts/                        CI checks (URLs, a11y, theme, budget)
```

## Content rules

Project images come from a verified visual handoff (branch
`assets/phase2-visuals-20261003`, `handoff/phase2-visuals/`): only the
optimised `web/*.webp` files are copied into `src/assets/projects/`, and
their captions and alt text are taken verbatim from its `manifest.json`.
Each entry's `visualNote` keeps the provenance and limits documented there
(beta build, built-in sample mode, fictional sample data, diagram rather
than screenshot) visible on the page. The handoff folder itself is not part
of the site.

Project entries state facts only. Anything not yet available — screenshots,
store links, descriptions — goes in the entry's `missing` list; pages show a
clearly marked placeholder and list what is missing. Each figure says
what it is: `screenshot`, `composition` (whole real screenshots placed in a
neutral frame), `illustration`, or `diagram`.

## Adding a project

1. Add `src/content/projects/<slug>.json`. The schema in
   `src/content.config.ts` lists the fields; the build fails on a missing or
   invalid field.
2. Put any images in `src/assets/projects/<slug>/` and reference them from the
   entry (`cover`, `figures`).
3. Add the overview path to `src/data/routes.ts`. Apps and lab projects get a
   generated overview page; write `src/pages/apps/<slug>/index.astro` instead
   when the project needs a full product page (and exclude it in
   `src/pages/apps/[slug].astro`).
4. Released apps also get `privacy/<slug>` and `support/<slug>` pages using
   `ProductLayout`; add their URLs to `scripts/legacy-urls.txt` once
   published.

## Themes

Light is the default. A **Dark** toggle in the header switches themes; the
choice is saved in `localStorage` (`hlc-theme`) and applied by an inline
script in `<head>` before the stylesheet, so pages never flash the wrong
theme. The operating system's `prefers-color-scheme` is deliberately not
used: a first visit is always light, and a manual choice always wins.

Both themes share every component rule. `styles.css` defines the semantic
tokens (`--bg`, `--surface`, `--text`, `--studio-text`, ...) twice — under
`:root, [data-theme="light"]` and `[data-theme="dark"]`. Project accents have
a `fill` (decoration) and a `text` value per theme; the build checks every
accent text colour against each theme's backgrounds and fails below 4.5:1.

## Social previews

Every indexable page has complete Open Graph and Twitter
(`summary_large_image`) metadata with absolute `https://homelabcore.dev`
URLs. Images are 1200×630 and live in `public/og/`:

- `homelabcore.png` — global HomeLabCore image (fallback for every page)
- `<project>.jpg` — per project, made from its verified cover; concept art is
  labelled "Concept art · Not gameplay"

They are rendered by `scripts/og/render-og.mjs` (`npm run og`); re-run it after
changing a project cover. `public/_headers` sends `X-Robots-Tag: noindex` on
`*.pages.dev` preview hosts.

The header/footer flask marks (`public/assets/brand/homelab-flask-mark*.png`)
are built from the supplied logo by `scripts/brand/make-flask-marks.mjs`; the
dark-theme mark lightens only the outline.

## URLs

Every page is emitted as `<route>/index.html`, so `/x` and `/x/` both work on
Cloudflare Pages. `scripts/legacy-urls.txt` lists URLs that must keep
working — the privacy and support URLs are registered with Google Play and
must never break.

## Deployment

Cloudflare Pages deploys `main` to production and every branch to a preview.

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `22`

## Contacts

- Privacy: privacy@homelabcore.dev
- Support: support@homelabcore.dev
