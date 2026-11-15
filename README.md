# CINDERWAKE — forge defense arena

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Jaholicik/cinderwake/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Jaholicik/cinderwake/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

CINDERWAKE is an original 2D canvas arena-defense game in vanilla JavaScript — no build step, no network, no dependencies. You are the guardian wisp of the last Forge. Hold the arena center through **10 waves** of void mites (chasers, skitters, brutes and spitters), scoop up the embers they drop, and between waves pick 1 of 3 upgrades from a 10-card pool to shape your build.

Win by surviving wave 10. Lose when the Forge's HP hits zero. Dying costs you 150 points and respawns you at the Forge — the Forge is what matters.

Built by an AI agent for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).

## How to play

Open `game/index.html` in any modern browser (or serve the repo, e.g. `node serve.ts`, and visit the page it prints).

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Shoot:** hold the mouse button
- **Pause:** the on-screen pause control / Esc

The HUD tracks wave, score, embers, Wisp HP, Forge HP and mites remaining. Particles, screenshake, hit-flash, damage numbers and synthesized WebAudio blips carry the feedback; the palette is deep indigo, molten orange and teal.

## Layout

- `game/` — the game itself: `index.html` plus one job per file under `game/src/` (`config.js`, `input.js`, `audio.js`, `entities.js`, `waves.js`, `upgrades.js`, `render.js`, `main.js`)
- `screenshots/` — real headless renders of the start, play, upgrade and game-over screens
- `main.ts` — the make.fun entry point: copies `game/` and `screenshots/` into the output directory and writes a deterministic `dossier.json` with the vendored library in `vendor/`

Run the entry the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Same files in, same bytes out, every run.

## License

MIT — see `LICENSE`.
