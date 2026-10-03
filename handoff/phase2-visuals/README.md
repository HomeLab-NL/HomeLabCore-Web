# Phase 2 visual handoff

Status: **COMPLETE — asset preparation**, with the limitations below. Website integration has not been performed. Prepared on **3 October 2026**.

This self-contained package contains **18 REAL APPLICATION SCREENSHOTS**, **24 composed WebP visuals**, and **2 architecture WebPs**. Open [preview.html](preview.html) to review the website assets locally. No application, server, account, or build tool is needed to use the finished images.

## Recommended images

Paths are relative to this directory. Each app also has four `web/gallery-*.webp` images. Captions, descriptive alt text, dimensions, file sizes, source chains, and SHA-256 checksums are in [manifest.json](manifest.json).

| Project | Launched | Real screenshots | Website visuals | Card | Hero |
| --- | --- | ---: | ---: | --- | --- |
| CookFrom | Yes, Android beta | 5 | 6 | `cookfrom/web/cover.webp` | `cookfrom/web/hero.webp` |
| Ops Planner | Yes, emulator-compatible debug build | 4 | 6 | `ops-planner/web/cover.webp` | `ops-planner/web/hero.webp` |
| AI Tutor | Yes, existing Android debug build, sample mode | 5 | 6 | `ai-tutor/web/cover.webp` | `ai-tutor/web/hero.webp` |
| Keyboard Trainer / KeyQuest | Yes, current browser source | 4 | 6 | `keyboard-trainer/web/cover.webp` | `keyboard-trainer/web/hero.webp` |
| AgentLab | No local service started; architecture audited | 0 | 2 | `agentlab/web/cover.webp` | `agentlab/web/hero.webp` |
| At the Mountains of Madness | No source or art located | 0 | 0 | None | None |

## What these files are

- `originals/01-*.png` through `originals/05-*.png` are untouched, real application captures. Android captures are 1080 × 1920; KeyQuest captures are 1440 × 900. The Android device is a newly created emulator with no pre-existing user data.
- `originals/*-composition.png` are lossless masters of the processed layouts, **not raw screenshots**. They place whole real screenshots inside neutral frames on a light technical grid. Screen content was not redrawn, generated, retouched, or replaced.
- `web/*.webp` are optimized website derivatives. Covers are 1600 × 900; heroes are 1920 × 1080; app galleries are 1600 × 1000. WebP quality is 86 for application compositions and 90 for diagrams. Each file is under 83 KB.
- AgentLab's `originals/*.svg` are editable diagram sources; their PNGs are lossless rendered masters. Diagrams are **source-backed illustrations, not application screenshots**.
- There are **no concept/development images** in this package. No Mountains of Madness image was fabricated from its title.

The visible application themes are authentic. KeyQuest retains its current dark UI within the light composition. “AI Tutor” is the requested website project name; the real application header currently says “Homework Tutor.”

## Project audit and suggested captions

### CookFrom

Inspected `HomeLab-NL/whats-for-dinner` through the canonical local `recipe_ai` checkout: README, current Dart screens/models, catalog, storage rollout, product illustrations, and available release artifacts. Source HEAD: `3231e9f636abb6582d23fa426e3228374ce1aef3`.

The current app combines an illustrated ingredient selector, dish catalog, recipe servings and ingredients, step-by-step Cooking Mode, shopping, pantry, and preferences. These existing flows provide stronger public visuals than a generic food illustration. The shipped artwork is visible inside the actual UI.

Launched the existing **0.11.78+137 closed-testing APK**, confirmed installed version, dismissed onboarding, selected two vegetables, opened the built-in Ukrainian Borscht recipe, entered Cooking Mode, and added a sample tomato shopping item. No account or production user data was loaded.

Suggested caption: **“Choose ingredients, browse recipes, and follow each cooking step in CookFrom’s Android beta.”**

