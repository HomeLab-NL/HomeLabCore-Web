// Every public page, keyed by name. This is the single source for canonical
// URLs and for sitemap.xml. Paths keep their current trailing-slash spelling.

export interface Route {
  path: string;
  lastmod: string;
  /** Excluded pages (e.g. 404) get no canonical link and no sitemap entry. */
  indexed: boolean;
}

export const ROUTES = {
  home: { path: "/", lastmod: "2026-09-02", indexed: true },
  apps: { path: "/apps/", lastmod: "2026-09-02", indexed: true },
  cookfrom: { path: "/apps/cookfrom", lastmod: "2026-09-02", indexed: true },
  opsPlanner: { path: "/apps/ops-planner/", lastmod: "2026-09-24", indexed: true },
  about: { path: "/about", lastmod: "2026-09-02", indexed: true },
  support: { path: "/support/", lastmod: "2026-09-02", indexed: true },
  supportCookfrom: { path: "/support/cookfrom", lastmod: "2026-09-02", indexed: true },
  privacyCookfrom: { path: "/privacy/cookfrom", lastmod: "2026-09-02", indexed: true },
  supportOpsPlanner: { path: "/support/ops-planner/", lastmod: "2026-09-24", indexed: true },
  privacyOpsPlanner: { path: "/privacy/ops-planner/", lastmod: "2026-09-24", indexed: true },
  notFound: { path: "/404", lastmod: "2026-09-02", indexed: false },
} satisfies Record<string, Route>;

export type RouteKey = keyof typeof ROUTES;
