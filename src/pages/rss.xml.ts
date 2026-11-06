import type { APIRoute } from "astro";
import { SITE_URL } from "../data/site";
import { getBlogPosts } from "../lib/blog";

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts("en");

  const items = posts
    .map(({ post, slug }) => {
      const url = `${SITE_URL}/blog/${slug}/`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${post.data.published.toUTCString()}</pubDate>`,
        `      <category>${escapeXml(post.data.category)}</category>`,
        `      <description>${escapeXml(post.data.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>HomeLabCore — Technical Blog &amp; Devlog</title>",
    `    <link>${SITE_URL}/blog/</link>`,
    "    <description>Verified release notes, engineering milestones, and development log from HomeLabCore.</description>",
    "    <language>en</language>",
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

