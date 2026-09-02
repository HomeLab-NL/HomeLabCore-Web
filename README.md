# HomeLabCore-Web

Public umbrella website for **HomeLabCore** and its first product, **CookFrom**.

## What this is

A plain static site — hand-written HTML, one CSS file, and a small vanilla
JavaScript file. There is **no framework and no build step**. Cloudflare Pages
serves the repository root directly.

## Structure

```
/                       index.html            HomeLabCore homepage (studio)
/apps/                   index.html            Apps directory
/apps/cookfrom/          index.html            CookFrom product page
/about/                  index.html            About HomeLabCore
/support/                index.html            Support directory
/support/cookfrom/       index.html            CookFrom Support
/privacy/cookfrom/       index.html            CookFrom Privacy Policy
/assets/css/styles.css                         Site styles (dual accent system)
/assets/js/main.js                             Nav toggle + footer year
/assets/favicon.svg                            Favicon
/assets/brand/homelab-logo.png                 Supplied HomeLab logo — original, untouched
/assets/brand/homelab-flask.png                 Cropped transparent flask mark (header, hero, footer)
/assets/brand/homelab-logo-web.webp|.png       Full logo, web copies — used on /about only
/404.html                                      Not-found page
/robots.txt  /sitemap.xml                      SEO
```

## Information architecture

HomeLabCore is the parent brand. Global navigation is **Home / Apps / About /
Support**. Individual apps live under `/apps/` — CookFrom is one product, not a
top-level peer of navigation or legal pages.

Each app has a product page (`/apps/<app>`), a privacy policy
(`/privacy/<app>`), and a support page (`/support/<app>`). Those pages carry a
breadcrumb (HomeLabCore → Apps → <App> → …) and a small product sub-nav
(Overview / Privacy Policy / Support); the global navigation stays unchanged.

Adding another app = add one card to `/apps/` and `/support/`, then create the
three product pages. No navigation or layout changes are required.

## Brand

HomeLabCore is the umbrella / studio brand (blue / navy, derived from the
logo). CookFrom is a product (warm orange). Product pages set
`data-brand="cookfrom"` on `<html>` to switch the active accent; the header
wordmark keeps its blue "Core" on every page so the studio stays recognisable.

The supplied HomeLab logo lives at `assets/brand/homelab-logo.png` (original,
untouched). Site chrome uses a compact lockup — a small flask mark
(`homelab-flask.png`, the flask element cropped from the source and keyed to
transparent) beside the textual `HomeLabCore` wordmark. This appears in the
header, the homepage hero (as a small secondary mark, not the full vertical
logo), and the footer. The full vertical logo still appears once, on `/about`,
inside its light panel.

## Local preview

Open `index.html` in a browser, or serve the folder with any static server,
e.g. `python -m http.server`.

## Deployment

Production branch is `main`. Pushing to `main` triggers the Cloudflare Pages
production deploy. No environment variables or secrets are required.

## Contacts

- Privacy: privacy@homelabcore.dev
- Support: support@homelabcore.dev
