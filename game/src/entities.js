// The things that live in the arena: the guardian wisp, its shots, the void
// mites, dropped embers, enemy spit, particles and floating damage numbers.
// Each class owns its own update step; drawing lives in render.js.

import {
  ABILITIES, ELITE, ENDLESS, SPAWN_TELEGRAPH, WAVE_COUNT, clamp, dist, ENEMY_TYPES, FORGE,
  PALETTE, PLAYER_BASE,
} from './config.js';

let nextId = 1;

export class Player {
  constructor() {
    this.id = nextId;
    nextId += 1;
    this.x = FORGE.x;
    this.y = FORGE.y + 150;
    this.r = PLAYER_BASE.r;
    this.maxHp = PLAYER_BASE.hp;
    this.hp = this.maxHp;
    this.speed = PLAYER_BASE.speed;
    this.fireRate = PLAYER_BASE.fireRate;
    this.damage = PLAYER_BASE.damage;
    this.bulletSpeed = PLAYER_BASE.bulletSpeed;
    this.bulletRadius = PLAYER_BASE.bulletRadius;
    this.pierce = PLAYER_BASE.pierce;
    this.projectiles = PLAYER_BASE.projectiles;
    this.magnet = PLAYER_BASE.magnet;
    this.regen = PLAYER_BASE.regen;
    this.fireCooldown = 0;
    this.invuln = 0;
    this.alive = true;
    this.deaths = 0;
    this.facing = -Math.PI / 2;
    this.thrust = 0; // 0..1, how hard the wisp is moving (drives the flame)
    // Ability state, tuned from ABILITIES and bent by upgrades.
    this.dashCd = 0;
    this.dashCdMax = ABILITIES.dashCooldown;
    this.dashTime = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.dashTrail = []; // recent positions, drawn as afterimages
    this.novaCd = 0;
    this.novaCdMax = ABILITIES.novaCooldown;
    this.novaRadius = ABILITIES.novaRadius;
    this.novaDamage = ABILITIES.novaDamage;
    this.hurtFlash = 0; // drives the red edge vignette when a hit lands
    this.hurtDir = 0; // angle toward the last thing that hurt the wisp
    this.hurtDirTimer = 0; // drives the damage-direction indicator
    // Upgrade-driven extras.
    this.siphon = 0; // extra embers per kill
    this.arcChance = 0; // chance a hit arcs to a neighbour
    this.starfallEvery = 0; // every Nth shot is an explosive star shell (0 = off)
    this.shotsFired = 0;
  }

  move(dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    this.thrust = clamp(len, 0, 1);
    if (this.dashTime > 0) return; // the dash owns movement while it lasts
    if (len === 0) return;
    this.x = clamp(this.x + (dx / len) * this.speed * dt, this.r, 1280 - this.r);
    this.y = clamp(this.y + (dy / len) * this.speed * dt, this.r, 800 - this.r);
  }

  aimAt(mx, my) {
    this.facing = Math.atan2(my - this.y, mx - this.x);
  }

  startDash(dx, dy) {
    if (!this.alive || this.dashCd > 0 || this.dashTime > 0) return false;
    let len = Math.hypot(dx, dy);
    if (len === 0) { dx = Math.cos(this.facing); dy = Math.sin(this.facing); len = 1; }
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashTime = ABILITIES.dashTime;
    this.dashCd = this.dashCdMax;
    this.invuln = Math.max(this.invuln, ABILITIES.dashTime + ABILITIES.dashIframes);
    return true;
  }

  get dashing() {
    return this.dashTime > 0;
  }

  startNova() {
    if (!this.alive || this.novaCd > 0) return false;
    this.novaCd = this.novaCdMax;
    return true;
  }

  update(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.novaCd = Math.max(0, this.novaCd - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.hurtDirTimer = Math.max(0, this.hurtDirTimer - dt);
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.dashTrail.unshift({ x: this.x, y: this.y, facing: this.facing });
      if (this.dashTrail.length > 5) this.dashTrail.pop();
      this.x = clamp(this.x + this.dashDirX * ABILITIES.dashSpeed * dt, this.r, 1280 - this.r);
      this.y = clamp(this.y + this.dashDirY * ABILITIES.dashSpeed * dt, this.r, 800 - this.r);
    } else if (this.dashTrail.length > 0) {
      this.dashTrail.pop();
    }
    if (this.regen > 0 && this.alive) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
  }

