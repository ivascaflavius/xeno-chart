# Xeno-Chart

A lone ship drifts through a procedurally generated galaxy, scanning stars and
planets for minerals and — rarely — life, while managing a fuel/power/life-support
economy that makes every jump a real decision.

Xeno-Chart is a single-player, browser-based space exploration game. It's a
self-contained HTML5/CSS3/ES6+ web app — vanilla JS, no build step, no backend.

Live build: [ivascaflavius.github.io/xeno-chart](https://ivascaflavius.github.io/xeno-chart/)

## Running locally

This project uses native ES modules, which browsers block from loading over
`file://` for CORS reasons. Serve the folder with any trivial static server
and open the printed localhost URL:

```
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000` (or whatever port is printed).

## Status

**Experimental — still in active development, not a finished/1.0 release.**
All four build phases from the spec are implemented (core loop, wormholes,
hazards, achievements, intelligent life, lineage web, ship classes), plus two
rounds of post-launch polish. The first added a deliberate "take a sample"
step for biosignatures, animated orbit diagrams for systems/moons, a
star-class-driven habitable zone that actually shapes which planet types can
appear where, physical stats for stars and planets, procedural naming for
systems/planets/ships, and a proper deadlock ending (being stranded with no
beacons, scans, or harvests left now ends the run instead of freezing). The
second added a much wider variety of discoverable stars (red/blue giants,
binary systems with a real mutual orbit, supernova remnants, rogue planets)
and planets (hot Jupiters, super-Earths, iron/dwarf worlds, binary planets), a
Journal event log, a redesigned Game Over screen (tabbed Details/Journal/
Codex, a full explanation of why the run actually ended, Copy Seed), a
Saved-Slots/Continue-latest split on the main menu, early low-resource
warnings and a consistent ship/cargo status bar shared across every gameplay
screen, and general UI/icon polish (achievement icons, more compact resource
bars, repositioned discovery toasts). See [specs/specs.md](specs/specs.md)
for the full design, build-phase plan, and a running log of what's shipped
beyond the original phase list (§16b, §16c).

## Credits

Xeno-Chart is an original concept, designed and refined through, and built
with the assistance of, Claude Code (Anthropic).

## License

MIT — see [LICENSE](LICENSE).
