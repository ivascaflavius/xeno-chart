# Xeno-Chart — build spec for Claude Code

You are building **Xeno-Chart**, a single-player, browser-based space exploration
game. It is a self-contained HTML5/CSS3/ES6+ web app — vanilla JS, no build step,
no backend, deployable as a static site (GitHub Pages). It must work correctly on
both desktop (mouse) and mobile (touch) from the first build.

Read this whole spec before writing code. Build in the phases given at the bottom —
do not jump ahead to Phase 2/3 mechanics before Phase 1 is solid and playable.

## 1. One-line pitch

A lone ship drifts through a procedurally generated galaxy, scanning stars and
planets for minerals and — rarely — life, while managing a fuel/power/life-support
economy that makes every jump a real decision.

## 2. Core loop

1. Player is at a system. **Long-range scan** (cheap) reveals rough info about
   nearby systems within sensor range.
2. Player opens **jump planning** for a candidate system: sees distance, estimated
   fuel/life-support cost, and whatever long-range info is known.
3. Player commits to a **jump** (instant resolution, no real-time wait — a short
   transition beat only, 1-3 seconds max).
4. On arrival, player can **close-range scan** the system (costs charge) to reveal
   full planet detail, minerals, and roll for biosignatures.
5. Player can **harvest** minerals if present. Automated ship modules convert raw
   inputs into fuel/power/food/oxygen over time (see §5).
6. Repeat. Manage the tension between pushing further out (more discovery, more
   risk) and staying near known refuel points.

**Nothing runs in real time or in the background.** The simulation only advances
on explicit player actions (jump, scan, harvest). If the player closes the tab,
nothing decays — resuming later is just rehydrating the exact saved state. Do not
implement wall-clock-based decay of any resource.

## 2a. Starting conditions

- **Starting position**: derive a starting system deterministically from the
  seed — not the literal geometric center of the galaxy (an arbitrary coordinate
  with no gameplay meaning), but placed with roughly comparable unexplored space
  in most directions, so the player has a genuine choice of where to head first.
- **Starting system is a guaranteed safe harbor**: generate it specially rather
  than through the normal random roll — a stable star, at least one
  mineral-bearing planet nearby, no hazard flags. This gives new players a
  forgiving first few actions to learn scanning/jumping before real risk enters,
  without needing a scripted tutorial level.
- **Starting resources — partial, not full**: enough fuel for roughly 3-5 modest
  jumps and enough charge for a similar handful of scans, but not indefinite
  runway. Oxygen and food reserves start comfortably full — these are the
  failure-condition resources (§5), so there's no reason for the opening minutes
  to be tense on life support specifically.
- **Module buffers start empty.** Minerals haven't been harvested yet, so the
  player learns within the first couple of jumps that fuel/charge need to be
  replenished through the module economy, not just carried as a big starting
  tank.
- Apply the same starting conditions regardless of difficulty mode (§9) — the
  Relaxed/Expedition distinction is about failure consequences, not about
  making the opening easier or harder.

## 3. Explicit simplifications (read this before designing systems)

We discussed a lot of rich mechanics. For buildability and clarity, this spec
deliberately trims scope. Follow these simplifications unless told otherwise:

- **Biochemistry axis**: ship with exactly 3 types for v1 — `carbon-dna` (common),
  `carbon-rna` (rare), `silicon` (very rare). Do not add mirror-chirality or
  invented-polymer types until Phase 3, if at all.
- **Genesis lineage web** (the panspermia mystery): this is a **Phase 3** feature.
  Build the underlying data (each life discovery gets a hidden `genesisMarkerId`)
  in Phase 1 so it's cheap to visualize later, but do not build the lineage-web
  codex view or naming UI until Phase 3.
- **Wormholes**: v1 wormholes are simple — fixed low cost, always two-way, always
  fully revealed once close-scanned. Skip "unstable/one-way/uncertain-exit"
  variants until Phase 3.
