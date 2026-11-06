import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/locales";

export type BlogPost = CollectionEntry<"blog">;

/**
 * Parses a blog collection entry ID into its target language and shared publication slug.
 * Supports:
 * - root files: `my-article.md` -> { lang: "en", slug: "my-article" }
 * - localized folders: `uk/my-article.md` -> { lang: "uk", slug: "my-article" }
 * - localized folders: `nl/my-article.md` -> { lang: "nl", slug: "my-article" }
 * - explicit en folder: `en/my-article.md` -> { lang: "en", slug: "my-article" }
 */
export function parseBlogEntryId(id: string): { lang: Locale; slug: string } {
  const parts = id.split("/");
  if (parts.length >= 2 && (parts[0] === "uk" || parts[0] === "nl" || parts[0] === "en")) {
    return { lang: parts[0] as Locale, slug: parts.slice(1).join("/") };
  }
  return { lang: "en", slug: id };
}

/**
 * Returns all published blog entries for a specific language, sorted newest first.
 */
export async function getBlogPosts(lang: Locale = "en"): Promise<{ post: BlogPost; slug: string }[]> {
  const allPosts = await getCollection("blog", (b) => !b.data.draft);
  const matched: { post: BlogPost; slug: string }[] = [];

  for (const post of allPosts) {
    const meta = parseBlogEntryId(post.id);
    const postLang = (post.data.lang || meta.lang) as Locale;
    if (postLang === lang) {
      matched.push({ post, slug: meta.slug });
    }
  }

  return matched.sort((a, b) => b.post.data.published.getTime() - a.post.data.published.getTime());
}

/**
 * Returns all unique publication slugs (shared across languages).
 */
export async function getAllBlogSlugs(): Promise<string[]> {
  const allPosts = await getCollection("blog", (b) => !b.data.draft);
  const slugs = new Set<string>();
  for (const post of allPosts) {
    const meta = parseBlogEntryId(post.id);
    slugs.add(meta.slug);
  }
  return Array.from(slugs);
}

/**
 * Returns a single blog entry matching the given shared publication slug and language.
 */
export async function getBlogPostBySlugAndLang(slug: string, lang: Locale): Promise<BlogPost | undefined> {
  const allPosts = await getCollection("blog", (b) => !b.data.draft);
  return allPosts.find((post) => {
    const meta = parseBlogEntryId(post.id);
    const postLang = (post.data.lang || meta.lang) as Locale;
    return meta.slug === slug && postLang === lang;
  });
}

