// Bosses for CINDERWAKE: Cindermaw at wave 5 and the Hollow Maw at wave 10.
// A boss is a mite with a siege routine of its own — it holds range from the
// Forge, fires radial volleys, calls minions, and (the Maw) charges the wisp
// after a visible wind-up. Effects that reach outside the boss (spawning
// minions, firing shots, burst effects) go through the api object main.js
// hands to update(), so this file never imports the game itself.

import { BOSS_TYPES, FORGE, clamp, dist } from './config.js';
import { Mite } from './entities.js';

export class Boss extends Mite {
  constructor(kind, x, y) {
    super('brute', x, y, 1, { instant: false }); // borrowed body; boss tuning overrides below
    const type = BOSS_TYPES[kind];
    this.kind = kind;
    this.type = type; // boss tuning replaces the borrowed brute tuning
    this.isBoss = true;
    this.r = type.r;
    this.maxHp = type.hp; // bosses are tuned flat for their wave, no scaling
    this.hp = this.maxHp;
    this.speed = type.speed;
    this.mass = this.r / 6; // heavy: bullets barely shove it
    this.shieldMax = 0;
    this.shieldHp = 0;
    this.mode = 'advance'; // advance | siege | windup | charge | recover
    this.radialTimer = 2.2; // first volley comes a little late, as a hello
    this.spawnTimer = type.spawnEvery * 0.7;
    this.chargeTimer = type.chargeEvery || 0;
    this.windupTimer = 0;
    this.recoverTimer = 0;
    this.chargeDirX = 0;
    this.chargeDirY = 0;
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.enraged = false;
  }

  get scoreValue() {
    return this.type.score;
  }

  get emberValue() {
    return this.type.embers;
  }

  // Bosses besiege from this far out: close enough to threaten, far enough
  // that the wisp must come out and fight.
  siegeRange() {
    return FORGE.r + this.r + 120;
  }

  update(dt, player, time, api) {
    this.flash = Math.max(0, this.flash - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.contactTimer = Math.max(0, this.contactTimer - dt);
    this.wobble += dt * this.wobbleSpeed;

    // Knockback, heavily damped by mass (handled in shove()).
    this.x += this.kx * dt;
    this.y += this.ky * dt;
    const decay = Math.max(0, 1 - 7 * dt);
    this.kx *= decay;
    this.ky *= decay;

    const dForge = dist(this.x, this.y, FORGE.x, FORGE.y);
    const dPlayer = player.alive ? dist(this.x, this.y, player.x, player.y) : Infinity;

    if (this.spawning > 0) {
      this.spawning -= dt;
      this.latching = false;
      return { atForge: false, dPlayer };
    }

    if (!this.enraged && this.hp <= this.maxHp * this.type.enrageAt) {
      this.enraged = true;
      this.speed *= 1.25;
      api.roar(this);
    }
    const pace = this.enraged ? 0.7 : 1; // volleys and calls come faster

    // Radial volleys, in every mode but the charge itself.
    this.radialTimer -= dt;
    if (this.radialTimer <= 0 && this.mode !== 'charge') {
      this.radialTimer = this.type.radialEvery * pace;
      const count = this.type.radialCount + (this.enraged ? 4 : 0);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i += 1) {
        const a = base + (i * Math.PI * 2) / count;
        api.fireShot(
          this.x + Math.cos(a) * (this.r + 4), this.y + Math.sin(a) * (this.r + 4),
          Math.cos(a) * this.type.radialSpeed, Math.sin(a) * this.type.radialSpeed,
          this.type.radialDamage,
        );
      }
      api.burstFx(this.x, this.y, 10, this.type.color);
    }

    // Minion calls, capped so the arena never drowns.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.type.spawnEvery * pace;
      if (api.miteCount() < 14) {
        for (let i = 0; i < this.type.spawnCount; i += 1) {
          const a = Math.random() * Math.PI * 2;
          api.spawnEnemy(i % 3 === 2 ? 'skitter' : 'mite', this.x + Math.cos(a) * (this.r + 26), this.y + Math.sin(a) * (this.r + 26));
        }
        api.burstFx(this.x, this.y, 8, this.type.dark);
      }
    }

    // Movement by mode.
    if (this.mode === 'advance') {
      const dx = FORGE.x - this.x;
      const dy = FORGE.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      if (dForge > this.siegeRange()) {
        this.x += (dx / len) * this.speed * dt;
        this.y += (dy / len) * this.speed * dt;
      } else {
        this.mode = 'siege';
      }
    } else if (this.mode === 'siege') {
      // Slow orbit around the Forge, holding the siege ring.
      const a = Math.atan2(this.y - FORGE.y, this.x - FORGE.x) + this.orbitDir * dt * 0.14;
      const ring = this.siegeRange();
      this.x += (FORGE.x + Math.cos(a) * ring - this.x) * Math.min(1, dt * 2);
      this.y += (FORGE.y + Math.sin(a) * ring - this.y) * Math.min(1, dt * 2);
      if (this.type.chargeEvery > 0 && player.alive) {
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0) {
          this.mode = 'windup';
          this.windupTimer = this.type.chargeTelegraph;
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const len = Math.hypot(dx, dy) || 1;
          this.chargeDirX = dx / len;
          this.chargeDirY = dy / len;
          api.roar(this);
        }
      }
    } else if (this.mode === 'windup') {
      // Shuddering in place, line showing: the wisp's cue to dash away.
      this.windupTimer -= dt;
      if (this.windupTimer <= 0) this.mode = 'charge';
    } else if (this.mode === 'charge') {
      this.x += this.chargeDirX * this.type.chargeSpeed * dt;
      this.y += this.chargeDirY * this.type.chargeSpeed * dt;
      this.x = clamp(this.x, this.r, 1280 - this.r);
      this.y = clamp(this.y, this.r, 800 - this.r);
      const hitWall = this.x <= this.r || this.x >= 1280 - this.r || this.y <= this.r || this.y >= 800 - this.r;
      if (hitWall || dPlayer < this.r + player.r + 4) {
        this.mode = 'recover';
        this.recoverTimer = 1.1;
        api.burstFx(this.x, this.y, 14, this.type.color);
      }
    } else if (this.mode === 'recover') {
      this.recoverTimer -= dt;
      if (this.recoverTimer <= 0) {
        this.mode = 'siege';
        this.chargeTimer = this.type.chargeEvery;
      }
    }

    this.latching = false; // a boss never chews the Forge directly
    return { atForge: false, dPlayer };
  }
}
