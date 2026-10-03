// @ts-check
import { defineConfig } from "astro/config";

// Static output only. Every page is emitted as <route>/index.html (plus
// 404.html), the same file layout the hand-written site used, so Cloudflare
// Pages serves identical URLs. Links keep their existing trailing-slash
// spelling; slash normalisation is a separate, later change.
export default defineConfig({
  site: "https://homelabcore.dev",
  output: "static",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
});