Limitations: the displayed Borscht is an existing catalog preset, **not a freshly generated AI response**. Generation from the selected ingredients was attempted, but no successful new result was captured. Do not use these images to claim a successful live generation, public release, store approval, deployed paid tier, or measured nutrition accuracy. This is a beta artifact capture, not a fresh build of HEAD. Pantry was inspected in source but is not illustrated by a dedicated capture. Shopping is preserved as an original; the four recommended galleries use the stronger cooking screens.

### Ops Planner

Inspected `HomeLab-NL/ops-planner` at local `repositories/ops-planner`: README, planner UI, data schema, seed logic, workload calculation, employee form, vacation handling, and XLSX exporter. Source HEAD: `f002466fa0752bfd3adc673d08fe9b4248893e71`; the pre-existing working tree has build/signing and release-checklist changes. Those changes were preserved.

Implemented functionality includes day/workweek selection, employee workload, task/duty/event pools, employee schedules, vacation periods, and schedule export. Data is local to the device. Reporting exists as an XLSX generation/export flow; no separate dashboard was found.

The available release APK failed on this x86 emulator because its Flutter library is ARM. A disposable copy of current `lib/`, assets, dependency files, and Android project was built using the existing Ops Planner Flutter SDK. Only the disposable Android signing configuration was adjusted to permit a debug build without reading or copying release credentials. **Application source, UI, and business logic were unchanged.**

The fresh emulator database was populated with three fictional sample employees and real-schema assignments. Email fields are blank. Workload badges are calculated by the running app from those assignments; they are neither edited into images nor performance claims. Captures show daily planning, workweek selection, an employee's weekly assignments, and work hours/vacation configuration.

Suggested caption: **“Plan a workweek, inspect employee assignments, and configure schedules and vacations. Fictional sample team shown.”**

Limitations: captures show a local debug build, not an asserted store release. XLSX export was inspected but not executed; no emails or messages were sent. The original release artifact's architecture incompatibility does not establish that it fails on a supported physical phone.

### AI Tutor

Inspected `HomeLab-NL/homework-tutor`: AGENTS, current state/handoff, Flutter flow, sample session/service, domain engine, and backend/service interfaces. Source HEAD: `b39e6b894e6715201c6bb4b589423afea4079ab1`. The root README is stale; `docs/CURRENT_STATE.md` and current source establish completion through Phase 08.

Existing functionality includes typed/image problem input, problem confirmation, step-by-step answering, Hint, Explain Differently, and a result screen. Current source also supports the independent backend and server-authoritative usage limits; production resources remain unprovisioned according to the current state document.

Launched the existing Android debug APK with its default **built-in MockTutorService**. Used the shipped `3x + 7 = 22` example, opened Hint and Explain Differently, answered both steps, and captured the result. All five files are real application UI captures.

Suggested caption: **“Work through a math problem one step at a time, with Hint and Explain Differently. Built-in sample mode shown.”**

Limitations: these are **demo-backed screens, not evidence of live AI generation, image recognition, production deployment, or quota enforcement**. Explain Differently displays the shipped sample explanation. Never remove that distinction from accompanying website copy. No real student's work or information was used.

### Keyboard Trainer / KeyQuest

Inspected `HomeLab-NL/keyboard-trainer` at `repositories/Keyboard-Trainer`: current `src/App.tsx`, CSS, levels, typing engine, progression, persistence, and package metadata. HEAD: `a300b30597d6d82dc58fcabd224664261dac16f6`. The React implementation is currently **uncommitted local material** on top of that initialization commit; the commit alone does not identify the captured UI. Source fingerprints are in [SOURCE_AUDIT.md](SOURCE_AUDIT.md).

The app has a welcome screen, ten-level map, typing challenges, target-key highlighting, combo/accuracy feedback, earned stars/XP/coins, and browser-local progress. The current source is English-only. No previously reusable app screenshots were found in the inspected checkout.

