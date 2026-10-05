import { getCollection, type CollectionEntry } from "astro:content";
import { href, type Locale } from "../i18n/locales";
import { PROJECT_TEXT } from "../i18n/projects";
import { ui } from "../i18n/ui";

export type Project = CollectionEntry<"projects">;

const byOrder = (a: Project, b: Project) => a.data.order - b.data.order;

export async function projectsIn(section: "apps" | "lab", lang: Locale = "en"): Promise<Project[]> {
  return (await getCollection("projects", (p) => p.data.section === section)).sort(byOrder).map((p) => localizeProject(p, lang));
}

export async function allProjects(lang: Locale = "en"): Promise<Project[]> {
  const all = await getCollection("projects");
  return [...all.filter((p) => p.data.section === "apps"), ...all.filter((p) => p.data.section === "lab")]
    .sort((a, b) => (a.data.section === b.data.section ? byOrder(a, b) : 0))
    .map((p) => localizeProject(p, lang));
}

/**
 * A project entry with its texts in the given language and its overview link
 * pointing at that language's page. English returns the entry unchanged.
 */
export function localizeProject(project: Project, lang: Locale): Project {
  if (lang === "en") return project;
  const t = PROJECT_TEXT[lang][project.id];
  if (!t) throw new Error(`No ${lang} text for project ${project.id} (src/i18n/projects.ts)`);
  const d = project.data;
  if (t.figures.length !== d.figures.length) throw new Error(`${lang}/${project.id}: ${t.figures.length} figure texts for ${d.figures.length} figures`);
  return {
    ...project,
    data: {
      ...d,
      kind: t.kind,
      summary: t.summary,
      visualNote: d.visualNote && t.visualNote,
      missing: t.missing,
      hero: d.hero && { ...d.hero, ...t.hero },
      cover: d.cover && { ...d.cover, ...t.cover },
      figures: d.figures.map((f, i) => ({ ...f, ...t.figures[i] })),
      urls: { ...d.urls, overview: href(d.urls.overview, lang) },
    },
  };
}

export function statusLabel(status: Project["data"]["status"], lang: Locale = "en"): string {
  return ui(lang).status[status];
}

export function platformLabel(project: Project, lang: Locale = "en"): string {
  const t = ui(lang).platform;
  return project.data.platforms.length ? project.data.platforms.map((p) => t[p] ?? p).join(", ") : t.tba;
}

/** CSS custom properties for every project with its own accent, both themes. */
export function accentCss(projects: Project[]): string {
  return projects
    .filter((p) => p.data.accent)
    .map((p) => {
      const a = p.data.accent!;
      return (
        `[data-project="${p.id}"]{--p-fill-light:${a.light.fill};--p-text-light:${a.light.text};` +
        `--p-fill-dark:${a.dark.fill};--p-text-dark:${a.dark.text}}`
      );
    })
    .join("");
}

/** Dates are shown as ISO (YYYY-MM-DD), in the monospace metadata style. */
export function formatDate(d: Date): string {
  return isoDate(d);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A project's figure (or hero/cover) by file name; build fails if it is missing. */
export function figureOf(project: Project, file: string) {
  const { hero, cover, figures } = project.data;
  const hit = [hero, cover, ...figures].find((f) => f && f.src.src.includes(file));
  if (!hit) throw new Error(`${project.id}: no figure matching ${file}`);
  return hit;
}
