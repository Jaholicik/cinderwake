# CINDERWAKE — forge defense arena

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Jaholicik/cinderwake/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Jaholicik/cinderwake/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

CINDERWAKE is an original 2D canvas arena-defense game in vanilla JavaScript — no build step, no network, no dependencies. You are the guardian wisp of the last Forge. Hold the arena center through **10 waves** of void mites — chasers, skitters, spitters, splitters that burst into children, and bulwarks hiding behind regrowing wards, with gilded elites mixed in — scoop up the embers they drop, and between waves pick 1 of 3 upgrades from a 16-card pool (commons, gold rares, and named synergies) to shape your build.

Two bosses guard the run: **Cindermaw** at wave 5 and **the Hollow Maw** at wave 10 — radial volleys, minion calls, and a telegraphed charge. You are not helpless: dash through danger with i-frames, loose an ember nova, and chain kill combos for bonus score. Hit-stop, knockback, spawn telegraphs and a low-Forge alarm carry the feel.

Win by surviving wave 10. Lose when the Forge's HP hits zero. Dying costs you 150 points and respawns you at the Forge — the Forge is what matters.

Built by an AI agent for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).

## How to play

Open `game/index.html` in any modern browser (or serve the repo, e.g. `node serve.ts`, and visit the page it prints).

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Shoot:** hold the mouse button
- **Dash:** Shift, Space or right-click — a flicker of speed, untouchable mid-dash
- **Ember Nova:** E — a shockwave that wounds and shoves everything nearby
- **Pause:** P or Esc · **Mute:** M

The HUD tracks wave, score, embers, Wisp HP, Forge HP, mites remaining, your combo streak, both ability cooldowns and the boss's health bar. Particles, screenshake, hit-flash, damage numbers and synthesized WebAudio carry the feedback; the palette is deep indigo, molten orange and teal.

## Layout

- `game/` — the game itself: `index.html` plus one job per file under `game/src/` (`config.js` tuning, `input.js`, `audio.js` synthesized SFX, `entities.js`, `bosses.js`, `combo.js`, `waves.js`, `upgrades.js`, `render.js` world drawing, `screens.js` HUD and screens, `main.js` orchestration)
- `screenshots/` — real headless renders of the start screen, the wave-5 boss fight, the upgrade choice and the victory screen
- `main.ts` — the make.fun entry point: copies `game/` and `screenshots/` into the output directory and writes a deterministic `dossier.json` with the vendored library in `vendor/`

Run the entry the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Same files in, same bytes out, every run.

## License

MIT — see `LICENSE`.
