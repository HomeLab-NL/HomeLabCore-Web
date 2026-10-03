// Site-wide constants shared by layouts and components.

export const SITE_URL = "https://homelabcore.dev";

export const CONTACT = {
  privacy: "privacy@homelabcore.dev",
  support: "support@homelabcore.dev",
};

// Global navigation. `current` on a page highlights its item with
// aria-current="page"; `section` marks the parent section of a deeper page.
export type NavKey = "home" | "apps" | "about" | "support";

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "apps", label: "Apps", href: "/apps/" },
  { key: "about", label: "About", href: "/about" },
  { key: "support", label: "Support", href: "/support/" },
];
