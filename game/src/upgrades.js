// Between-wave upgrades for CINDERWAKE: the pool of meaningful choices, the
// roll of three cards, and what each one does to the player or the Forge.

import { FORGE } from './config.js';

export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'Ember Rounds', icon: '✦',
    desc: '+35% bullet damage. Hits bite harder; brutes fall faster.',
    apply: (player) => { player.damage *= 1.35; },
  },
  {
    id: 'firerate', name: 'Rapid Wick', icon: '≋',
    desc: '+25% fire rate. More shots in the air, more mites down.',
    apply: (player) => { player.fireRate *= 1.25; },
  },
  {
    id: 'multishot', name: 'Twin Flame', icon: '⋔',
    desc: '+1 projectile per shot, fanned out. Crowd control.',
    apply: (player) => { player.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Light', icon: '→',
    desc: 'Shots pierce +1 extra mite. Lines of enemies, one bullet.',
    apply: (player) => { player.pierce += 1; },
  },
  {
    id: 'speed', name: 'Wispwind', icon: '➤',
    desc: '+15% move speed. Outrun skitters, kite brutes.',
    apply: (player) => { player.speed *= 1.15; },
  },
  {
    id: 'magnet', name: 'Ember Lure', icon: '◎',
    desc: '+90 ember magnet radius. Embers fly to you from afar.',
    apply: (player) => { player.magnet += 90; },
  },
  {
    id: 'repair', name: 'Rekindle', icon: '♨',
    desc: 'Repair the Forge +40 HP and raise its max by +20.',
    apply: (player, game) => {
      game.forgeMaxHp += 20;
      game.forgeHp = Math.min(game.forgeMaxHp, game.forgeHp + 40);
    },
  },
  {
    id: 'maxhp', name: 'Thick Wisp', icon: '♥',
    desc: '+25 max HP and heal 25 now. A sturdier guardian.',
    apply: (player) => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); },
  },
  {
    id: 'regen', name: 'Slow Burn', icon: '✚',
    desc: 'Regenerate +1.5 HP per second for the rest of the run.',
    apply: (player) => { player.regen += 1.5; },
  },
  {
    id: 'heavy', name: 'Molten Shot', icon: '●',
    desc: '+2 bullet size and +15% damage. Big, heavy embers.',
    apply: (player) => { player.bulletRadius += 2; player.damage *= 1.15; },
  },
];

// Roll three distinct upgrade cards. `rng` is the game's seeded random.
export function rollUpgrades(rng, count = 3) {
  const pool = [...UPGRADE_POOL];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}