  canFire() {
    return this.alive && this.fireCooldown <= 0;
  }

  fire() {
    this.fireCooldown = 1 / this.fireRate;
    this.shotsFired += 1;
    const spread = 0.09;
    const shots = [];
    const n = this.projectiles;
    const star = this.starfallEvery > 0 && this.shotsFired % this.starfallEvery === 0;
    for (let i = 0; i < n; i += 1) {
      const offset = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const angle = this.facing + offset;
      const bullet = new Bullet(
        this.x + Math.cos(angle) * (this.r + 6),
        this.y + Math.sin(angle) * (this.r + 6),
        Math.cos(angle) * this.bulletSpeed,
        Math.sin(angle) * this.bulletSpeed,
        star ? this.damage * 3 : this.damage,
        star ? this.bulletRadius + 3 : this.bulletRadius,
        this.pierce,
      );
      bullet.explosive = star;
      shots.push(bullet);
    }
    return shots;
  }

  takeHit(amount) {
    if (!this.alive || this.invuln > 0) return false;
    this.hp -= amount;
    this.hurtFlash = 0.4;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deaths += 1;
    }
    return true;
  }

  respawn() {
    this.x = FORGE.x;
    this.y = FORGE.y + 150;
    this.hp = this.maxHp;
    this.alive = true;
    this.invuln = 2.0;
    this.fireCooldown = 0;
    this.dashTime = 0;
    this.dashCd = 0;
  }
}

export class Bullet {
  constructor(x, y, vx, vy, damage, radius, pierce) {
    this.id = nextId;
    nextId += 1;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.r = radius;
    this.pierce = pierce;
    this.hitIds = new Set();
    this.life = 1.4;
    this.explosive = false; // star shells burst on impact (see main.js)
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -20 || this.x > 1300 || this.y < -20 || this.y > 820) this.dead = true;
  }
}

