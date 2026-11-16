// Wave composition for CINDERWAKE: what spawns, in what mix, and how fast.
// A wave is a queue of spawn events; the game drains it over time. Spawns
// come in small bursts with a breath between them, so a wave has a rhythm
// instead of a drip. Waves 5 and 10 are boss waves (see BOSS_WAVES).

import { BOSS_TYPES, BOSS_WAVES, ELITE, ENEMY_TYPES, VIEW, WAVE_COUNT, mulberry32 } from './config.js';

export function waveSize(wave) {
  // Late waves thicken faster: the dark stops testing and starts pushing.
  return 4 + wave * 2 + (wave >= 7 ? (wave - 6) * 2 : 0);
}

// Pick the kind for one spawn slot, weighted by wave.
export function pickKind(wave, rng) {
  const roll = rng();
  if (wave >= 6 && roll < 0.13) return 'spitter';
  if (wave >= 5 && roll < 0.23) return 'bulwark';
  if (wave >= 3 && roll < 0.38) return 'splitter';
  if (wave >= 4 && roll < 0.50) return 'brute';
  if (wave >= 2 && roll < 0.55) return 'skitter';
  return 'mite';
}

function rollElite(wave, rng) {
  return wave >= ELITE.minWave && rng() < ELITE.chance;
}

export function buildWave(wave, seed) {
  const rng = mulberry32(seed * 7919 + wave * 104729);
  const queue = [];
  const bossKind = BOSS_WAVES[wave];
  // Boss waves run a smaller escort trickle: the boss is the wave.
  const size = bossKind ? (wave >= 10 ? 10 : 8) : waveSize(wave);
  const interval = Math.max(0.55, 1.25 - wave * 0.06);
  let at = 0.4;
  for (let i = 0; i < size; i += 1) {
    queue.push({ kind: pickKind(wave, rng), at, elite: rollElite(wave, rng) });
    // Bursts of 3–4, then a breather beat.
    at += interval * (i % 4 === 3 ? 2.1 : 0.55);
  }
  if (bossKind) {
    queue.push({ kind: bossKind, at: wave >= 10 ? 4.0 : 3.0, elite: false, boss: true });
    queue.sort((a, b) => a.at - b.at);
  }
  return { wave, queue, total: queue.length };
}

// A spawn point on the arena edge, away from the Forge and the player.
// Bosses arrive at the top centre, over the Forge, like a shadow falling.
export function spawnPoint(rng, boss = false) {
  if (boss) return { x: VIEW.w / 2, y: 56 };
  const edge = Math.floor(rng() * 4);
  const margin = 30;
  if (edge === 0) return { x: margin + rng() * (VIEW.w - margin * 2), y: margin };
  if (edge === 1) return { x: margin + rng() * (VIEW.w - margin * 2), y: VIEW.h - margin };
  if (edge === 2) return { x: margin, y: margin + rng() * (VIEW.h - margin * 2) };
  return { x: VIEW.w - margin, y: margin + rng() * (VIEW.h - margin * 2) };
}

export function isFinalWave(wave) {
  return wave >= WAVE_COUNT;
}

// How many of each kind a wave holds, for the HUD's "incoming" line.
export function waveMix(wave, seed) {
  const built = buildWave(wave, seed);
  const counts = {};
  for (const entry of built.queue) {
    counts[entry.kind] = (counts[entry.kind] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([kind, n]) => {
      const type = ENEMY_TYPES[kind] || BOSS_TYPES[kind];
      return `${n > 1 ? `${n} ` : ''}${type.label}${n > 1 ? 's' : ''}`;
    })
    .join(' · ');
}