- **Intelligent life / malevolent encounters**: v1 supports discovering
  intelligent life as a codex/achievement moment with a simple tech-tier field
  (`pre-industrial | industrial | post-industrial | silent`) and, optionally, one
  of two outcomes on discovery: a flavor-only "peaceful" result, or a "hostile"
  result that disables one random module for a set number of cycles (reusing the
  existing module-failure system — no new combat mechanics). Nothing more
  elaborate than that in v1.
- **Species naming**: auto-generate a Latin-sounding binomial for every discovery
  (cheap, procedural, no player input required for v1). Player-naming of species
  or lineages is a Phase 3 nice-to-have, not required for launch.
- **No multiplayer, no combat, no real-time simulation.** These are explicit
  non-goals — do not add netcode, WebRTC, or a tick-based background simulation.

## 3a. Project structure & architecture

No bundler, no build step. Use native ES modules loaded directly by the browser
(`<script type="module" src="js/main.js">` in `index.html`) — this works fine on
GitHub Pages and keeps the project debuggable without build tooling. Do not
introduce webpack/vite/rollup/etc.

**Local development**: `<script type="module">` is blocked by CORS when opened
via `file://`, so index.html cannot just be double-clicked. Run a trivial local
static server during development instead, e.g. `python -m http.server` or
`npx serve`, and open the localhost URL it prints.

**GitHub Pages deployment**: the site will be served from
`https://<user>.github.io/<repo-name>/`, not the domain root. Use relative paths
for every asset and internal reference (`./js/main.js`, `css/styles.css`) —
never root-absolute paths (`/js/main.js`) — or asset loading will break once
deployed even though it works fine locally.

Suggested folder layout:

```
repo-root/
├── index.html
├── CLAUDE.md
├── specs/
│   └── specs.md
├── css/
│   └── styles.css
├── assets/
│   └── fonts/            (only if a self-hosted font is used — no external CDN)
└── js/
    ├── main.js            entry point: boots the app, owns the FSM
    ├── state/
    │   └── gameState.js   the state machine (§8) + current expedition state
    ├── data/
    │   ├── constants.js   tuning values (costPerLy, base costs, sensor range…)
    │   ├── wordBanks.js   name-generation root/prefix/suffix lists (§7, §11)
    │   └── schema.js      shape of the save object (§14) — single source of truth
    ├── procgen/
    │   ├── prng.js        mulberry32/sfc32 seeded RNG
    │   ├── galaxy.js       lazy per-system generation from the seed
    │   ├── stars.js        star class + stats generation
    │   ├── planets.js      planet class + minerals + hazard-flag generation
    │   ├── life.js         biosignature roll, stage, biochemistry, genesisMarkerId
    │   └── names.js        galaxy name + species binomial generation
    ├── systems/
    │   ├── resources.js    fuel/charge/oxygen/food state + module buffers
    │   ├── modules.js      refinery/electrolysis/hydroponics/reactor logic (§5)
    │   ├── travel.js       distance/cost calc, wormhole routing (§2, §5)
    │   └── hazards.js      hazard flags and their effects (§10)
    ├── render/
    │   ├── portraits.js    SVG generator functions for stars/planets/life (§7),
    │   │                   with an in-memory cache keyed by object id
    │   ├── starmap.js      pan/zoom starmap rendering + fog-of-war tiers (§6)
    │   └── nebula.js       Phase 3 — cached decorative nebula backgrounds (§15a)
    ├── ui/
    │   ├── screens/        one file per screen in §4 (mainMenu.js, starmap.js,
    │   │                   shipSystems.js, codex.js, jumpPlanning.js, credits.js…)
    │   └── components/     small reusable pieces (progressBar.js, modal.js,
    │                       celebration.js — see §11a)
    ├── save/
    │   └── saveManager.js  slot read/write, export/import (§14), uses schema.js
    └── audio/
        ├── audioManager.js   ambient loop + stingers (§15), Phase 2+
        └── hapticsManager.js mobile vibration wrapper (§15c), Phase 2+
```

Guiding rules for how these pieces talk to each other:

