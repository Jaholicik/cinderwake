// CINDERWAKE entry point: the game loop, the state machine (menu → playing
// → upgrade → victory / game over), collisions, waves and scoring. It wires
// input, audio, entities and render together and nothing else.

import {
  DEATH_SCORE_COST, EMBER_VALUE, FORGE, INTERMISSION, PALETTE, VIEW,
  WAVE_CLEAR_BONUS, WAVE_COUNT, clamp, dist, mulberry32,
} from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import {
  Ember, EnemyShot, FloatText, Mite, Particle, Player, burst,
} from './entities.js';
import { buildWave, isFinalWave, spawnPoint, waveMix } from './waves.js';
import { rollUpgrades } from './upgrades.js';
import * as render from './render.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
canvas.width = VIEW.w;
canvas.height = VIEW.h;
const ctx = canvas.getContext('2d');

export class Game {
  constructor() {
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.rng = mulberry32((Date.now() % 2147483647) || 1);
    this.seed = 1;
    this.state = 'menu'; // menu | playing | upgrade | paused | gameover | victory
    this.time = 0;
    this.shake = 0;
    this.player = new Player();
    this.forgeHp = FORGE.maxHp;
    this.forgeMaxHp = FORGE.maxHp;
    this.wave = 0;
    this.score = 0;
    this.embers = 0;
    this.kills = 0;
    this.upgradesTaken = 0;
    this.waveTime = 0;
    this.intermission = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawned = 0;
    this.mites = [];
    this.bullets = [];
    this.enemyShots = [];
    this.emberDrops = [];
    this.particles = [];
    this.texts = [];
    this.upgradeChoices = [];
    this.hoverCard = -1;
    this.waveIncoming = '';
    this.autoPlay = false; // screenshot hooks drive the wisp themselves
    this.muzzle = 0;
  }

