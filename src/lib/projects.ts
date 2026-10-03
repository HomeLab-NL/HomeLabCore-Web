import { getCollection, type CollectionEntry } from "astro:content";
import { STATUSES } from "../content.config";

export type Project = CollectionEntry<"projects">;

const byOrder = (a: Project, b: Project) => a.data.order - b.data.order;

export async function projectsIn(section: "apps" | "lab"): Promise<Project[]> {
  return (await getCollection("projects", (p) => p.data.section === section)).sort(byOrder);
}

export async function allProjects(): Promise<Project[]> {
  const all = await getCollection("projects");
  return [...all.filter((p) => p.data.section === "apps"), ...all.filter((p) => p.data.section === "lab")].sort(
    (a, b) => (a.data.section === b.data.section ? byOrder(a, b) : 0),
  );
}

export function statusLabel(status: Project["data"]["status"]): string {
  return STATUSES[status];
}

export function platformLabel(project: Project): string {
  return project.data.platforms.length ? project.data.platforms.join(", ") : "To be announced";
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
