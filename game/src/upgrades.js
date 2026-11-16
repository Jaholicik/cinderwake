// Between-wave upgrades for CINDERWAKE: the pool of meaningful choices, the
// roll of three cards, and what each one does to the player or the Forge.
// Seventeen cards: commons that stack, and rares that bend the run. Some cards
// name a partner — own one half and the other half is likelier to appear,
// and taking it lights the synergy the card promises.

import { FORGE } from './config.js';

export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'Ember Rounds', icon: '✦', rarity: 'common',
    desc: '+35% bullet damage. Hits bite harder; brutes fall faster.',
    apply: (player) => { player.damage *= 1.35; },
  },
  {
    id: 'firerate', name: 'Rapid Wick', icon: '≋', rarity: 'common',
    desc: '+25% fire rate. More shots in the air, more mites down.',
    apply: (player) => { player.fireRate *= 1.25; },
  },
  {
    id: 'multishot', name: 'Twin Flame', icon: '⋔', rarity: 'common',
    synergyWith: 'arc', synergyName: 'Storm Choir',
    desc: '+1 projectile per shot, fanned out. Crowd control.',
    apply: (player) => { player.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Light', icon: '→', rarity: 'common',
    synergyWith: 'damage', synergyName: 'Lance of Dawn',
    desc: 'Shots pierce +1 extra mite. Lines of enemies, one bullet.',
    apply: (player) => { player.pierce += 1; },
  },
  {
    id: 'speed', name: 'Wispwind', icon: '➤', rarity: 'common',
    synergyWith: 'flicker', synergyName: 'Ghostflame',
    desc: '+15% move speed. Outrun skitters, kite brutes.',
    apply: (player) => { player.speed *= 1.15; },
  },
  {
    id: 'magnet', name: 'Ember Lure', icon: '◎', rarity: 'common',
    desc: '+90 ember magnet radius. Embers fly to you from afar.',
    apply: (player) => { player.magnet += 90; },
  },
  {
    id: 'repair', name: 'Rekindle', icon: '♨', rarity: 'common',
    synergyWith: 'phoenix', synergyName: 'Eternal Hearth',
    desc: 'Repair the Forge +40 HP and raise its max by +20.',
    apply: (player, game) => {
      game.forgeMaxHp += 20;
      game.forgeHp = Math.min(game.forgeMaxHp, game.forgeHp + 40);
    },
  },
  {
    id: 'maxhp', name: 'Thick Wisp', icon: '♥', rarity: 'common',
    desc: '+25 max HP and heal 25 now. A sturdier guardian.',
    apply: (player) => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); },
  },
  {
    id: 'regen', name: 'Slow Burn', icon: '✚', rarity: 'common',
    desc: 'Regenerate +1.5 HP per second for the rest of the run.',
    apply: (player) => { player.regen += 1.5; },
  },
  {
    id: 'heavy', name: 'Molten Shot', icon: '●', rarity: 'common',
    synergyWith: 'starfall', synergyName: 'Meteor Heart',
    desc: '+2 bullet size and +15% damage. Big, heavy embers.',
    apply: (player) => { player.bulletRadius += 2; player.damage *= 1.15; },
  },
  {
    id: 'flicker', name: 'Flickerstep', icon: '»', rarity: 'common',
    synergyWith: 'speed', synergyName: 'Ghostflame',
    desc: 'Dash recharges 40% faster, and its ghost lingers a breath longer.',
    apply: (player) => { player.dashCdMax *= 0.6; },
  },
  {
    id: 'siphon', name: 'Ember Siphon', icon: '❖', rarity: 'common',
    synergyWith: 'novamastery', synergyName: 'Ember Engine',
    desc: 'Every kill shakes loose +1 extra ember. Greed, kindled.',
    apply: (player) => { player.siphon += 1; },
  },
  {
    id: 'turret', name: 'Sentry Tuning', icon: '⌖', rarity: 'common',
    desc: 'Forge turrets hit +40% harder and fire +25% faster; standing turrets mend to full.',
    apply: (player, game) => {
      game.turretDamage *= 1.4;
      game.turretFireRate *= 1.25;
      for (const turret of game.turrets) if (turret.alive) turret.hp = turret.maxHp;
    },
  },
  {
    id: 'arc', name: 'Arc Conductor', icon: '↯', rarity: 'rare',
    synergyWith: 'multishot', synergyName: 'Storm Choir',
    desc: 'RARE — Hits have a 30% chance to arc lightning to a nearby mite for half damage.',
    apply: (player) => { player.arcChance += 0.3; },
  },
  {
    id: 'starfall', name: 'Starfall Rounds', icon: '✹', rarity: 'rare',
    synergyWith: 'heavy', synergyName: 'Meteor Heart',
    desc: 'RARE — Every 5th shot is a star shell: triple damage that bursts over a wide mark.',
    apply: (player) => { player.starfallEvery = 5; },
  },
  {
    id: 'novamastery', name: 'Nova Mastery', icon: '✺', rarity: 'rare',
    synergyWith: 'siphon', synergyName: 'Ember Engine',
    desc: 'RARE — Ember Nova grows: +45% reach, +60% damage, and it recharges a third faster.',
    apply: (player) => {
      player.novaRadius *= 1.45;
      player.novaDamage *= 1.6;
      player.novaCdMax *= 0.67;
    },
  },
  {
    id: 'phoenix', name: 'Phoenix Wick', icon: '✵', rarity: 'rare',
    synergyWith: 'repair', synergyName: 'Eternal Hearth',
    desc: 'RARE — The first time the Forge would fall, it rekindles at 35% instead. Once.',
    apply: (player, game) => { game.phoenixCharges += 1; },
  },
];

// Roll three distinct upgrade cards. `rng` is the game's seeded random and
// `ownedIds` the cards already taken: rares weigh less, and a card whose
// synergy partner is owned weighs much more — builds bend toward pairs.
// Each returned card is a copy; `synergyLit` marks a live synergy.
export function rollUpgrades(rng, ownedIds = [], count = 3) {
  const owned = new Set(ownedIds);
  const pool = UPGRADE_POOL.filter((card) => card.id !== 'phoenix' || !owned.has('phoenix'));
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    let total = 0;
    const weights = pool.map((card) => {
      let w = card.rarity === 'rare' ? 0.45 : 1;
      if (card.synergyWith && owned.has(card.synergyWith)) w *= 3;
      total += w;
      return w;
    });
    let roll = rng() * total;
    let index = 0;
    while (roll > weights[index]) { roll -= weights[index]; index += 1; }
    const [card] = pool.splice(index, 1);
    picks.push({
      ...card,
      synergyLit: Boolean(card.synergyWith && owned.has(card.synergyWith)),
    });
  }
  return picks;
}

export { FORGE };
