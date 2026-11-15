// Wave composition for CINDERWAKE: what spawns, in what mix, and how fast.
// A wave is a queue of spawn events; the game drains it over time.

import { ENEMY_TYPES, VIEW, WAVE_COUNT, mulberry32 } from './config.js';

export function waveSize(wave) {
  return 4 + wave * 2;
}

// Pick the kind for one spawn slot, weighted by wave.
export function pickKind(wave, rng) {
  const roll = rng();
  if (wave >= 6 && roll < 0.15) return 'spitter';
  if (wave >= 4 && roll < 0.15 + 0.10 + Math.min(0.12, wave * 0.012)) return 'brute';
  if (wave >= 2 && roll < 0.42) return 'skitter';
  return 'mite';
}

export function buildWave(wave, seed) {
  const rng = mulberry32(seed * 7919 + wave * 104729);
  const size = waveSize(wave);
  const queue = [];
  const interval = Math.max(0.55, 1.25 - wave * 0.06);
  for (let i = 0; i < size; i += 1) {
    queue.push({ kind: pickKind(wave, rng), at: 0.4 + i * interval });
  }
  return { wave, queue, total: size };
}

// A spawn point on the arena edge, away from the Forge and the player.
export function spawnPoint(rng) {
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
  const rng = mulberry32(seed * 7919 + wave * 104729);
  const counts = {};
  for (let i = 0; i < waveSize(wave); i += 1) {
    const kind = pickKind(wave, rng);
    counts[kind] = (counts[kind] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([kind, n]) => `${n} ${ENEMY_TYPES[kind].label}${n > 1 ? 's' : ''}`)
    .join(' · ');
}
