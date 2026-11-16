// CINDERWAKE tuning: every number that shapes the game lives here, so the
// balance can be read and changed in one place. Nothing here touches the DOM.

export const VIEW = { w: 1280, h: 800 };

export const PALETTE = {
  bgDeep: '#0b0b1e',
  bgMid: '#141432',
  bgGlow: '#1d1d4d',
  grid: 'rgba(120, 120, 220, 0.07)',
  silhouette: 'rgba(8, 8, 24, 0.6)',
  silhouetteFar: 'rgba(16, 14, 40, 0.5)',
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
  splitter: '#fb7185',
  splitterDark: '#9f1239',
  bulwark: '#60a5fa',
  bulwarkDark: '#1e40af',
  shield: '#67e8f9',
  boss: '#f43f5e',
  bossDark: '#881337',
  bossEye: '#ffe4e6',
  elite: '#ffd94d',
  combo: '#ffdf6b',
  nova: '#7df9ff',
  enemyEye: '#fef3c7',
  danger: '#ff4d4d',
  text: '#f1f5ff',
  textDim: '#9aa3c7',
  card: '#1a1a3e',
  cardEdge: '#3b3b7a',
  cardHot: '#ff9a3d',
  cardRare: '#ffc233',
};

export const FORGE = {
  x: VIEW.w / 2,
  y: VIEW.h / 2,
  r: 46,
  maxHp: 130,
};

// Forge turrets: stationary ember cannons the player raises between waves
// by spending banked embers, one per socket. The sockets ring the Forge at
// 128px, right on the mites' approach lanes — so a turret both guards the
// stone and can be chewed down like the stone. Tuning lives here; the
// Turret class lives in turrets.js.
export const TURRETS = {
  cost: 25, // embers to build, or to rebuild a wreck
  hp: 75,
  damage: 6,
  fireRate: 2.2, // shots per second
  range: 250,
  bulletSpeed: 660,
  radius: 15,
  sockets: [
    { x: 640, y: 272 }, // north
    { x: 529, y: 464 }, // south-west
    { x: 751, y: 464 }, // south-east
  ],
};

// Endless mode ("The Forge Endures"): past wave 10 the per-wave growth in
// entities.js steepens by these extra steps, so the dark eventually wins.
export const ENDLESS = {
  hpPerWave: 0.15, // extra HP scale per wave beyond 10
  speedPerWave: 0.02, // extra speed scale per wave beyond 10
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

// Active abilities. Dash: a burst of speed with invulnerability frames.
// Nova: an ember shockwave around the wisp that wounds and shoves mites.
export const ABILITIES = {
  dashCooldown: 2.4,
  dashTime: 0.16,
  dashSpeed: 980,
  dashIframes: 0.1, // extra invulnerability after the dash ends
  novaCooldown: 11,
  novaRadius: 175,
  novaDamage: 60,
  novaKnockback: 460,
};

// Kill-streak scoring: each kill inside the window adds to the streak and
// pays a bonus that grows with it. Milestones shout on screen.
export const COMBO = {
  window: 3.0, // seconds between kills before the streak cools
  bonusPerKill: 2, // extra score per streak count, capped below
  bonusCap: 50,
  milestones: [10, 25, 50, 100],
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
  splitter: {
    label: 'Splitter', r: 16, hp: 34, speed: 52, forgeDps: 5, contact: 8,
    score: 110, embers: 3, minWave: 3, color: PALETTE.splitter, dark: PALETTE.splitterDark,
    splitsInto: 3, // mites that crawl out of the corpse
  },
  brute: {
    label: 'Brute', r: 25, hp: 95, speed: 36, forgeDps: 12, contact: 16,
    score: 150, embers: 5, minWave: 4, color: PALETTE.brute, dark: '#6b21a8',
  },
  bulwark: {
    label: 'Bulwark', r: 23, hp: 70, speed: 40, forgeDps: 10, contact: 14,
    score: 170, embers: 5, minWave: 5, color: PALETTE.bulwark, dark: PALETTE.bulwarkDark,
    shieldHp: 55, // a ward that eats damage first and regrows if left alone
    shieldRegenDelay: 3.0,
    shieldRegenRate: 14,
  },
  spitter: {
    label: 'Spitter', r: 13, hp: 30, speed: 46, forgeDps: 0, contact: 8,
    score: 120, embers: 4, minWave: 6, color: PALETTE.spitter, dark: '#a21caf',
    ranged: true, range: 270, shotCooldown: 2.4, shotSpeed: 190, shotDamage: 9,
  },
};

// Bosses do not scale with the wave: their numbers are tuned for the wave
// they guard. They besiege the Forge from range, burst radial volleys and
// call minions; the Hollow Maw also charges the wisp.
export const BOSS_TYPES = {
  miniboss: {
    label: 'Cindermaw', bossName: 'CINDERMAW, THE EMBER THIEF',
    r: 40, hp: 920, speed: 30, forgeDps: 9, contact: 18,
    score: 1500, embers: 12, color: PALETTE.boss, dark: PALETTE.bossDark,
    radialEvery: 4.2, radialCount: 10, radialSpeed: 170, radialDamage: 8,
    spawnEvery: 6.5, spawnCount: 2, chargeEvery: 0, enrageAt: 0.35,
  },
  boss: {
    label: 'The Hollow Maw', bossName: 'THE HOLLOW MAW',
    r: 54, hp: 2850, speed: 26, forgeDps: 12, contact: 22,
    score: 4000, embers: 22, color: PALETTE.boss, dark: PALETTE.bossDark,
    radialEvery: 3.6, radialCount: 14, radialSpeed: 185, radialDamage: 9,
    spawnEvery: 5.5, spawnCount: 3, chargeEvery: 7.0, chargeSpeed: 520,
    chargeTelegraph: 0.7, enrageAt: 0.4,
  },
};

export const BOSS_WAVES = { 5: 'miniboss', 10: 'boss' };

// Elites: rare gilded variants of the walking kinds — bigger, tougher,
// worth far more. Rolled per spawn from wave 3 on.
export const ELITE = {
  chance: 0.08,
  minWave: 3,
  hpScale: 2.6,
  radiusScale: 1.25,
  speedScale: 0.95,
  scoreScale: 3,
  bonusEmbers: 4,
};

export const EMBER_VALUE = 5; // score per ember collected
export const WAVE_CLEAR_BONUS = 100; // times wave number
export const DEATH_SCORE_COST = 150;
export const RESPAWN_INVULN = 2.0; // seconds
export const INTERMISSION = 3.0; // seconds between waves
export const SPAWN_TELEGRAPH = 0.55; // seconds a mite shimmers before it can act

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
