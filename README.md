# HomeLabCore-Web

Public umbrella website for **HomeLabCore** and its first product, **CookFrom**.

## What this is

A plain static site — hand-written HTML, one CSS file, and a small vanilla
JavaScript file. There is **no framework and no build step**. Cloudflare Pages
serves the repository root directly.

## Structure

```
/                       index.html            HomeLabCore homepage
/apps/cookfrom/          index.html            CookFrom product page
/privacy/cookfrom/       index.html            CookFrom Privacy Policy
/support/cookfrom/       index.html            CookFrom Support
/assets/css/styles.css                         Site styles (dual accent system)
/assets/js/main.js                             Nav toggle + footer year
/assets/favicon.svg                            Favicon
/assets/brand/homelab-logo.png                 Supplied HomeLab logo — original, untouched
/assets/brand/homelab-logo-web.webp|.png       Web-optimized copies (560x560) used on the page
/404.html                                      Not-found page
/robots.txt  /sitemap.xml                      SEO
```

## Brand

HomeLabCore is the umbrella / studio brand (blue / navy, derived from the
logo). CookFrom is a product (warm orange). Product pages set
`data-brand="cookfrom"` on `<html>` to switch the active accent; the header
wordmark keeps its blue "Core" on every page so the studio stays recognisable.

The supplied HomeLab logo lives at `assets/brand/homelab-logo.png` (original,
untouched). The homepage shows it in full on a light panel via
`<picture>` — `homelab-logo-web.webp` (~11 KB) with `homelab-logo-web.png`
(~126 KB) as a fallback, both 560x560, aspect ratio preserved, with explicit
`width`/`height` to avoid layout shift. The header uses the textual
`HomeLabCore` wordmark rather than a cropped mark, so the artwork is never
altered.

Directory `index.html` files give the clean URLs `/apps/cookfrom`,
`/privacy/cookfrom`, and `/support/cookfrom`.

## Local preview

Open `index.html` in a browser, or serve the folder with any static server,
e.g. `python -m http.server`.

## Deployment

Production branch is `main`. Pushing to `main` triggers the Cloudflare Pages
production deploy. No environment variables or secrets are required.

## Contacts

- Privacy: privacy@homelabcore.dev
- Support: support@homelabcore.dev