export class Mite {
  constructor(kind, x, y, wave, opts = {}) {
    const type = ENEMY_TYPES[kind];
    this.id = nextId;
    nextId += 1;
    this.kind = kind;
    this.type = type;
    this.x = x;
    this.y = y;
    this.elite = Boolean(opts.elite);
    this.isBoss = false;
    this.r = type.r * (this.elite ? ELITE.radiusScale : 1);
    // Past wave 10 (endless), the growth steepens so the dark always wins
    // eventually: extra HP and speed for every wave beyond the campaign.
    const endlessSteps = Math.max(0, wave - WAVE_COUNT);
    const hpScale = (1 + (wave - 1) * 0.30 + endlessSteps * ENDLESS.hpPerWave)
      * (this.elite ? ELITE.hpScale : 1);
    this.maxHp = Math.round(type.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = type.speed
      * (1 + (wave - 1) * 0.03 + endlessSteps * ENDLESS.speedPerWave)
      * (this.elite ? ELITE.speedScale : 1);
    this.mass = this.r / 14; // knockback resistance
    this.kx = 0; // knockback velocity, shoved by bullets and the nova
    this.ky = 0;
    // Bulwark ward: eats damage before HP does and regrows when left alone.
    this.shieldMax = type.shieldHp ? Math.round(type.shieldHp * (1 + (wave - 1) * 0.18)) : 0;
    this.shieldHp = this.shieldMax;
    this.shieldRegenT = 0;
    this.shieldJustBroke = false;
    this.shieldFlash = 0;
    this.spawning = opts.instant ? 0 : SPAWN_TELEGRAPH;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 2 + Math.random() * 2;
    this.attackTimer = 0;
    this.contactTimer = 0;
    this.shotTimer = type.shotCooldown ? type.shotCooldown * (0.5 + Math.random() * 0.5) : 0;
    this.flash = 0; // hit-flash timer
    this.latching = false;
    this.dead = false;
  }

  get scoreValue() {
    return this.type.score * (this.elite ? ELITE.scoreScale : 1);
  }

  get emberValue() {
    return this.type.embers + (this.elite ? ELITE.bonusEmbers : 0);
  }

  // Returns true when the hit kills. A live ward absorbs first; the caller
  // reads shieldJustBroke / shieldFlash for feedback.
  takeHit(amount) {
    if (this.shieldHp > 0) {
      this.shieldRegenT = this.type.shieldRegenDelay || 3;
      this.shieldFlash = 0.12;
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      amount -= absorbed;
      if (this.shieldHp <= 0) this.shieldJustBroke = true;
      if (amount <= 0) return false;
    }
    this.hp -= amount;
    this.flash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  shove(vx, vy) {
    this.kx += vx / this.mass;
    this.ky += vy / this.mass;
  }

  update(dt, player, time) {
    this.flash = Math.max(0, this.flash - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.contactTimer = Math.max(0, this.contactTimer - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    this.wobble += dt * this.wobbleSpeed;

    // Knockback always applies, even mid-materialisation.
    this.x += this.kx * dt;
    this.y += this.ky * dt;
    const decay = Math.max(0, 1 - 7 * dt);
    this.kx *= decay;
    this.ky *= decay;

    // Ward regrowth once the wisp stops chewing on it.
    if (this.shieldMax > 0 && this.shieldHp > 0 && this.shieldHp < this.shieldMax) {
      this.shieldRegenT -= dt;
      if (this.shieldRegenT <= 0) {
        this.shieldHp = Math.min(this.shieldMax, this.shieldHp + (this.type.shieldRegenRate || 14) * dt);
      }
    }

    const dForge = dist(this.x, this.y, FORGE.x, FORGE.y);
    const dPlayer = player.alive ? dist(this.x, this.y, player.x, player.y) : Infinity;

    // Still shimmering in: visible, harmless, and it cannot act yet.
    if (this.spawning > 0) {
      this.spawning -= dt;
      this.latching = false;
      return { atForge: false, dPlayer };
    }

    // Spitters hold their range from the Forge and shoot; the rest walk in.
    let tx = FORGE.x;
    let ty = FORGE.y;
    if (this.type.ranged) {
      if (dForge < this.type.range * 0.8) { tx = this.x + (this.x - FORGE.x); ty = this.y + (this.y - FORGE.y); }
    } else if (dPlayer < 130 && dPlayer < dForge) {
      // Close mites turn on the wisp instead of the Forge.
      tx = player.x;
      ty = player.y;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const wob = this.type.ranged ? 0 : Math.sin(this.wobble) * 0.35;
    const px = -dy / len;
    const py = dx / len;
    const atForge = dForge <= FORGE.r + this.r + 2;
    this.latching = atForge && !this.type.ranged;
    if (!this.latching) {
      this.x += ((dx / len) * this.speed + px * wob * this.speed) * dt;
      this.y += ((dy / len) * this.speed + py * wob * this.speed) * dt;
    }
    return { atForge, dPlayer };
  }
}

export class EnemyShot {
  constructor(x, y, vx, vy, damage, fromBoss = false) {
    this.id = nextId;
    nextId += 1;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    // Boss bolts are wisp-bane: they unravel the guardian, not the stone,
    // so they pass over the Forge. Spitter globs still splash it.
    this.fromBoss = fromBoss;
    this.r = 7;
    this.life = 4;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -20 || this.x > 1300 || this.y < -20 || this.y > 820) this.dead = true;
  }
}

export class Ember {
  constructor(x, y, value) {
    this.id = nextId;
    nextId += 1;
    this.x = x;
    this.y = y;
    this.value = value;
    this.r = 6;
    this.vx = (Math.random() - 0.5) * 90;
    this.vy = (Math.random() - 0.5) * 90;
    this.life = 14;
    this.bob = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(dt, player) {
    this.bob += dt * 4;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const d = dist(this.x, this.y, player.x, player.y);
    if (player.alive && d < player.magnet) {
      const pull = 520 * (1 - d / (player.magnet + 60));
      this.vx += ((player.x - this.x) / (d || 1)) * pull * dt;
      this.vy += ((player.y - this.y) / (d || 1)) * pull * dt;
    } else {
      this.vx *= (1 - 2.2 * dt);
      this.vy *= (1 - 2.2 * dt);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= (1 - 2.5 * dt);
    this.vy *= (1 - 2.5 * dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export class FloatText {
  constructor(x, y, text, color, size = 15) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.9;
    this.maxLife = 0.9;
    this.dead = false;
  }

  update(dt) {
    this.y -= 42 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export function burst(particles, x, y, count, color, speed = 160, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.65);
    particles.push(new Particle(
      x, y,
      Math.cos(angle) * v, Math.sin(angle) * v,
      0.35 + Math.random() * 0.45,
      size * (0.6 + Math.random() * 0.8),
      color,
    ));
  }
}

export { PALETTE };