- **`state/gameState.js` is the only place screens get shown/hidden from.**
  Screens don't reach into each other directly; they read from and dispatch
  actions through game state.
- **`data/schema.js` defines the save shape once.** Every module that reads or
  writes persisted data (ship resources, discovered systems, codex, achievements)
  should conform to it — don't let individual screens invent their own local
  copies of state shape.
- **`procgen/` modules are pure functions of `(seed, id)`.** Given the same
  inputs they must always produce the same output — no hidden mutable state, no
  `Math.random()` anywhere in this folder. This is what makes seeds reproducible
  and saves lightweight (you store the seed + discovery flags, not the generated
  content itself).
- **`render/portraits.js` caches generated SVG strings by object id** the first
  time they're rendered, so re-opening a detail panel doesn't regenerate the art.
- **One file per screen** under `ui/screens/` — keeps each screen small enough
  for Claude Code to work on independently without large merge conflicts across
  phases.
- Keep `js/main.js` thin: it wires the modules together and starts the FSM, it
  should not contain gameplay logic itself.

## 4. Screens

Build these as distinct states in one finite-state-machine (see the
responsive-webapp conventions in §8). Use real `<button>` elements throughout.

1. **Main menu** — New expedition / Continue / Codex / How to fly / Settings
2. **New expedition setup** — choose difficulty (Relaxed / Expedition), optionally
   enter a seed code, optionally pick a save slot
3. **Starmap** (primary hub) — pan/zoom view, fog-of-war tiers (§6), fuel-range
   ring, tap a system to open its detail/jump-planning panel
4. **Jump planning panel** — distance, route (direct or via known wormhole), cost
   preview, known prospects, commit button
5. **System view** — planets in the current system, tap to close-scan
6. **Scan/detail panel** — object portrait (locked silhouette or full art per §7),
   type info, minerals, biosignature result if any
7. **Ship systems dashboard** — module status rows with progress bars (§5),
   life-support warning banner when critical
8. **Codex** — tabs for stellar / planetary / biological, grid of discovered +
   locked (silhouette) entries, achievements list
9. **How to fly** — static help/reference screen (see §9), reachable from main
   menu and in-run pause menu
10. **Settings** — commander name (§12a), audio on/off, audio volume, haptics
    toggle on mobile (§15c). Reduced motion and colorblind-safe palette are
    deferred — not required for v1/v2, see §15c note.
11. **Credits** — see §9a
12. **Pause menu** — Resume / How to fly / Settings / Main menu
13. **Expedition summary / game over** — shown on life-support failure; stats for
    the run (systems visited, life found, distance traveled, seed code), option
    to start a new expedition

### 9a. Credits screen content

Static screen, reachable from the main menu. Keep it short and plain — a couple
of sentences plus a link, not a scrolling wall of text:

- A short line noting that Xeno-Chart is an original concept, designed and
  refined through, and built with the assistance of, Claude Code (Anthropic).
- A link to the author's GitHub profile: `https://github.com/ivascaflavius`
  (open in a new tab; use a real `<a href>` per the linking conventions in the
  design system, not a JS-only click handler).
- Optionally, a line noting the game is open source / a personal project, if
  that ends up being true once the repo is public.

## 5. Ship systems & resource economy

Four resources: **fuel**, **charge** (instrument power), **oxygen**, **food**.
Oxygen and food are **reserve buffers** (see life-support failure below); fuel and
charge are simple depleting/refillable stocks.

Automated modules, each with an input buffer, a per-action processing amount, and
an output buffer. No manual crafting UI — modules just run whenever their input
is available and report status:

| Module | Input | Output | Status colors |
|---|---|---|---|
| Refinery | ore | fuel | green (has input) / amber (low) / red (empty) |
| Electrolysis unit | ice | oxygen + hydrogen | same |
| Hydroponics bay | water + oxygen | food | same |
| Reactor | fuel (trickle) | charge | same |

Ship systems dashboard shows each module as: icon, label, a progress bar for its
input buffer level, and a status dot. When a buffer hits empty, downstream modules
that depend on its output also go amber/red — implement this as a simple
dependency chain, not a full simulation.

