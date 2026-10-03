# HomeLabCore-Web

Public website for **HomeLabCore** and its apps (CookFrom, Ops Planner),
served at <https://homelabcore.dev/>.

## Stack

A static [Astro](https://astro.build/) site. Astro renders every page to plain
HTML at build time; the browser gets HTML, one CSS file and one small vanilla
JavaScript file — no framework runtime.

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
| `npm run test:a11y` | axe accessibility check (WCAG A/AA) on every page |
| `npm test` | All three checks (after `npm run build`) |

CI (`.github/workflows/ci.yml`) runs the type check, build and all checks on
every pull request and on pushes to `main`.

## Structure

```
astro.config.mjs                Static output, <route>/index.html file layout
src/
  content.config.ts             Schema for the apps collection
  content/apps/*.json           One entry per app: name, brand, URLs, card copy
  data/site.ts                  Site URL, contact emails, global navigation
  data/routes.ts                Every page's path + lastmod (canonical URLs, sitemap)
  layouts/BaseLayout.astro      <head>, header, footer, script
  layouts/ProductLayout.astro   App pages: accent, breadcrumb, product sub-nav
  components/                   SiteHeader, SiteFooter, ProductPageBar,
                                AppCard, ComingSoonCard, Icon
  pages/                        One .astro file per page (URL = file path)
  pages/sitemap.xml.ts          sitemap.xml, generated from data/routes.ts
public/                         Copied to dist/ unchanged
  assets/css/styles.css         Site styles (colour tokens, see below)
  assets/js/main.js             Nav toggle + footer year
  assets/brand/                 Logo files
  robots.txt
scripts/
  legacy-urls.txt               URLs that must keep working
  check-urls.mjs                URL / link / sitemap check
  check-a11y.mjs                axe check, with documented known issues
```

## URLs

Each page is emitted as `<route>/index.html` (plus `404.html`), the same file
layout as the earlier hand-written site, so every existing URL keeps working.
`scripts/legacy-urls.txt` lists them; removing one needs a redirect. App store
listings link to the privacy and support pages, so those URLs must never
break.

Links currently keep their historical spelling (`/apps/cookfrom` without a
trailing slash, `/apps/ops-planner/` with one). Normalising this is a separate
change.

## Colour tokens

`styles.css` has two token layers. **Palette** tokens hold raw brand colours
(`--hlc-*` HomeLabCore blue, `--cf-*` CookFrom orange, `--op-*` Ops Planner
teal) and are only referenced inside the token blocks. **Semantic** tokens say
what a colour is for (`--bg`, `--surface`, `--text`, `--accent`,
`--studio-accent`, `--preview-accent`, `--header-bg`, …); component rules use
only these. App pages set `data-brand` on `<html>`, which switches `--accent`
and `--preview-accent`. A new theme is a new set of semantic token values.

## Adding an app

1. Add `src/content/apps/<slug>.json` (the schema in `src/content.config.ts`
   says which fields are required; the build fails on a missing or invalid
   field). It then appears on `/apps/` and `/support/`, and on the homepage if
   `onHome` is true.
2. Add its accent to the palette and a `[data-brand="<brand>"]` block in
   `styles.css`, the brand to the `brand` enum and an icon to `Icon.astro`.
3. Create `src/pages/apps/<slug>/`, `privacy/<slug>/` and `support/<slug>/`
   pages using `ProductLayout`, add their routes to `src/data/routes.ts` and
   to `scripts/legacy-urls.txt` once published.

## Deployment

Cloudflare Pages deploys `main` to production. Build settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `22`

No secrets are required.

## Contacts

- Privacy: privacy@homelabcore.dev
- Support: support@homelabcore.dev
