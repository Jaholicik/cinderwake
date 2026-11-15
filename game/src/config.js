// CINDERWAKE tuning: every number that shapes the game lives here, so the
// balance can be read and changed in one place. Nothing here touches the DOM.

export const VIEW = { w: 1280, h: 800 };

export const PALETTE = {
  bgDeep: '#0b0b1e',
  bgMid: '#141432',
  bgGlow: '#1d1d4d',
  grid: 'rgba(120, 120, 220, 0.07)',
  forgeCore: '#ffb347',
  forgeHot: '#ff7a1a',
  forgeEmber: '#ff4d00',
  ember: '#ffa62b',
  player: '#2de1c2',
  playerDark: '#0f8f7d',
  playerGlow: 'rgba(45, 225, 194, 0.35)',
  bullet: '#ffe9a8',
  mite: '#8b5cf6',
  miteDark: '#5b21b6',
  skitter: '#c084fc',
  brute: '#a855f7',
  spitter: '#e879f9',
  enemyEye: '#fef3c7',
  danger: '#ff4d4d',
  text: '#f1f5ff',
  textDim: '#9aa3c7',
  card: '#1a1a3e',
  cardEdge: '#3b3b7a',
  cardHot: '#ff9a3d',
};

export const FORGE = {
  x: VIEW.w / 2,
  y: VIEW.h / 2,
  r: 46,
  maxHp: 100,
};

export const PLAYER_BASE = {
  r: 16,
  hp: 100,
  speed: 270,
  fireRate: 4.2, // shots per second
  damage: 12,
  bulletSpeed: 760,
  bulletRadius: 5,
  pierce: 0,
  projectiles: 1,
  magnet: 95,
  regen: 0, // hp per second, raised by upgrades
};

export const WAVE_COUNT = 10;

// Enemy kinds. hp and speed scale with the wave inside waves.js.
export const ENEMY_TYPES = {
  mite: {
    label: 'Void Mite', r: 14, hp: 20, speed: 58, forgeDps: 5, contact: 8,
    score: 50, embers: 2, minWave: 1, color: PALETTE.mite, dark: PALETTE.miteDark,
  },
  skitter: {
    label: 'Skitter', r: 10, hp: 12, speed: 118, forgeDps: 3, contact: 6,
    score: 75, embers: 2, minWave: 2, color: PALETTE.skitter, dark: '#7e22ce',
  },
  brute: {
    label: 'Brute', r: 25, hp: 95, speed: 36, forgeDps: 12, contact: 16,
    score: 150, embers: 5, minWave: 4, color: PALETTE.brute, dark: '#6b21a8',
  },
  spitter: {
    label: 'Spitter', r: 13, hp: 30, speed: 46, forgeDps: 0, contact: 8,
    score: 120, embers: 4, minWave: 6, color: PALETTE.spitter, dark: '#a21caf',
    ranged: true, range: 270, shotCooldown: 2.4, shotSpeed: 190, shotDamage: 9,
  },
};

export const EMBER_VALUE = 5; // score per ember collected
export const WAVE_CLEAR_BONUS = 100; // times wave number
export const DEATH_SCORE_COST = 150;
export const RESPAWN_INVULN = 2.0; // seconds
export const INTERMISSION = 3.0; // seconds between waves

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
