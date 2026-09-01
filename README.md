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
/assets/css/styles.css                         Site styles
/assets/js/main.js                             Nav toggle + footer year
/assets/favicon.svg                            Favicon
/404.html                                      Not-found page
/robots.txt  /sitemap.xml                      SEO
```

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
