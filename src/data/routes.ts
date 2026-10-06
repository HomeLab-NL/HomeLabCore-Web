// Every public page, keyed by name. This is the single source for canonical
// URLs and for sitemap.xml. Existing paths keep their historical
// trailing-slash spelling; new pages use a trailing slash.

export interface Route {
  path: string;
  lastmod: string;
  /** Excluded pages (e.g. 404) get no canonical link and no sitemap entry. */
  indexed: boolean;
}

export const ROUTES = {
  home: { path: "/", lastmod: "2026-10-03", indexed: true },
  apps: { path: "/apps/", lastmod: "2026-10-03", indexed: true },
  cookfrom: { path: "/apps/cookfrom", lastmod: "2026-10-03", indexed: true },
  opsPlanner: { path: "/apps/ops-planner/", lastmod: "2026-10-03", indexed: true },
  aiTutor: { path: "/apps/ai-tutor/", lastmod: "2026-10-03", indexed: true },
  keyboardTrainer: { path: "/apps/keyboard-trainer/", lastmod: "2026-10-03", indexed: true },
  lab: { path: "/lab/", lastmod: "2026-10-03", indexed: true },
  agentlab: { path: "/lab/agentlab/", lastmod: "2026-10-03", indexed: true },
  mountains: { path: "/lab/at-the-mountains-of-madness/", lastmod: "2026-10-03", indexed: true },
  benchmarks: { path: "/benchmarks/", lastmod: "2026-10-03", indexed: true },
  about: { path: "/about", lastmod: "2026-10-03", indexed: true },
  support: { path: "/support/", lastmod: "2026-10-03", indexed: true },
  supportCookfrom: { path: "/support/cookfrom", lastmod: "2026-09-02", indexed: true },
  privacyCookfrom: { path: "/privacy/cookfrom", lastmod: "2026-09-02", indexed: true },
  supportOpsPlanner: { path: "/support/ops-planner/", lastmod: "2026-09-24", indexed: true },
  privacyOpsPlanner: { path: "/privacy/ops-planner/", lastmod: "2026-09-24", indexed: true },
  notFound: { path: "/404", lastmod: "2026-10-03", indexed: false },
} satisfies Record<string, Route>;

export type RouteKey = keyof typeof ROUTES;

/** Route key for a project's overview page, matched by path. */
export function routeForPath(path: string): RouteKey {
  const hit = (Object.keys(ROUTES) as RouteKey[]).find((k) => ROUTES[k].path === path);
  if (!hit) throw new Error(`No route registered for ${path} — add it to src/data/routes.ts`);
  return hit;
}
