# Xeno-Chart

A lone ship drifts through a procedurally generated galaxy, scanning stars and
planets for minerals and — rarely — life, while managing a fuel/power/life-support
economy that makes every jump a real decision.

Xeno-Chart is a single-player, browser-based space exploration game. It's a
self-contained HTML5/CSS3/ES6+ web app — vanilla JS, no build step, no backend.

Live build: _not yet deployed_

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

In active development. See [specs/specs.md](specs/specs.md) for the full
design and build-phase plan.

## Credits

Xeno-Chart is an original concept, designed and refined through, and built
with the assistance of, Claude Code (Anthropic).

## License

MIT — see [LICENSE](LICENSE).
