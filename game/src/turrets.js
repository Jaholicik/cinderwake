// Forge turrets for CINDERWAKE: stationary ember cannons raised between
// waves at fixed sockets around the Forge. A turret picks the nearest
// living mite in range and fires plain bolts at it; it has its own HP and
// can be chewed to a wreck by mites that reach it (main.js resolves the
// chewing). Building, buying and the upgrade-card synergy live in main.js
// and upgrades.js; drawing lives in render.js.

import { TURRETS, dist } from './config.js';
import { Bullet } from './entities.js';

export class Turret {
  constructor(socketIndex) {
    const socket = TURRETS.sockets[socketIndex];
    this.socket = socketIndex;
    this.x = socket.x;
    this.y = socket.y;
    this.r = TURRETS.radius;
    this.maxHp = TURRETS.hp;
    this.hp = this.maxHp;
    this.angle = -Math.PI / 2; // barrel rest pose: pointing up-arena
    this.fireCooldown = 0;
    this.flash = 0; // muzzle flash timer, read by render.js
    this.alive = true;
  }

  // Aim and fire. `stats` carries the run's current turret tuning (base
  // numbers from TURRETS, bent by the Sentry Tuning upgrade card), and
  // `fire` hands each fresh bolt back to the game. Returns true when a
  // shot left the barrel, so the game can play the sound.
  update(dt, mites, stats, fire) {
    this.flash = Math.max(0, this.flash - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (!this.alive) return false;
    let target = null;
    let bestD = TURRETS.range;
    for (const mite of mites) {
      if (mite.spawning > 0 || mite.dead) continue;
      const d = dist(this.x, this.y, mite.x, mite.y);
      if (d < bestD) { bestD = d; target = mite; }
    }
    if (!target) return false;
    // Lead the target a touch by its knockback drift, like the wisp does.
    const lead = Math.min(0.35, bestD / TURRETS.bulletSpeed);
    const tx = target.x + target.kx * lead * 0.4;
    const ty = target.y + target.ky * lead * 0.4;
    this.angle = Math.atan2(ty - this.y, tx - this.x);
    if (this.fireCooldown > 0) return false;
    this.fireCooldown = 1 / stats.fireRate;
    this.flash = 0.07;
    const bullet = new Bullet(
      this.x + Math.cos(this.angle) * (this.r + 5),
      this.y + Math.sin(this.angle) * (this.r + 5),
      Math.cos(this.angle) * TURRETS.bulletSpeed,
      Math.sin(this.angle) * TURRETS.bulletSpeed,
      stats.damage,
      4,
      0,
    );
    bullet.turret = true; // plain bolts: no arc leaps, no star shells
    fire(bullet);
    return true;
  }
}
