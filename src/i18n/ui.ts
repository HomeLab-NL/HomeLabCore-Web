// Interface strings shared by every page, per language. English is the
// reference; the other languages must provide every key (checked by type).
import type { Locale } from "./locales";

const en = {
  skip: "Skip to content",
  menu: "Menu",
  navPrimary: "Primary",
  navSecondary: "Secondary",
  nav: { home: "Home", apps: "Apps", lab: "Lab", benchmarks: "Benchmarks", about: "About", support: "Support" },
  theme: { dark: "Dark", light: "Light", word: "theme" },
  language: "Language",
  languageEnglishOnly: "This page is in English only",
  footer: {
    label: "Footer",
    desc: "An independent software lab: apps, experiments, games and AI benchmarks.",
    apps: "Apps",
    lab: "Lab",
    privacy: "Privacy",
    studio: "Studio",
    englishOnly: "Privacy policies and support pages are in English.",
  },
  status: {
    "closed-testing": "Closed testing",
    "active-development": "In development",
    experiment: "Experiment",
    live: "Live",
    archived: "Archived",
  },
  platform: { Android: "Android", Web: "Web", "Self-hosted": "Self-hosted", tba: "To be announced" } as Record<string, string>,
  meta: { status: "Status", type: "Type", platform: "Platform", workingTitle: "Working title" },
  product: { overview: "Overview", privacy: "Privacy Policy", support: "Support", breadcrumb: "Breadcrumb", pages: (name: string) => `${name} pages` },
  figure: {
    fig: "Fig.",
    openFull: "(open full-size image)",
    placeholder: "Placeholder",
    notAvailable: "Visual not available yet.",
    concept: "Concept art · Not gameplay",
    promo: "Promotional artwork",
  },
  gallery: {
    label: "Gallery",
    screens: (name: string) => `${name} screens`,
    visuals: (name: string) => `${name} visuals`,
    hint: "Select an image to see it at full size.",
  },
  card: { noVisuals: (name: string) => `No ${name} visuals published yet.` },
  project: {
    noVisuals: (name: string) => `No ${name} screenshots or visuals have been published yet.`,
    moreTitle: "More information coming",
    moreIntro: (name: string) => `${name} is a work in progress, and this page only states what has been confirmed so far. Still to come:`,
    questions: "Questions in the meantime:",
    getSupport: "Get support",
  },
};

export type UI = typeof en;

const nl: UI = {
  skip: "Naar de inhoud",
  menu: "Menu",
  navPrimary: "Hoofdmenu",
  navSecondary: "Overig",
  nav: { home: "Home", apps: "Apps", lab: "Lab", benchmarks: "Benchmarks", about: "Over ons", support: "Support" },
  theme: { dark: "Donker", light: "Licht", word: "thema" },
  language: "Taal",
  languageEnglishOnly: "Deze pagina is alleen in het Engels",
  footer: {
    label: "Footer",
    desc: "Een onafhankelijk softwarelab: apps, experimenten, games en AI-benchmarks.",
    apps: "Apps",
    lab: "Lab",
    privacy: "Privacy",
    studio: "Studio",
    englishOnly: "Privacybeleid en supportpagina's zijn in het Engels.",
  },
  status: {
    "closed-testing": "Gesloten test",
    "active-development": "In ontwikkeling",
    experiment: "Experiment",
    live: "Live",
    archived: "Gearchiveerd",
  },
  platform: { Android: "Android", Web: "Web", "Self-hosted": "Zelf gehost", tba: "Nog niet bekend" },
  meta: { status: "Status", type: "Type", platform: "Platform", workingTitle: "Werktitel" },
  product: { overview: "Overzicht", privacy: "Privacybeleid", support: "Support", breadcrumb: "Kruimelpad", pages: (name) => `Pagina's van ${name}` },
  figure: {
    fig: "Afb.",
    openFull: "(afbeelding op volledige grootte openen)",
    placeholder: "Tijdelijke plek",
    notAvailable: "Nog geen beeld beschikbaar.",
    concept: "Concept art · Geen gameplay",
    promo: "Promotiebeeld",
  },
  gallery: {
    label: "Galerij",
    screens: (name) => `Schermen van ${name}`,
    visuals: (name) => `Beelden van ${name}`,
    hint: "Kies een afbeelding om haar op volledige grootte te zien.",
  },
  card: { noVisuals: (name) => `Nog geen beelden van ${name} gepubliceerd.` },
  project: {
    noVisuals: (name) => `Er zijn nog geen schermafbeeldingen of beelden van ${name} gepubliceerd.`,
    moreTitle: "Meer informatie volgt",
    moreIntro: (name) => `${name} is nog in ontwikkeling; deze pagina vermeldt alleen wat al bevestigd is. Nog te verwachten:`,
    questions: "Vragen in de tussentijd:",
    getSupport: "Hulp krijgen",
  },
};

const uk: UI = {
  skip: "Перейти до змісту",
  menu: "Меню",
  navPrimary: "Головне меню",
  navSecondary: "Додатково",
  nav: { home: "Головна", apps: "Застосунки", lab: "Лабораторія", benchmarks: "Бенчмарки", about: "Про нас", support: "Підтримка" },
  theme: { dark: "Темна", light: "Світла", word: "тема" },
  language: "Мова",
  languageEnglishOnly: "Ця сторінка доступна лише англійською",
  footer: {
    label: "Нижнє меню",
    desc: "Незалежна програмна лабораторія: застосунки, експерименти, ігри та AI-бенчмарки.",
    apps: "Застосунки",
    lab: "Лабораторія",
    privacy: "Конфіденційність",
    studio: "Студія",
    englishOnly: "Політики конфіденційності та сторінки підтримки — англійською.",
  },
  status: {
    "closed-testing": "Закрите тестування",
    "active-development": "У розробці",
    experiment: "Експеримент",
    live: "Доступно",
    archived: "В архіві",
  },
  platform: { Android: "Android", Web: "Веб", "Self-hosted": "Власний сервер", tba: "Буде оголошено" },
  meta: { status: "Статус", type: "Тип", platform: "Платформа", workingTitle: "Робоча назва" },
  product: { overview: "Огляд", privacy: "Політика конфіденційності", support: "Підтримка", breadcrumb: "Навігаційний ланцюжок", pages: (name) => `Сторінки ${name}` },
  figure: {
    fig: "Рис.",
    openFull: "(відкрити зображення в повному розмірі)",
    placeholder: "Заповнювач",
    notAvailable: "Зображення ще немає.",
    concept: "Концепт-арт · Не геймплей",
    promo: "Рекламне зображення",
  },
  gallery: {
    label: "Галерея",
    screens: (name) => `Екрани ${name}`,
    visuals: (name) => `Зображення ${name}`,
    hint: "Виберіть зображення, щоб побачити його в повному розмірі.",
  },
  card: { noVisuals: (name) => `Зображень ${name} ще не опубліковано.` },
  project: {
    noVisuals: (name) => `Скриншотів чи зображень ${name} ще не опубліковано.`,
    moreTitle: "Більше інформації згодом",
    moreIntro: (name) => `${name} ще в роботі, тож тут лише те, що вже підтверджено. Ще буде:`,
    questions: "Питання тим часом:",
    getSupport: "Отримати підтримку",
  },
};

const UI_STRINGS: Record<Locale, UI> = { en, nl, uk };

export function ui(lang: Locale): UI {
  return UI_STRINGS[lang];
}