**Jump cost** = base cost scaled by distance (light-years). Implement as a simple
linear-with-minimum formula, e.g. `cost = baseCost + distance * costPerLy`, applied
separately to fuel and to a small oxygen/food draw. Wormhole jumps use a flat low
cost regardless of the real-space distance they span.

**Life-support failure**: when the oxygen or food reserve buffer hits zero, start
a visible countdown (a fixed number of cycles, escalating warning banners). If it
reaches zero before the reserve is replenished, trigger the expedition summary /
game-over screen. This is the only game-over condition. Running out of fuel is a
**setback**, not a failure: the ship is "stranded" (reduced capability, can still
scan passively) until refueled or a distress-beacon action is used — do not make
this end the game.

## 6. Scanning & fog of war

Sensor range is a ship stat (upgradeable). Around the player's current position,
render four visibility tiers on the starmap:

1. **Unexplored** — nothing rendered
2. **Detected only** — within passive sensor range; render a dim point, no info
3. **Long-range scanned** — star type, rough planet count, anomaly flag if any;
   stays revealed permanently once scanned
4. **Close-range scanned** — full detail, portrait art unlocked, permanent

Detected-only status is recalculated from current ship position every time the
player moves; long-range and close-range status, once achieved for a system, is
permanent and stored in the save.

## 7. Procedural generation

Use a seeded PRNG (mulberry32 or sfc32) seeded from the expedition seed, so the
whole galaxy — and every object in it — is fully deterministic and reproducible
from the seed alone. Use it consistently: `hash(seed, systemId)` style derivation
so individual systems can be generated lazily on first visit rather than the whole
galaxy upfront.

**Galaxy name**: derive a Greek/Latin-sounding name from the seed the same way
species binomials are generated (§11) — a small root/prefix/suffix word bank plus
a catalog-style number or Roman numeral, e.g. `Xandros-7`, `Velorum IX`,
`Cassidon-3`. Show this as the primary display title on New Expedition, the save
slot picker (§14a), and the expedition summary screen — always alongside the raw
seed code, never replacing it, since the seed is what's actually needed to
reproduce the galaxy (e.g. for sharing).

**Star/planet/life "portraits"**: build small parameterized SVG-generating
functions, one per category (star classes, planet classes, life stage tiers).
Each function takes seed-derived parameters (hue, band/cloud/ring count, texture)
and produces a unique-looking but cheap SVG. Biochemistry type controls
color/texture layered on top of the life-stage shape template — do not build a
separate art asset per stage-per-biochemistry combination; compose the two.

Locked/undiscovered objects render as a generic gray dashed-circle silhouette with
a `?` — never the real portrait — until the appropriate scan tier is reached.

