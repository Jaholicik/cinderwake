// The things that live in the arena: the guardian wisp, its shots, the void
// mites, dropped embers, enemy spit, particles and floating damage numbers.
// Each class owns its own update step; drawing lives in render.js.

import { clamp, dist, ENEMY_TYPES, FORGE, PALETTE, PLAYER_BASE } from './config.js';

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
  }

  move(dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    this.thrust = clamp(len, 0, 1);
    if (len === 0) return;
    this.x = clamp(this.x + (dx / len) * this.speed * dt, this.r, 1280 - this.r);
    this.y = clamp(this.y + (dy / len) * this.speed * dt, this.r, 800 - this.r);
  }

  aimAt(mx, my) {
    this.facing = Math.atan2(my - this.y, mx - this.x);
  }

  update(dt) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.regen > 0 && this.alive) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
  }

  canFire() {
    return this.alive && this.fireCooldown <= 0;
  }

  fire() {
    this.fireCooldown = 1 / this.fireRate;
    const spread = 0.09;
    const shots = [];
    const n = this.projectiles;
    for (let i = 0; i < n; i += 1) {
      const offset = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const angle = this.facing + offset;
      shots.push(new Bullet(
        this.x + Math.cos(angle) * (this.r + 6),
        this.y + Math.sin(angle) * (this.r + 6),
        Math.cos(angle) * this.bulletSpeed,
        Math.sin(angle) * this.bulletSpeed,
        this.damage,
        this.bulletRadius,
        this.pierce,
      ));
    }
    return shots;
  }

  takeHit(amount) {
    if (!this.alive || this.invuln > 0) return false;
    this.hp -= amount;
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
  constructor(kind, x, y, wave) {
    const type = ENEMY_TYPES[kind];
    this.id = nextId;
    nextId += 1;
    this.kind = kind;
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = type.r;
    const hpScale = 1 + (wave - 1) * 0.22;
    this.maxHp = Math.round(type.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = type.speed * (1 + (wave - 1) * 0.02);
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 2 + Math.random() * 2;
    this.attackTimer = 0;
    this.contactTimer = 0;
    this.shotTimer = type.shotCooldown ? type.shotCooldown * (0.5 + Math.random() * 0.5) : 0;
    this.flash = 0; // hit-flash timer
    this.latching = false;
    this.dead = false;
  }

  takeHit(amount) {
    this.hp -= amount;
    this.flash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt, player, time) {
    this.flash = Math.max(0, this.flash - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.contactTimer = Math.max(0, this.contactTimer - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    this.wobble += dt * this.wobbleSpeed;

    const dForge = dist(this.x, this.y, FORGE.x, FORGE.y);
    const dPlayer = player.alive ? dist(this.x, this.y, player.x, player.y) : Infinity;

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
  constructor(x, y, vx, vy, damage) {
    this.id = nextId;
    nextId += 1;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
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