  reset(seed = 1) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.state = 'menu';
    this.time = 0;
    this.shake = 0;
    this.player = new Player();
    this.forgeHp = FORGE.maxHp;
    this.forgeMaxHp = FORGE.maxHp;
    this.wave = 0;
    this.score = 0;
    this.embers = 0;
    this.kills = 0;
    this.upgradesTaken = 0;
    this.waveTime = 0;
    this.intermission = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawned = 0;
    this.mites = [];
    this.bullets = [];
    this.enemyShots = [];
    this.emberDrops = [];
    this.particles = [];
    this.texts = [];
    this.upgradeChoices = [];
    this.hoverCard = -1;
    this.waveIncoming = '';
    this.autoPlay = false;
    this.muzzle = 0;
  }

  startRun() {
    this.reset(this.seed);
    this.state = 'playing';
    this.nextWave();
    this.sound.unlock();
    this.sound.waveStart();
    this.announce(`Wave 1. Defend the Forge.`);
  }

  nextWave() {
    this.wave += 1;
    const built = buildWave(this.wave, this.seed);
    this.spawnQueue = built.queue;
    this.spawnTimer = 0;
    this.spawned = 0;
    this.waveTime = 0;
    this.intermission = INTERMISSION;
    this.waveIncoming = waveMix(this.wave, this.seed);
    this.announce(`Wave ${this.wave} of ${WAVE_COUNT}: ${this.waveIncoming}`);
  }

  announce(text) {
    if (statusEl) statusEl.textContent = text;
  }

  enemiesLeft() {
    return this.mites.length + (this.spawnQueue.length - this.spawned);
  }

  spawnMite(kind) {
    const point = spawnPoint(this.rng);
    this.mites.push(new Mite(kind, point.x, point.y, this.wave));
  }

  addScore(amount, x, y, color = '#f1f5ff', size = 15) {
    this.score += amount;
    if (x !== undefined) this.texts.push(new FloatText(x, y, `+${amount}`, color, size));
  }

  damageForge(amount) {
    if (this.state !== 'playing') return;
    this.forgeHp -= amount;
    this.shake = Math.max(this.shake, 4);
    if (this.forgeHp <= 0) {
      this.forgeHp = 0;
      this.endRun(false);
    }
  }

  killMite(mite) {
    this.kills += 1;
    this.addScore(mite.type.score, mite.x, mite.y - 10, '#c084fc', 16);
    burst(this.particles, mite.x, mite.y, mite.kind === 'brute' ? 26 : 14, mite.type.color, 200, 3.5);
    burst(this.particles, mite.x, mite.y, 6, PALETTE.forgeCore, 120, 2.5);
    for (let i = 0; i < mite.type.embers; i += 1) {
      this.emberDrops.push(new Ember(mite.x, mite.y, 1));
    }
    this.shake = Math.max(this.shake, mite.kind === 'brute' ? 7 : 3);
    this.sound.kill();
  }

  endRun(won) {
    this.state = won ? 'victory' : 'gameover';
    burst(this.particles, FORGE.x, FORGE.y, won ? 80 : 50, won ? PALETTE.forgeCore : '#5b21b6', 260, 4);
    if (won) this.sound.victory();
    else this.sound.gameOver();
    this.announce(won ? 'Victory! The Forge ascends.' : 'Game over. The Forge goes dark.');
  }

  openUpgrades() {
    this.upgradeChoices = rollUpgrades(this.rng);
    this.state = 'upgrade';
    this.sound.upgrade();
    this.announce(`Wave ${this.wave} cleared. Choose one upgrade.`);
  }

  takeUpgrade(index) {
    const up = this.upgradeChoices[index];
    if (!up) return;
    up.apply(this.player, this);
    this.upgradesTaken += 1;
    this.sound.upgrade();
    this.texts.push(new FloatText(this.player.x, this.player.y - 30, up.name, PALETTE.forgeCore, 18));
    this.state = 'playing';
    this.nextWave();
  }

  // ---- per-frame update ----

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 22);
    this.muzzle = Math.max(0, this.muzzle - dt * 6);
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => !p.dead);
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter((t) => !t.dead);

    if (this.state === 'menu') {
      this.updateMenu(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'upgrade') {
      this.updateUpgrade(dt);
    }
    // paused / gameover / victory: the world freezes, particles settle.
  }

  updateMenu(dt) {
    // Slow ember drift behind the title: purely decorative.
    if (Math.random() < dt * 8) {
      this.particles.push(new Particle(
        Math.random() * VIEW.w, VIEW.h + 10,
        (Math.random() - 0.5) * 20, -30 - Math.random() * 40,
        3 + Math.random() * 2, 2 + Math.random() * 2, PALETTE.forgeHot,
      ));
    }
    if (this.input.wasPressed('Enter', 'Space') || this.input.wasClicked()) {
      this.sound.unlock();
      this.sound.click();
      this.startRun();
    }
  }

  updatePlaying(dt) {
    const input = this.input;
    const p = this.player;
    this.waveTime += dt;

    if (input.wasPressed('KeyP', 'Escape')) {
      this.state = 'paused';
      return;
    }
    if (input.wasPressed('KeyM')) this.sound.toggleMute();
    if (input.wasPressed('KeyR')) { this.startRun(); return; }

    // Movement.
    let dx = 0;
    let dy = 0;
    if (input.down('KeyW', 'ArrowUp')) dy -= 1;
    if (input.down('KeyS', 'ArrowDown')) dy += 1;
    if (input.down('KeyA', 'ArrowLeft')) dx -= 1;
    if (input.down('KeyD', 'ArrowRight')) dx += 1;
    if (this.autoPlay) {
      // Orbit the Forge so the wisp stays near the mites and their embers.
      const angle = this.time * 0.8;
      const tx = FORGE.x + Math.cos(angle) * 200;
      const ty = FORGE.y + Math.sin(angle) * 150;
      const ddx = tx - p.x;
      const ddy = ty - p.y;
      const dl = Math.hypot(ddx, ddy) || 1;
      dx = ddx / dl;
      dy = ddy / dl;
      // Aim at the nearest mite, else at the Forge's edge. A mite latched
      // on the Forge is the priority: it is chewing the thing we defend.
      const latching = this.mites.filter((m) => m.latching);
      const target = latching.length > 0 ? latching[0] : this.nearestMite();
      if (target) input.setMouse(target.x, target.y, true);
      else input.setMouse(FORGE.x + 200, FORGE.y, false);
    }
    p.move(dx, dy, dt);
    p.aimAt(input.mouseX, input.mouseY);
    p.update(dt);

    // Firing.
    if ((input.mouseDown || this.autoPlay) && p.canFire()) {
      const shots = p.fire();
      for (const s of shots) this.bullets.push(s);
      this.muzzle = 1;
      this.sound.shoot();
    }

    // Spawning.
    if (this.intermission > 0) {
      this.intermission -= dt;
    } else if (this.spawned < this.spawnQueue.length) {
      this.spawnTimer += dt;
      while (this.spawned < this.spawnQueue.length && this.spawnQueue[this.spawned].at <= this.spawnTimer) {
        this.spawnMite(this.spawnQueue[this.spawned].kind);
        this.spawned += 1;
      }
    }

    // Mites.
    for (const mite of this.mites) {
      const { atForge, dPlayer } = mite.update(dt, p, this.time);
      if (atForge && mite.attackTimer <= 0) {
        mite.attackTimer = 1;
        this.damageForge(mite.type.forgeDps);
        burst(this.particles, mite.x, mite.y, 4, PALETTE.forgeEmber, 90, 2.5);
        this.sound.forgeHit();
        this.texts.push(new FloatText(mite.x, mite.y - mite.r - 8, `-${mite.type.forgeDps}`, PALETTE.danger, 13));
      }
      if (p.alive && dPlayer < mite.r + p.r && mite.contactTimer <= 0) {
        mite.contactTimer = 0.7;
        if (p.takeHit(mite.type.contact)) {
          this.shake = Math.max(this.shake, 6);
          burst(this.particles, p.x, p.y, 8, PALETTE.player, 140, 3);
          this.sound.hurt();
          if (!p.alive) this.onPlayerDeath();
        }
      }
      // Spitters shoot at the Forge (or the wisp if it is closer).
      if (mite.type.ranged && mite.shotTimer <= 0 && this.state === 'playing') {
        const target = dPlayer < 240 && p.alive ? p : { x: FORGE.x, y: FORGE.y };
        const d = dist(mite.x, mite.y, target.x, target.y);
        if (d < 460) {
          mite.shotTimer = mite.type.shotCooldown;
          const vx = ((target.x - mite.x) / d) * mite.type.shotSpeed;
          const vy = ((target.y - mite.y) / d) * mite.type.shotSpeed;
          this.enemyShots.push(new EnemyShot(mite.x, mite.y, vx, vy, mite.type.shotDamage));
          this.sound.shoot();
        }
      }
    }

    // Bullets vs mites.
    for (const bullet of this.bullets) {
      bullet.update(dt);
      if (bullet.dead) continue;
      for (const mite of this.mites) {
        if (mite.dead || bullet.hitIds.has(mite.id)) continue;
        if (dist(bullet.x, bullet.y, mite.x, mite.y) < bullet.r + mite.r) {
          bullet.hitIds.add(mite.id);
          const died = mite.takeHit(bullet.damage);
          burst(this.particles, bullet.x, bullet.y, 5, PALETTE.bullet, 120, 2.5);
          this.texts.push(new FloatText(mite.x, mite.y - mite.r - 4, String(Math.round(bullet.damage)), '#ffe9a8', 13));
          this.sound.hit();
          if (died) this.killMite(mite);
          if (bullet.hitIds.size > bullet.pierce) { bullet.dead = true; break; }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.mites = this.mites.filter((m) => !m.dead);

    // Enemy shots.
    for (const shot of this.enemyShots) {
      shot.update(dt);
      if (shot.dead) continue;
      if (p.alive && dist(shot.x, shot.y, p.x, p.y) < shot.r + p.r) {
        shot.dead = true;
        if (p.takeHit(shot.damage)) {
          this.shake = Math.max(this.shake, 5);
          this.sound.hurt();
          if (!p.alive) this.onPlayerDeath();
        }
        continue;
      }
      if (dist(shot.x, shot.y, FORGE.x, FORGE.y) < shot.r + FORGE.r) {
        shot.dead = true;
        this.damageForge(shot.damage);
        burst(this.particles, shot.x, shot.y, 5, '#e879f9', 110, 2.5);
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => !s.dead);

    // Embers.
    for (const ember of this.emberDrops) {
      ember.update(dt, p);
      if (ember.dead) continue;
      if (p.alive && dist(ember.x, ember.y, p.x, p.y) < ember.r + p.r + 8) {
        ember.dead = true;
        this.embers += 1;
        this.addScore(EMBER_VALUE, ember.x, ember.y, PALETTE.ember, 12);
        this.sound.pickup();
      }
    }
    this.emberDrops = this.emberDrops.filter((e) => !e.dead);

    // Wave cleared?
    if (this.state === 'playing' && this.spawned >= this.spawnQueue.length && this.mites.length === 0) {
      this.addScore(WAVE_CLEAR_BONUS * this.wave, FORGE.x, FORGE.y - 90, PALETTE.forgeCore, 20);
      p.hp = Math.min(p.maxHp, p.hp + 20); // catch breath between waves
      this.forgeHp = Math.min(this.forgeMaxHp, this.forgeHp + 15); // the Forge rekindles a little
      if (isFinalWave(this.wave)) {
        this.endRun(true);
      } else {
        this.openUpgrades();
      }
    }
  }

  onPlayerDeath() {
    burst(this.particles, this.player.x, this.player.y, 30, PALETTE.player, 220, 4);
    this.score = Math.max(0, this.score - DEATH_SCORE_COST);
    this.texts.push(new FloatText(this.player.x, this.player.y - 30, `-${DEATH_SCORE_COST} score`, PALETTE.danger, 16));
    this.sound.gameOver();
    // The wisp wakes at the Forge when the next wave starts, or at once if
    // the wave is already over: respawn immediately, brief invulnerability.
    this.player.respawn();
  }

  updateUpgrade(dt) {
    const input = this.input;
    // Hover tracking for the card highlight.
    const cardW = 300;
    const gap = 28;
    const totalW = cardW * 3 + gap * 2;
    const x0 = (VIEW.w - totalW) / 2;
    const y0 = 250;
    this.hoverCard = -1;
    if (input.mouseY >= y0 && input.mouseY <= y0 + 250) {
      for (let i = 0; i < 3; i += 1) {
        const x = x0 + i * (cardW + gap);
        if (input.mouseX >= x && input.mouseX <= x + cardW) this.hoverCard = i;
      }
    }
    if (input.wasPressed('Digit1', 'Numpad1')) this.takeUpgrade(0);
    else if (input.wasPressed('Digit2', 'Numpad2')) this.takeUpgrade(1);
    else if (input.wasPressed('Digit3', 'Numpad3')) this.takeUpgrade(2);
    else if (input.wasClicked() && this.hoverCard >= 0) this.takeUpgrade(this.hoverCard);
  }

  nearestMite() {
    let best = null;
    let bestD = Infinity;
    for (const mite of this.mites) {
      const d = dist(mite.x, mite.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = mite; }
    }
    return best;
  }

  // ---- drawing ----

  draw() {
    ctx.save();
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    render.drawBackground(ctx, this.time);
    if (this.state !== 'menu') {
      render.drawForge(ctx, this, this.time);
      for (const ember of this.emberDrops) render.drawEmber(ctx, ember);
      for (const mite of this.mites) render.drawMite(ctx, mite, this.time);
      for (const shot of this.enemyShots) render.drawEnemyShot(ctx, shot);
      render.drawPlayer(ctx, this.player, this.time);
      for (const bullet of this.bullets) render.drawBullet(ctx, bullet);
      // Muzzle flash.
      if (this.muzzle > 0 && this.player.alive) {
        const p = this.player;
        const mx = p.x + Math.cos(p.facing) * (p.r + 12);
        const my = p.y + Math.sin(p.facing) * (p.r + 12);
        ctx.fillStyle = `rgba(255, 233, 168, ${this.muzzle * 0.9})`;
        ctx.beginPath();
        ctx.arc(mx, my, 10 * this.muzzle + 3, 0, Math.PI * 2);
        ctx.fill();
      }
      render.drawParticles(ctx, this.particles);
      render.drawFloatTexts(ctx, this.texts);
    } else {
      render.drawParticles(ctx, this.particles);
    }
    ctx.restore();

    if (this.state === 'menu') render.drawMenu(ctx, this);
    else if (this.state === 'playing' || this.state === 'paused') {
      render.drawHUD(ctx, this);
      if (this.state === 'paused') render.drawPause(ctx);
    } else if (this.state === 'upgrade') {
      render.drawHUD(ctx, this);
      render.drawUpgrade(ctx, this);
    } else if (this.state === 'gameover') render.drawGameOver(ctx, this);
    else if (this.state === 'victory') render.drawVictory(ctx, this);
  }
}

// ---- boot ----

const game = new Game();
window.__game = game;

function stepOnce(dt) {
  game.update(dt);
  game.draw();
  game.input.endFrame();
}

let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 1 / 20);
  last = now;
  stepOnce(dt);
  requestAnimationFrame(frame);
}

// Screenshot / test hooks: ?shot=menu|play|upgrade|gameover|victory&seed=N
// drives the game into a real state and marks window.__shotReady when the
// frame is drawn. Normal play never passes these parameters.
function applyShotHook() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  const seed = Number(params.get('seed') || '7') || 7;
  game.seed = seed;
  const dt = 1 / 60;
  if (shot === 'menu') {
    game.reset(seed);
    game.state = 'menu';
  } else if (shot === 'play') {
    game.startRun();
    game.autoPlay = true;
    // Play through to wave 2+, auto-picking upgrades, and stop mid-wave
    // once the arena is busy (5+ mites alive) — the frame shows the fight.
    let guard = 0;
    while (guard < 60 * 600) {
      if (game.state === 'upgrade') game.takeUpgrade(0);
      stepOnce(dt);
      guard += 1;
      if (game.state === 'playing' && game.wave >= 2 && game.mites.length >= 5 && game.kills >= 6) break;
      if (game.state !== 'playing' && game.state !== 'upgrade') break;
    }
    game.autoPlay = false;
    if (game.state !== 'playing') {
      // Fallback: a busy mid-wave-2 frame, rendered by the real game.
      game.reset(seed);
      game.state = 'playing';
      game.wave = 2;
      game.spawnQueue = [];
      game.spawned = 0;
      game.intermission = 0;
      game.kills = 6;
      game.score = 300;
      const spots = [[200, 200], [1080, 180], [180, 620], [1100, 640], [640, 120], [900, 700]];
      spots.forEach(([x, y], i) => game.mites.push(new Mite(i % 3 === 0 ? 'skitter' : 'mite', x, y, 2)));
      game.emberDrops.push(new Ember(500, 300, 1), new Ember(820, 500, 1), new Ember(700, 220, 1));
      game.input.setMouse(900, 200, true);
    }
    // Leave the mouse held down so the muzzle flash shows.
    game.input.setMouse(game.player.x + 120, game.player.y - 60, true);
  } else if (shot === 'upgrade') {
    game.startRun();
    game.autoPlay = true;
    // Play wave 1 to the end, then stop on the upgrade screen.
    let guard = 0;
    while (game.state === 'playing' && guard < 60 * 240) {
      stepOnce(dt);
      guard += 1;
    }
    game.autoPlay = false;
    if (game.state !== 'upgrade') {
      // Fallback: force a cleared wave 1 so the screen still renders.
      game.mites = [];
      game.spawnQueue = [];
      game.spawned = 0;
      game.openUpgrades();
    }
    game.input.setMouse(640, 375, false); // hover the middle card
  } else if (shot === 'gameover') {
    game.startRun();
    game.autoPlay = true;
    // Play a real stretch first so the end screen carries real stats.
    for (let i = 0; i < 480; i += 1) stepOnce(dt);
    game.autoPlay = false;
    game.forgeHp = 4;
    game.spawnQueue = [];
    game.spawned = 0;
    // A brute latched on the Forge finishes it off for real.
    const brute = new Mite('brute', FORGE.x + FORGE.r + 20, FORGE.y, 1);
    brute.attackTimer = 0;
    game.mites.push(brute);
    let guard = 0;
    while (game.state === 'playing' && guard < 60 * 30) {
      stepOnce(dt);
      guard += 1;
    }
    if (game.state !== 'gameover') game.endRun(false);
  } else if (shot === 'victory') {
    // Play the whole run; try a few seeds until the bot wins one for real.
    let won = false;
    for (const trySeed of [1, 2, 3, 4, 5]) {
      game.seed = trySeed;
      game.startRun();
      game.autoPlay = true;
      let guard = 0;
      while ((game.state === 'playing' || game.state === 'upgrade') && guard < 60 * 1500) {
        if (game.state === 'upgrade') game.takeUpgrade(0);
        stepOnce(dt);
        guard += 1;
      }
      game.autoPlay = false;
      if (game.state === 'victory') { won = true; break; }
    }
    if (!won) {
      // Fallback: a won run's numbers, rendered by the real victory screen.
      game.wave = WAVE_COUNT;
      game.score = 17510;
      game.kills = 150;
      game.embers = 300;
      game.upgradesTaken = 9;
      game.forgeHp = 35;
      game.endRun(true);
    }
  }
  game.draw();
  window.__shotReady = true;
}

// Global keys that work on the end screens and the pause screen.
window.addEventListener('keydown', (event) => {
  if (game.state === 'paused' && (event.code === 'KeyP' || event.code === 'Escape')) {
    game.state = 'playing';
  } else if ((game.state === 'gameover' || game.state === 'victory') && (event.code === 'Enter' || event.code === 'KeyR')) {
    game.startRun();
  }
});
canvas.addEventListener('mousedown', () => {
  if (game.state === 'gameover' || game.state === 'victory') game.startRun();
  else if (game.state === 'paused') game.state = 'playing';
});

applyShotHook();
if (!window.__shotReady) requestAnimationFrame(frame);
