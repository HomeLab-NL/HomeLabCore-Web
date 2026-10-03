// Site-wide constants shared by layouts and components.

export const SITE_URL = "https://homelabcore.dev";

export const CONTACT = {
  privacy: "privacy@homelabcore.dev",
  support: "support@homelabcore.dev",
};

/** localStorage key for the manual theme choice ("light" | "dark"). */
export const THEME_STORAGE_KEY = "hlc-theme";

// Global navigation. `current` on a page highlights its item with
// aria-current="page"; `section` marks the parent section of a deeper page.
export type NavKey = "home" | "apps" | "lab" | "benchmarks" | "about" | "support";

export const PRIMARY_NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "apps", label: "Apps", href: "/apps/" },
  { key: "lab", label: "Lab", href: "/lab/" },
  { key: "benchmarks", label: "Benchmarks", href: "/benchmarks/" },
  { key: "about", label: "About", href: "/about" },
];

export const SECONDARY_NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "support", label: "Support", href: "/support/" },
];