Copied the current source unchanged into a disposable Vite project, ran it on loopback, and captured it with a new browser context. The result screen was reached by actually typing the first level's phrase. Its short duration, accuracy, and rewards describe only that automated demo session, not a product benchmark or user cohort.

Suggested caption: **“Practice typing through KeyQuest’s level map and highlighted-key challenges. Current development build shown.”**

Limitations: no release/store claim; current local implementation is not yet a committed release. The map screenshot shows the visible early section, not all ten levels in one frame. The dark application styling is preserved.

### AgentLab / HomeLab AI infrastructure

Inspected `agentlab-local-ai-gateway/README.md`, `gateway.py`, `router.py`, `telemetry.py`, Qwen shim source, local One Horizon workflow/service material, and the **3 October 2026 infrastructure audit**. Also inspected `AgentsLab/README.md`: that is a distinct lead CRM/agency MVP and was deliberately not presented as the AI infrastructure GUI.

The card visual shows the evidenced Claude planner, Qwen/OpenCode builder, and QA/safety reviewer roles. **The reviewer is not labelled Codex:** its current model identity was not established by the inspected runtime audit. Roles, local execution, gateway/shim, Ollama, and local Qwen inference are supported by the sources.

The hero visual shows implemented gateway routing: deterministic L0 transformations, L1/L2 inference, an L2 resource guard, JSON schema validation with at most one same-level repair, and metadata-only telemetry. Resource-guard rejection returns an escalation-required response; **the gateway does not make the cloud call**. Exact runtime model tags and benchmark numbers are omitted.

Suggested caption: **“AgentLab coordinates planning, building and review with local inference on Minisforum; the gateway makes routing and validation explicit.”**

Limitations: no GUI or local service was launched for this handoff. Runtime statements are attributed to the dated audit, not a new remote check. This is not a diagram of the entire HomeLab deployment or evidence of a completed production migration. See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for source chains and distinctions.

### At the Mountains of Madness

No identifiable project repository, game scene, or existing project art was found in the searched local workspace/project locations. Nothing was launched, and no screenshot, gameplay image, or speculative concept art was created. See [mountains-of-madness/README.md](mountains-of-madness/README.md) for the search scope and integration recommendation. This is the explicitly permitted **documented reason for no visual**.

## Claude integration notes

1. Review `preview.html`; use each project's `web/cover.webp` and `web/hero.webp` as the default card/hero selections.
2. Copy only the chosen `web/` assets to the website's eventual public asset directory. These paths are handoff locations, not URLs already integrated into the website.
3. Use the manifest's captions/alt text, retaining sample/beta/development distinctions in visible surrounding copy. Do not describe diagram or composed assets as raw screenshots.
4. Preserve image aspect ratios. Avoid aggressive cropping: the outer composition contains source and demo labels. Provide a larger gallery/lightbox for legibility. The PNG screenshots are available if a future layout needs different framing.
5. Leave Mountains of Madness without an image until verified project material is supplied. Do not substitute generic horror/game art.

No application source, existing website files, or Claude Phase 2 implementation was integrated, overwritten, merged, or pushed. The package is committed through a separate worktree on **`assets/phase2-visuals-20261003`**. The shared website checkout keeps its original branch; this package is also present there as an untracked handoff folder. Obtain the package commit from the final report or `git rev-parse assets/phase2-visuals-20261003`.

## Validation and safety

All selected captures and compositions were visually reviewed. The package contains no terminal captures, debug banners, credentials, tokens, local addresses, employee emails, personal student data, APKs, app databases, private runtime configuration, or copied infrastructure logs. The named Ops Planner staff are fictional demo identities. AgentLab diagrams contain no host addresses, account identities, worker IDs, secret configuration, invented metrics, or unverified reviewer-model label.

Manifest validation checks file existence, dimensions, bytes, required fields, source references, checksums, raw screenshot counts, WebP output format, and image decoding. No generated application UI or invented feature was used. Screenshot inputs are whole preserved captures; diagram sources are independently editable SVGs. See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for provenance and known evidence limits.