**Mobile performance**: cache generated SVG strings per object after first render
(don't regenerate on every re-render). On the starmap, only render full detail for
systems within/near the viewport; render distant systems as plain dots. Keep the
total number of simultaneously-rendered detailed SVG portraits low (cap it, e.g.
via viewport culling) — this is a real risk area, test on a real mobile device
early rather than late.

## 8. Technical conventions (follow the responsive-webapp skill)

- `100dvh`, not `100vh`, for full-height layout; lock scroll/bounce at the root
- One explicit state machine driving all screens (`MAIN_MENU`, `PLAYING`,
  `PAUSED`, `GAME_OVER`, etc.) — no scattered boolean flags
- Auto-pause on `visibilitychange`/`blur` — but since simulation is action-based
  anyway, this mainly matters for pausing any ambient audio/animation loops, not
  for resource decay (there is none)
- Real `<button>` elements, 44×44px minimum touch targets, `touch-action: none`
  on gesture surfaces (starmap pan/zoom), Pointer Events API for unified
  mouse/touch input
- No keyboard dependency anywhere

## 9. Difficulty modes

- **Relaxed**: life-support failure never ends the game — instead, systems
  degrade (scan range reduced, jump cost increased) as a soft penalty. Good
  default for players who want pure exploration.
- **Expedition**: full stakes as described in §5 — life-support failure ends the
  run.

Store the chosen mode in the save; it can be shown but not changed mid-run.

## 10. Hazards (in addition to life/minerals/wormholes)

Implement 2-3 for v1, expandable later:
- **Solar flare**: temporarily reduces scan range in the affected system
- **Radiation zone**: increases charge drain for close-scans in that system
- **Asteroid field**: increases fuel cost to transit, or small hull-integrity
  cost if you implement hull as a stat

Surface these as a flag on the system, discoverable via long-range scan (so
players can factor them into jump planning), not as surprise ambushes.

## 11. Achievements & codex

- Three codex tracks: stellar, planetary, biological — each a grid of
  discovered (full art) vs. locked (silhouette) entries
- Achievements list is a simple flat list with unlocked/locked state, no tiers
  needed for v1 — e.g. "first pulsar," "first intelligent life," "10 systems
  mapped," "survive a stranding," "discover a wormhole"
- Store achievement + codex progress **globally** (across all saves/expeditions),
  separate from per-expedition save state, so completionist progress persists
  even if a run ends

## 11a. Discovery & achievement feedback (toasts, confetti)

Every new discovery deserves *some* acknowledgment, but the intensity should
scale with rarity — a common mineral shouldn't get the same treatment as first
contact. Use a single reusable "celebration" component (`ui/components/
celebration.js`) driven by a rarity tier, not one-off effects hand-built per
event:

| Tier | Example trigger | Visual | Audio |
|---|---|---|---|
| `minor` | new mineral type, routine scan | Small toast, slides in from a corner, auto-dismisses in ~2s, no motion beyond the slide | Soft, short blip (§15) |
| `notable` | first of a common star/planet class, small achievement | Toast + a brief icon flourish (e.g. the codex-entry icon scales up and settles), stays ~3-4s | Distinct short chime |
| `rare` | first life discovery, wormhole found, larger achievement | Centered banner (not just a corner toast), light confetti burst (a couple dozen particles, short-lived), stays until dismissed or ~5s | Rare-discovery stinger (§15) |
| `landmark` | intelligent life, a Phase 3 lineage-cluster resolution, "point of origin" | Full-width banner with the specimen/system portrait shown large, a longer confetti burst, screen briefly dims behind it to draw focus | Landmark stinger, longer/more distinct |

Implementation notes:

- **Confetti**: implement as a lightweight, self-contained particle burst (plain
  divs or a small canvas overlay animated with CSS/JS) — do not pull in an
  external confetti library, keep it dependency-free and small.
- Reduced-motion handling for this is deferred (§15c) — not required for
  v1/v2. If added later, it should skip confetti/icon-scale animation while
  still showing the toast/banner and text, never hiding the achievement itself.
- **Never block input.** Celebrations are overlays that auto-dismiss or can be
  tapped away; they must not pause the game or require acknowledgment to
  continue playing (the one exception is fine to keep brief for `landmark` tier,
  but even then keep it skippable).
- **Queue, don't stack.** If multiple discoveries happen in quick succession
  (e.g. a close-scan reveals a mineral *and* a biosignature at once), queue
  celebrations one after another rather than overlapping them.
- Tie the rarity tier directly to the same data already driving the codex/
  achievement system — don't maintain a second parallel list of "what's exciting."

## 12. Ship identity & customization

- Player names their ship at expedition start (text input, no validation needed
  beyond length limit)
- A small set of cosmetic hull-color/pattern options, unlocked via achievements,
  purely visual, no mechanical effect
- Optionally, 2 starting ship "classes" (e.g. scanner-focused vs. fuel-efficient)
  selectable at New Expedition — nice-to-have, not required for Phase 1

### 12a. Commander name

Separate from the ship name above — this identifies the *player*, not the
expedition. A "commander name" text field in Settings, optional, free text,
defaulting to something generic (e.g. "Commander") if left blank. Store it
**globally** (alongside achievement/codex progress, §11), not per save slot,
since it belongs to the person playing, not any one run.

Show it as a small, quiet greeting line on the main menu (e.g. "Welcome back,
[name]") rather than a prominent title — keep the main menu's uncluttered tone.
Optionally also surface it on the expedition summary/game-over screen and the
credits screen, since both are already personal, reflective moments. Purely
cosmetic — no gameplay effect.

## 13. Tutorial / help

Build this as a **static reference screen**, not a scripted interactive
tutorial: a "How to fly" screen reachable from the main menu and in-run pause
menu, with short sections (controls, resource icons explained, how scanning
works, how jumping works). This is much cheaper to build and maintain than a
guided walkthrough and fits a game this systems-driven.

## 14. Saves

- **Multiple save slots** (e.g. 3), each an independent expedition
- **Export/import**: a button to download the current save as a JSON file, and
  an import button to load one back in — this is the safety net against
  localStorage getting cleared, and should be treated as required, not optional
- **Import validation**: an imported file may be corrupted, hand-edited, or from
  an incompatible schema version. `data/schema.js` must include an explicit
  `version` number in the save shape from the very first implementation — even
  before there's more than one version in existence — so import validation has
  something concrete to check against rather than retrofitting it later.
  Validate against the schema before accepting an import; on failure show a
  clear "couldn't read that save file" message and leave existing slots
  untouched — never let a bad import crash the app or silently overwrite a slot
  with partial data
- **Reset/clear data**: each slot's Delete action (§14a) should fully clear that
  slot's stored data, and Settings should offer a separate "reset all data"
  option (with a confirmation step) that clears every slot plus global
  achievement/codex progress — players should never need dev tools to start over
- Global achievement/codex progress (§11) is stored separately from per-slot
  expedition state

### 14a. Resume flow

"Continue expedition" on the main menu opens a **save slot picker**, not a direct
resume — even with only one slot in Phase 1, build the picker screen so adding
slots in Phase 2 doesn't require reworking this flow. Each slot shows:

- The galaxy name (§7) and difficulty mode
- A brief snapshot: current ship name, systems visited, cycle count, last-played
  timestamp
- Buttons: Resume / Export / Delete

Selecting Resume loads that slot's exact saved state and drops the player
straight into the starmap — no re-simulation, no catch-up logic, since nothing
decays while the game is closed (§2). An empty slot shows a "start new
expedition into this slot" prompt instead of a snapshot.

## 15. Audio

- A low ambient soundscape loop (simple, can be a short generated/looped tone —
  do not attempt to source external audio files)
- Distinct short "stinger" cues for: standard discovery, rare discovery (life,
  wormhole, intelligent life), and warning states (life-support critical)
- Settings provides both an **audio on/off toggle** (instant mute, independent
  of volume) and a **volume slider** — the toggle is for a quick one-tap mute,
  the slider is for tuning level while audio is on. Persist both globally.
- Pause all audio on `visibilitychange` regardless of the on/off setting, so
  nothing keeps playing from a backgrounded tab.

## 15a. Visual polish (nebula backgrounds, special-object rendering)

Dark theme only (see §17a). Once the flat/functional version of the starmap and
system views is working, layer in:

- **Nebula backgrounds**: 2-3 overlapping soft-edged color blobs per galactic
  region, seeded and tinted per region (gives regions a distinct visual mood and
  doubles as a wayfinding cue). Generate once per region and cache as a static
  background layer — do not recompute per frame. Keep opacity low enough that it
  never competes with foreground readability (fog-of-war dots, HUD text, portrait
  art). The real build can use CSS radial-gradient/blur for this (unlike the flat
  shapes used in early design mockups).
- **Black holes**: dark core + banded accretion-disk ellipse (a few concentric
  rings from dim/wide to bright/thin reads convincingly even without true
  gradients), optionally a subtle lensing effect on nearby background dots.
- **Pulsars**: bright core + two opposing beam cones, slow pulse/rotate animation.
- **Magnetars**: bright core + curved field-line arcs instead of straight beams.
- **Young/star-forming systems**: soft surrounding cloud motif, visually
  distinguishing likely mineral-rich systems from old quiet (likely
  life-bearing) ones — reinforces the long-range-scan heuristic in §6.

Treat this as **Phase 3 work**: it must not block or complicate getting the flat
functional version of Phase 1 working and playable first.

## 15b. Visual identity — logo, favicon, main menu scene

**Logo/favicon**: a stylized ringed planet mark (a filled circle with a tilted
elliptical ring, Saturn-like) as the single consistent brand mark across
favicon, main menu, and any future promotional use. Keep it to two flat shapes
(planet body + ring) so it stays legible at 16×16 favicon scale — do not add
fine detail (surface texture, multiple rings, moons) that will disappear at
small sizes. Generate the favicon as a static SVG (`favicon.svg`, referenced
from `index.html`) rather than a rasterized PNG, consistent with the rest of
the project's SVG-based art approach.

**Main menu ambient scene**: a small looping animation behind the main menu
buttons — a ship anchored in place (a subtle idle bob only, it never actually
moves across the screen) with a flickering exhaust trail, in front of a
two-layer parallax starfield (a slower "far" layer and a faster "near" layer,
each scrolling continuously and wrapping seamlessly) and a fixed ringed planet
in the distance with a slow ring-shimmer animation. The ship perpetually
"chases" the planet without ever reaching it — motion is conveyed entirely by
the starfield scrolling past and the exhaust flicker, not by the ship or planet
actually changing position relative to each other. This avoids the visible seam
a literal approach-then-reset animation would have, and is much cheaper to keep
smooth on mobile.

- Build as `render/mainMenuScene.js`, using CSS transforms/animations or
  lightweight SVG `<animateTransform>` — no canvas particle system needed
- Reduced-motion handling for this scene is deferred (§15c) — not required for
  v1/v2. If added later, it should freeze to a static single frame (ship,
  starfield, and planet all visible but still) rather than removing the scene.
- The logo/favicon mark itself is cheap and static — add it during Phase 0/1
  setup, no need to wait. Only the animated main menu scene is Phase 3 polish;
  Phase 1's main menu can show the same ship/planet composition as a static
  image until the animation is built.

## 15c. Haptics (mobile)

A **haptics on/off toggle** in Settings, persisted globally, triggering short
vibration pulses on mobile for key moments — discovery celebrations (§11a,
scaled by tier: a light tap for `minor`, a stronger pulse for `rare`/
`landmark`), life-support warnings, and module status changes (e.g. going
red). Use the Vibration API (`navigator.vibrate(...)`) behind a small wrapper
(`audio/hapticsManager.js` or similar) that no-ops silently if unsupported.

Note: **iOS Safari does not support the Vibration API for web content** — only
Android/Chromium-based mobile browsers do. Detect support at startup and either
hide the toggle or show it disabled with a brief note, rather than presenting a
setting that silently does nothing on iOS. Do not build any mechanic that
*requires* haptics to convey information — it must always be a redundant,
optional layer on top of the visual/audio feedback already in place.

Reduced-motion and colorblind-safe palette settings are **deferred** — not
required for v1/v2. The spec still describes how celebrations (§11a) and the
main menu scene (§15b) *would* respect a reduced-motion setting, but that
branch simply doesn't need to exist yet; treat those mentions as guidance for
if/when it's added later, not a current requirement.

## 16. Build phases — follow in order

**Phase 0 (repo setup, before any gameplay code):**
Repo scaffolding per §18 (README, LICENSE, .gitignore), the file/folder
structure in §3a, a working local dev server workflow (§3a), the top-level
error handling wrapper (§20), and the logo/favicon mark (§15b) — cheap and
worth having in place from the start rather than a placeholder tab icon.

**Phase 1 (MVP — get this fully working and playable first):**
Main menu, new expedition (seed + difficulty only, skip ship class selection),
starmap with fog-of-war tiers, jump planning + instant jump, system view +
close-scan, ship systems dashboard with the 4 modules and progress bars, basic
life-support failure → game-over screen, basic codex (3 tracks, locked/unlocked
grid, no lineage web), procedural star/planet/life portrait generation with
locked-silhouette gating, single save slot with import validation and a reset
option, static "How to fly" screen, pause menu. No hazards, no wormholes, no
intelligent life, no audio beyond silence.

**Phase 2:**
Wormholes (simple version per §3), hazards (2-3 types), difficulty modes
(Relaxed vs Expedition), achievements list, discovery/achievement celebration
system with tiered toasts and confetti (§11a), multiple save slots +
export/import, ship naming + cosmetic customization, basic audio (ambient +
stingers), settings screen (commander name, audio on/off + volume, haptics
toggle on mobile).

**Phase 3 (only after Phase 1 and 2 are solid):**
Intelligent life tiers + simple hostile-encounter consequence, genesis-lineage
data → lineage-web codex view + clade naming, expanded biochemistry types if
still desired, ship class selection at New Expedition, nebula backgrounds and
special-object rendering (§15a), animated main menu scene (§15b).

Do not skip ahead to Phase 2/3 content while Phase 1 has rough edges — a small,
fully-working core loop is more valuable than a large, half-working one.

### 16a. Phase 1 definition of done

Before moving on to Phase 2, confirm all of the following:

- A full session works end to end: main menu → new expedition → several jumps
  with scans and harvesting → ship systems dashboard reflects real state changes
  → a life-support failure actually reaches the game-over screen
- Save/reload round-trips correctly (close and reopen the browser tab, resume
  from the slot picker, state matches exactly what was there before)
- No crashes or console errors during a normal 20+ jump session
- Tested on both desktop and a real mobile device (not just a resized desktop
  browser window) — pan/zoom, tap targets, and viewport sizing all behave
- Procedural generation is confirmed deterministic: the same seed regenerates
  the same starting system and galaxy name on a fresh load

If any of these aren't true yet, that's Phase 1 work still outstanding —
finish it before adding Phase 2 features.

## 17a. Theme

Dark theme only — do not build a light mode. The void being dark is load-bearing
for readability of fog-of-war, sensor rings, and glow-based special-object
rendering (§15a), not just an aesthetic choice. Colorblind-safe palette and
reduced-motion settings are deferred (§15c) rather than required for v1/v2 —
if added later, they'd be the accessibility levers to reach for instead of a
light theme.

## 18. Repo hygiene

- `README.md` at the repo root: what the game is, a link to the live GitHub
  Pages URL once deployed, a screenshot or two, and a short credits line
  (mirroring the in-game credits screen, §9a)
- `LICENSE` — choose one (e.g. MIT) before the first public push
- `.gitignore` — minimal is fine (OS files, editor folders); there's no build
  output to ignore since there's no build step
- Keep `specs/specs.md` in sync as the design evolves — if a decision made
  during coding contradicts the spec, update the spec rather than letting it
  drift out of date silently

## 19. Browser support & privacy

- Target the current versions of Chrome, Firefox, Edge, and — importantly —
  iOS Safari specifically, since it's typically the strictest on viewport units
  and touch behavior. Test on a real iOS device before considering a phase done,
  not just desktop responsive-mode emulation.
- No analytics, no telemetry, no external network calls of any kind. All state
  lives in the browser's own storage (localStorage/IndexedDB). This should hold
  for the entire project, not just early phases — don't add a tracking script
  later without revisiting this decision deliberately.

## 20. Top-level error handling

Wrap app initialization and the main state-machine dispatch in a top-level
try/catch. On an unexpected error, show a simple fallback screen ("something
went wrong — reload") rather than leaving a blank white page. This is cheap
insurance for a project without a dedicated QA process behind it.

## 21. Non-goals

No multiplayer, no combat system, no real-time/background simulation, no server
backend, no external asset dependencies (all art is generated SVG, all audio is
generated/synthesized or omitted rather than fetched from a URL).