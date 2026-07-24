# UX Improvements: Action Bar Restructuring

Goal: reduce how often the player has to reach the bottom action bar during
normal play. Primary actions move up next to the content they act on; the
bottom bar becomes pure navigation (same 3 buttons on every gameplay screen).
Distress Beacon moves to the header since it's an emergency action, not a
routine one.

Applies to the 4 gameplay screens: Galactic View (`starmapScreen.js`), System
View (`systemView.js`), Planetary View (`scanDetail.js`), Ship Systems
(`shipSystems.js`). New Expedition and menu/overlay screens are unaffected.

---

## 1. Header: relocate Distress Beacon

- Extend `screenHeader.js` to accept an optional right-side action element
  (currently it only renders back/menu-icon + title, left-aligned with
  everything else empty space). Render the back button, title, a flex
  spacer, then the optional right action.
- Add a new `beacon` icon to `icons.js` — a dot with broadcast arcs fanning
  outward (distinct from the existing `scan` bullseye-rings icon, since both
  now appear on the same screens). Keep the existing `distress` triangle
  icon as-is (unused after this, or repurposed elsewhere) — don't reuse it
  for this button since the ask is specifically a "radar emitting signal"
  look, not a warning triangle.
- `commonActions.js`'s `distressBeaconAction(gs)` keeps its exact
  available/disabled logic (stranded + beacons left), just render it
  `iconOnly: true` in the header slot instead of labeled in the bottom bar.
  Grayed out (not hidden) when not stranded, same as today — consistent
  with how the health strip's stranded chip already behaves.
- Remove `distressBeaconAction(gs)` from the bottom `action-bar` in all 4
  screens; wire it into `screenHeader(...)`'s new right-action param
  instead.

## 2. Bottom action bar: nav-only, same 3 buttons everywhere

New shape for all 4 gameplay screens' bottom `action-bar`:

- Galactic View: **Menu**, **Codex**, **Journal**
- System View: **Back**, **Codex**, **Journal**
- Planetary View: **Back**, **Codex**, **Journal**
- Ship Systems: **Back**, **Codex**, **Journal**

This removes Scan/System/Ship (Galactic), Scan (System), Harvest All/Take
Sample (Planetary) from the bottom bar — they move to the new per-screen top
bar below (Section 3). Ship Systems' bottom bar just loses Beacon (per
Section 1); it already had no other actions there.

Since the button count drops to 3 on every screen, use the
`action-bar-labeled` class (already exists, currently only used by New
Expedition) so labels stay visible on mobile too — same rationale as New
Expedition: few enough buttons that labels don't crowd.

## 3. New per-screen action bar above main content

Inserted into each screen's `.screen-scroll-body`, directly after the
existing info panel + `shipStatusPanel(gs)` (Health/Ship/Cargo), before the
rest of the content. Styled the same as the bottom bar
(`action-bar action-bar-labeled`) so the two read as one visual system.

**Galactic View** (`starmapScreen.js`) — scroll-body order becomes:
1. `galaxyPanel`
2. `shipStatusPanel(gs)`
3. **new bar**: Scan, System, Ship (icon + label, same buttons as today just
   relocated out of the bottom bar)
4. `starmap.el`

**System View** (`systemView.js`) — scroll-body order becomes:
1. `starPanel`
2. `shipStatusPanel(gs)`
3. **new bar**: Scan, Jump (Jump active only when a wormhole has been
   detected this system — same `wormholePresent` condition already used by
   the old inline Jump button; Scan keeps its existing cost/disabled logic)
4. `grid` (planets bar)
5. `wormholePanel` — becomes an info-only row (icon + status text), since
   its Jump button moved up into the new bar; no button left in this row
6. `orbitPanel` (orbital view) — now last, instead of first

**Planetary View** (`scanDetail.js`) — scroll-body order becomes:
1. `planetPanel`
2. `shipStatusPanel(gs)`
3. **new bar**: Harvest All (or single-mineral label, same logic as today),
   Take Sample (active only when an unsampled biosignature is present —
   same condition as today's `sampleButton`)
4. Minerals row (split out of `surfacePanel`)
5. Biosignature row (split out of `surfacePanel`)
6. `orbitPanel` — now last, instead of second

**Ship Systems** (`shipSystems.js`) — content order unchanged
(`shipPanel`, `shipStatusPanel`, `modulesPanel`, `schematicPanel`); only the
header (Section 1) and bottom bar (Section 2) changes apply here.

## 4. Height parity: Planets+Wormhole vs Minerals+Biosignature

The ask is for the Planetary View's Minerals+Biosignature block to match the
System View's Planets+Wormhole block in height, since they now occupy the
same position in the layout (directly above the orbital view) and should
feel like the same slot across screens.

Caveat: don't force literal pixel-equality — the planet grid wraps to more
rows as planet count grows (unbounded), while the mineral/bio panel's
height is close to fixed regardless of mineral count. Forcing exact parity
would mean one of the two fights its own natural content.

Recommended approach: give both blocks a shared `min-height` (a CSS custom
property, e.g. `--surface-block-height`, sized to comfortably fit the
common case — a handful of planets in one row + the wormhole line). Planet
grids that overflow it scroll or wrap normally rather than growing the
slot; the mineral/bio block just naturally sits at that same min-height
most of the time. This gets "feels consistent" without a layout fight over
unbounded content.

## 5. Files touched

- `../js/ui/components/screenHeader.js` — add right-action param
- `../js/ui/components/icons.js` — add `beacon` icon
- `../js/ui/components/commonActions.js` — no logic change, just where
  `distressBeaconAction` gets called from
- `../js/ui/screens/starmapScreen.js` — header + both action bars + new top bar
- `../js/ui/screens/systemView.js` — header + both action bars + new top bar +
  reordered scroll-body + wormhole row becomes info-only
- `../js/ui/screens/scanDetail.js` — header + both action bars + new top bar +
  reordered scroll-body + split `surfacePanel` into minerals/biosignature
- `../js/ui/screens/shipSystems.js` — header + bottom bar only (beacon removed,
  content order untouched)
- `../css/styles.css` — `--surface-block-height` (or similar) shared min-height
  rule for the two surface blocks; header right-action layout (flex spacer)

## 6. Open questions to settle while implementing

- Confirm exact wormhole info-row wording once its button is gone (today's
  three states — unknown / present / absent — still apply, just without a
  trailing button).
- Confirm the new top bars' button order matches this doc exactly
  (Scan/System/Ship — Scan/Jump — Harvest/Sample) since button order affects
  thumb reach on wide phones.
- Decide whether the `beacon` icon should also replace the icon used
  elsewhere (e.g. Help screen's beacon mentions) for visual consistency, or
  stay scoped to just this button.
