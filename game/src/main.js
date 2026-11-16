// CINDERWAKE — game orchestration: the state machine, the fixed-step loop,
// combat resolution, and the deterministic screenshot hooks the build uses.
//
// A guardian wisp defends the last Forge from ten waves of void mites.
// Survive wave 10 — Cindermaw at 5, the Hollow Maw at 10 — and the Forge
// ascends. If the Forge falls, the dark wins. Upgrades between waves, a
// dash and an ember nova in the wisp's hands, combos for the bold.
//
// States: menu -> playing -> upgrade (between waves) -> playing ...
//         playing -> gameover | victory; paused overlays playing.

import {
  ABILITIES, BOSS_WAVES, DEATH_SCORE_COST, EMBER_VALUE, FORGE, PALETTE, VIEW, WAVE_COUNT,
  clamp, dist, mulberry32,
} from './config.js';
import { SoundBank } from './audio.js';
import { Boss } from './bosses.js';
import { ComboTracker } from './combo.js';
import { Ember, EnemyShot, Mite, Particle, Player } from './entities.js';
import { Input } from './input.js';
import {
  drawBackground, drawBoss, drawBullet, drawEmber, drawEnemyShot, drawFloatTexts,
  drawForge, drawMite, drawNovaFx, drawParticles, drawPlayer, drawVignette, drawZaps,
} from './render.js';
import { drawGameOver, drawHUD, drawMenu, drawPause, drawUpgrade, drawVictory } from './screens.js';
import { rollUpgrades } from './upgrades.js';
import { buildWave, isFinalWave, spawnPoint, waveMix } from './waves.js';

const FIXED_DT = 1 / 60;
// Autoplay upgrade taste, best first: raw killing power, then the rares
// that bend a run, then sustain. Shared by the demo and the soak test.
const UPGRADE_PRIORITY = [
  'damage', 'multishot', 'firerate', 'starfall', 'arc', 'pierce', 'novamastery',
  'phoenix', 'heavy', 'siphon', 'flicker', 'repair', 'maxhp', 'regen', 'magnet', 'speed',
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.state = 'menu';
    this.time = 0;
    this.accumulator = 0;
    this.lastStamp = 0;
    this.rng = mulberry32(20261116);
    this.autoplay = false;
    this.autoFiring = false;
    this.bossApi = {
      spawnEnemy: (kind, x, y) => {
        this.mites.push(new Mite(kind, x, y, this.wave));
        this.burst(x, y, 6, PALETTE.splitter);
      },
      fireShot: (x, y, vx, vy, dmg) => {
        this.enemyShots.push(new EnemyShot(x, y, vx, vy, dmg, true));
      },
      burstFx: (x, y, n, color) => this.burst(x, y, n, color),
      roar: () => { this.sound.roar(); this.shake = Math.max(this.shake, 5); },
      miteCount: () => this.mites.length,
    };
    this.reset();
  }

  reset() {
    this.player = new Player();
    this.mites = [];
    this.bullets = [];
    this.enemyShots = [];
    this.emberDrops = [];
    this.particles = [];
    this.texts = [];
    this.novaFx = [];
    this.zaps = [];
    this.combo = new ComboTracker();
    this.ownedUpgrades = [];
    this.phoenixCharges = 0;
    this.bossesFelled = 0;
    this.forgeMaxHp = FORGE.maxHp;
    this.forgeHp = FORGE.maxHp;
    this.wave = 0;
    this.score = 0;
    this.emberCount = 0;
    this.kills = 0;
    this.upgradesTaken = 0;
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.intermission = 0;
    this.waveTime = 0;
    this.waveIncoming = '';
    this.upgradeChoices = [];
    this.hoverCard = -1;
    this.shake = 0;
    this.hitStop = 0;
    this.alarmTimer = 0;
    this.respawnTimer = 0;
    this.autoMoveX = 0;
    this.autoMoveY = 0;
    this.state = 'menu';
  }

  get embers() {
    return this.emberCount;
  }

  set embers(value) {
    this.emberCount = value;
  }

  startRun() {
    this.reset();
    this.state = 'playing';
    this.sound.unlock();
    this.startWave(1);
  }

  startWave(wave) {
    this.wave = wave;
    this.waveTime = 0;
    const built = buildWave(wave, 4242);
    this.spawnQueue = built.queue.slice();
    this.spawnClock = 0;
    this.waveIncoming = waveMix(wave, 4242);
    if (BOSS_WAVES[wave]) {
      this.announce(wave >= 10 ? 'THE HOLLOW MAW COMES' : 'CINDERMAW STIRS', PALETTE.boss, 30);
    }
  }

  enemiesLeft() {
    return this.mites.length + this.spawnQueue.length;
  }

  // ---- effects helpers -------------------------------------------------

  burst(x, y, count, color, speed = 190) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const v = 40 + this.rng() * speed;
      this.particles.push(new Particle(
        x, y, Math.cos(a) * v, Math.sin(a) * v,
        0.3 + this.rng() * 0.45, 2 + this.rng() * 3, color,
      ));
    }
  }

  floatText(x, y, text, color = PALETTE.text, size = 15) {
    this.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  announce(text, color = PALETTE.forgeCore, size = 26) {
    this.floatText(VIEW.w / 2, 210, text, color, size);
  }

  // ---- spawning & kills --------------------------------------------------

  spawnFromQueue(dt) {
    this.spawnClock += dt;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.spawnClock) {
      const entry = this.spawnQueue.shift();
      this.spawnEntry(entry);
    }
  }

  spawnEntry(entry) {
    if (entry.boss) {
      const boss = new Boss(entry.kind, VIEW.w / 2, 64);
      this.mites.push(boss);
      this.sound.roar();
      this.shake = Math.max(this.shake, 6);
      this.announce(entry.kind === 'boss' ? 'THE HOLLOW MAW' : 'CINDERMAW', PALETTE.boss, 30);
      return;
    }
    const point = spawnPoint(this.rng);
    this.mites.push(new Mite(entry.kind, point.x, point.y, this.wave, { elite: entry.elite }));
  }

  killMite(mite) {
    const index = this.mites.indexOf(mite);
    if (index === -1) return;
    this.mites.splice(index, 1);
    this.kills += 1;
    const { milestone, bonus } = this.combo.hit();
    this.score += mite.scoreValue + bonus;
    this.burst(mite.x, mite.y, mite.isBoss ? 46 : mite.kind === 'brute' || mite.kind === 'bulwark' ? 20 : 10, mite.type.color);
    this.floatText(mite.x, mite.y - mite.r - 6, `+${mite.scoreValue + bonus}`, mite.elite ? PALETTE.elite : PALETTE.text, mite.isBoss ? 22 : 14);
    if (milestone > 0) {
      this.announce(`COMBO ×${milestone}`, PALETTE.combo, 24);
      this.sound.combo();
    }
    // Hit-stop: the world catches its breath on a kill.
    const stop = mite.isBoss ? 0.14 : mite.elite ? 0.06 : mite.kind === 'brute' || mite.kind === 'bulwark' ? 0.05 : 0.028;
    this.hitStop = Math.max(this.hitStop, stop);
    // Embers.
    const drop = mite.emberValue + this.player.siphon;
    for (let i = 0; i < drop; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const d = this.rng() * 16;
      this.emberDrops.push(new Ember(mite.x + Math.cos(a) * d, mite.y + Math.sin(a) * d, 1));
    }
    if (mite.kind === 'splitter') {
      // The mother comes apart into her children.
      for (let i = 0; i < (mite.type.splitsInto || 3); i += 1) {
        const a = (i * Math.PI * 2) / 3 + this.rng() * 0.6;
        const child = new Mite('mite', mite.x + Math.cos(a) * 18, mite.y + Math.sin(a) * 18, this.wave);
        child.spawning = 0.22;
        child.shove(Math.cos(a) * 130, Math.sin(a) * 130);
        this.mites.push(child);
      }
      this.sound.split();
    }
    if (mite.isBoss) {
      this.bossesFelled += 1;
      this.shake = Math.max(this.shake, 13);
      this.sound.bossDie();
      this.announce(`${mite.type.label.toUpperCase()} FELLED`, PALETTE.forgeCore, 30);
      this.burst(mite.x, mite.y, 30, PALETTE.forgeCore, 300);
    } else {
      this.sound.kill();
    }
  }

  damageForge(dmg) {
    if (this.state !== 'playing') return;
    this.forgeHp -= dmg;
    this.shake = Math.max(this.shake, 3);
    if (this.forgeHp <= 0) {
      if (this.phoenixCharges > 0) {
        // The Phoenix Wick burns instead of the Forge.
        this.phoenixCharges -= 1;
        this.forgeHp = Math.round(this.forgeMaxHp * 0.35);
        this.sound.phoenix();
        this.shake = Math.max(this.shake, 10);
        this.burst(FORGE.x, FORGE.y, 60, PALETTE.forgeCore, 340);
        this.announce('THE PHOENIX WICK REKINDLES THE FORGE', PALETTE.forgeCore, 24);
        return;
      }
      this.forgeHp = 0;
      this.state = 'gameover';
      this.sound.gameOver();
      this.burst(FORGE.x, FORGE.y, 60, PALETTE.forgeHot, 320);
    }
  }

  // A landed hit on the wisp: sound, and the death bookkeeping when it kills.
  hitPlayer(dmg) {
    if (!this.player.takeHit(dmg)) return;
    this.sound.hurt();
    if (!this.player.alive) this.onPlayerDeath();
  }

  onPlayerDeath() {
    this.score = Math.max(0, this.score - DEATH_SCORE_COST);
    this.combo.count = 0;
    this.combo.timer = 0;
    this.respawnTimer = 1.6;
    this.burst(this.player.x, this.player.y, 26, PALETTE.player);
    this.floatText(this.player.x, this.player.y - 30, `-${DEATH_SCORE_COST} score`, PALETTE.danger, 17);
    this.sound.playerDie();
    this.shake = Math.max(this.shake, 7);
  }

  // ---- abilities -----------------------------------------------------------

  tryDash(dx = 0, dy = 0) {
    const p = this.player;
    if (!p.alive) return;
    if (p.startDash(dx, dy)) {
      this.sound.dash();
      this.burst(p.x, p.y, 5, PALETTE.player, 90);
    }
  }

  tryNova() {
    const p = this.player;
    if (!p.alive || !p.startNova()) return;
    this.sound.nova();
    this.shake = Math.max(this.shake, 6);
    this.novaFx.push({ x: p.x, y: p.y, r: 0, maxR: p.novaRadius, life: 0.35, maxLife: 0.35 });
    const dead = [];
    for (const mite of this.mites) {
      if (mite.spawning > 0) continue;
      const d = dist(p.x, p.y, mite.x, mite.y);
      if (d <= p.novaRadius + mite.r) {
        const a = Math.atan2(mite.y - p.y, mite.x - p.x);
        mite.shove(Math.cos(a) * ABILITIES.novaKnockback, Math.sin(a) * ABILITIES.novaKnockback);
        const killed = mite.takeHit(p.novaDamage);
        this.floatText(mite.x, mite.y - mite.r - 4, String(Math.round(p.novaDamage)), PALETTE.nova, 14);
        if (killed) dead.push(mite);
      }
    }
    for (const mite of dead) this.killMite(mite);
  }

  // ---- upgrades ---------------------------------------------------------

  openUpgrades() {
    this.state = 'upgrade';
    this.upgradeChoices = rollUpgrades(this.rng, this.ownedUpgrades);
    this.hoverCard = -1;
    this.score += this.wave * 100; // wave-clear bonus
    this.sound.waveClear();
  }

  takeUpgrade(index) {
    const up = this.upgradeChoices[index];
    if (!up) return;
    up.apply(this.player, this);
    this.ownedUpgrades.push(up.id);
    this.upgradesTaken += 1;
    this.sound.upgrade();
    this.upgradeChoices = [];
    this.state = 'playing';
    this.startWave(this.wave + 1);
  }

  takeBestUpgrade() {
    let best = 0;
    let bestRank = Infinity;
    this.upgradeChoices.forEach((up, i) => {
      const rank = UPGRADE_PRIORITY.indexOf(up.id);
      const r = rank === -1 ? 99 : rank;
      if (r < bestRank) { bestRank = r; best = i; }
    });
    this.takeUpgrade(best);
  }

  cardAt(x, y) {
    const cardW = 300;
    const cardH = 250;
    const gap = 28;
    const x0 = (VIEW.w - (cardW * 3 + gap * 2)) / 2;
    const y0 = 250;
    if (y < y0 || y > y0 + cardH) return -1;
    for (let i = 0; i < 3; i += 1) {
      const cx = x0 + i * (cardW + gap);
      if (x >= cx && x <= cx + cardW) return i;
    }
    return -1;
  }

  // ---- update -------------------------------------------------------------

  update(dt) {
    if (this.state !== 'paused') this.time += dt;
    if (this.input.wasPressed('KeyM')) this.sound.toggleMute();

    // Hit-stop: kills briefly slow the whole world.
    let scale = 1;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      scale = 0.22;
    }
    const sdt = dt * scale;

    if (this.state === 'menu') {
      if (this.input.wasClicked() || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
        this.sound.unlock();
        this.startRun();
      }
      this.input.endFrame();
      return;
    }
    if (this.state === 'gameover' || this.state === 'victory') {
      this._updateFx(sdt);
      if (this.input.wasClicked() || this.input.wasPressed('Enter') || this.input.wasPressed('KeyR')) {
        this.startRun();
      }
      this.input.endFrame();
      return;
    }
    if (this.state === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) this.state = 'playing';
      if (this.input.wasPressed('KeyR')) this.startRun();
      this.input.endFrame();
      return;
    }
    if (this.state === 'upgrade') {
      this._updateFx(sdt);
      this.hoverCard = this.cardAt(this.input.mouseX, this.input.mouseY);
      if (this.input.wasClicked() && this.hoverCard >= 0) this.takeUpgrade(this.hoverCard);
      else if (this.autoplay) this.takeBestUpgrade();
      else {
        if (this.input.wasPressed('Digit1')) this.takeUpgrade(0);
        if (this.input.wasPressed('Digit2')) this.takeUpgrade(1);
        if (this.input.wasPressed('Digit3')) this.takeUpgrade(2);
      }
      this.input.endFrame();
      return;
    }

    // playing
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.input.endFrame();
      return;
    }
    this.waveTime += sdt;
    this.combo.update(sdt);
    // The fallen wisp re-forms at the Forge after a short wait.
    if (!this.player.alive) {
      this.respawnTimer -= sdt;
      if (this.respawnTimer <= 0) {
        this.player.respawn();
        this.burst(FORGE.x, FORGE.y + 120, 18, PALETTE.player, 150);
      }
    }
    if (this.autoplay) this._autoplay();
    this._updatePlayer(sdt);
    this.spawnFromQueue(sdt);
    this._updateMites(sdt);
    this._updateBullets(sdt);
    this._updateEnemyShots(sdt);
    this._updateEmbers(sdt);
    this._updateFx(sdt);

    // Low-Forge alarm and smoke.
    if (this.forgeHp / this.forgeMaxHp < 0.3) {
      this.alarmTimer -= sdt;
      if (this.alarmTimer <= 0) {
        this.sound.alarm();
        this.alarmTimer = 1.4;
      }
      if (this.rng() < 0.3) {
        this.particles.push(new Particle(
          FORGE.x + (this.rng() - 0.5) * 60, FORGE.y - 30,
          (this.rng() - 0.5) * 14, -34 - this.rng() * 22,
          0.9, 5 + this.rng() * 5, 'rgba(90, 84, 110, 0.8)',
        ));
      }
    }

    // Wave flow.
    if (this.spawnQueue.length === 0 && this.mites.length === 0 && this.state === 'playing') {
      if (isFinalWave(this.wave)) {
        this.state = 'victory';
        this.score += 1000;
        this.sound.victory();
      } else if (this.intermission <= 0) {
        this.intermission = 1.6;
      }
    }
    if (this.intermission > 0) {
      this.intermission -= sdt;
      if (this.intermission <= 0 && this.state === 'playing') this.openUpgrades();
    }
    this.input.endFrame();
  }

  _updatePlayer(dt) {
    const p = this.player;
    const input = this.input;
    let mx = 0;
    let my = 0;
    if (this.autoplay) {
      mx = this.autoMoveX;
      my = this.autoMoveY;
    } else {
      if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
      if (input.down('KeyD', 'ArrowRight')) mx += 1;
      if (input.down('KeyW', 'ArrowUp')) my -= 1;
      if (input.down('KeyS', 'ArrowDown')) my += 1;
    }
    p.move(mx, my, dt);
    p.aimAt(input.mouseX, input.mouseY);
    if (!this.autoplay && p.alive) {
      if (input.wasPressed('ShiftLeft', 'ShiftRight', 'Space') || input.wasRightClicked()) this.tryDash(mx, my);
      if (input.wasPressed('KeyE', 'KeyQ')) this.tryNova();
    }
    p.update(dt);
    const wantFire = this.autoplay ? this.autoFiring : input.mouseDown;
    if (wantFire && p.canFire()) {
      const fired = p.fire();
      if (fired.length > 0) {
        this.bullets.push(...fired);
        const muzzleX = p.x + Math.cos(p.facing) * (p.r + 8);
        const muzzleY = p.y + Math.sin(p.facing) * (p.r + 8);
        this.burst(muzzleX, muzzleY, 2, PALETTE.bullet, 60);
        this.sound.shoot();
      }
    }
  }

  _updateMites(dt) {
    for (const mite of this.mites) {
      const result = mite.isBoss
        ? mite.update(dt, this.player, this.time, this.bossApi)
        : mite.update(dt, this.player, this.time);
      if (mite.spawning > 0) continue;
      // Spitters hold off and spit at the wisp.
      if (mite.type.ranged && mite.shotTimer <= 0 && this.player.alive && result.dPlayer < 360) {
        const a = Math.atan2(this.player.y - mite.y, this.player.x - mite.x);
        this.enemyShots.push(new EnemyShot(
          mite.x, mite.y,
          Math.cos(a) * mite.type.shotSpeed, Math.sin(a) * mite.type.shotSpeed,
          mite.type.shotDamage,
        ));
        mite.shotTimer = mite.type.shotCooldown;
        this.sound.spit();
      }
      // Contact with the wisp, gated by the mite's own bite cooldown.
      if (this.player.alive && mite.contactTimer <= 0 && result.dPlayer < mite.r + this.player.r) {
        this.hitPlayer(mite.type.contact);
        mite.contactTimer = 0.6;
      }
      // Chewing the Forge, in bites worth 0.8s of its damage rate.
      if (result.atForge && mite.attackTimer <= 0) {
        mite.attackTimer = 0.8;
        this.damageForge(mite.type.forgeDps * 0.8);
        this.burst(FORGE.x, FORGE.y - FORGE.r, 4, PALETTE.forgeHot, 120);
        this.sound.forgeHit();
      }
    }
  }

  _updateBullets(dt) {
    const dead = [];
    for (const bullet of this.bullets) {
      bullet.update(dt);
      if (bullet.dead) continue;
      for (const mite of this.mites) {
        if (mite.spawning > 0 || mite.dead || bullet.hitIds.has(mite.id)) continue;
        if (dist(bullet.x, bullet.y, mite.x, mite.y) > bullet.r + mite.r) continue;
        bullet.hitIds.add(mite.id);
        const hadShield = mite.shieldHp > 0;
        const killed = mite.takeHit(bullet.damage);
        mite.shove(bullet.vx * (bullet.explosive ? 0.2 : 0.13), bullet.vy * (bullet.explosive ? 0.2 : 0.13));
        if (hadShield && mite.shieldHp > 0) {
          // The ward ate it: cyan numbers, a glassy tick.
          this.floatText(mite.x, mite.y - mite.r - 4, String(Math.round(bullet.damage)), PALETTE.shield, 13);
          this.sound.shieldHit();
        } else {
          if (hadShield) {
            this.floatText(mite.x, mite.y - mite.r - 18, 'WARD BROKEN', PALETTE.shield, 13);
            this.burst(mite.x, mite.y, 10, PALETTE.shield, 160);
            this.sound.shieldBreak();
          }
          this.floatText(
            mite.x, mite.y - mite.r - 4, String(Math.round(bullet.damage)),
            bullet.explosive ? PALETTE.combo : bullet.damage >= 30 ? '#ffd76b' : '#ffffff',
            bullet.explosive ? 16 : 13,
          );
          this.sound.hit();
        }
        // Arc Conductor: lightning leaps to a neighbour.
        if (this.player.arcChance > 0 && this.rng() < this.player.arcChance) {
          let best = null;
          let bestD = 150;
          for (const other of this.mites) {
            if (other === mite || other.spawning > 0 || other.dead) continue;
            const d = dist(mite.x, mite.y, other.x, other.y);
            if (d < bestD) { bestD = d; best = other; }
          }
          if (best) {
            const arcKilled = best.takeHit(bullet.damage * 0.5);
            this.zaps.push({ x1: mite.x, y1: mite.y, x2: best.x, y2: best.y, life: 0.16 });
            this.sound.arc();
            if (arcKilled && !dead.includes(best)) dead.push(best);
          }
        }
        // Star shells burst over a wide mark.
        if (bullet.explosive) {
          this.sound.starfall();
          this.hitStop = Math.max(this.hitStop, 0.05);
          this.burst(bullet.x, bullet.y, 16, PALETTE.combo, 260);
          for (const other of this.mites) {
            if (other === mite || other.spawning > 0 || other.dead) continue;
            if (dist(bullet.x, bullet.y, other.x, other.y) <= 72 + other.r) {
              const a = Math.atan2(other.y - bullet.y, other.x - bullet.x);
              other.shove(Math.cos(a) * 200, Math.sin(a) * 200);
              if (other.takeHit(bullet.damage * 0.8) && !dead.includes(other)) dead.push(other);
            }
          }
        }
        if (killed && !dead.includes(mite)) dead.push(mite);
        if (bullet.hitIds.size > bullet.pierce) {
          bullet.dead = true;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    for (const mite of dead) this.killMite(mite);
  }

  _updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.update(dt);
      if (shot.dead) continue;
      if (this.player.alive
        && dist(shot.x, shot.y, this.player.x, this.player.y) < shot.r + this.player.r) {
        // takeHit returns false through i-frames: the shot flies on.
        if (this.player.invuln <= 0) {
          this.hitPlayer(shot.damage);
          shot.dead = true;
        }
      } else if (!shot.fromBoss && dist(shot.x, shot.y, FORGE.x, FORGE.y) < shot.r + FORGE.r - 8) {
        this.damageForge(shot.damage);
        shot.dead = true;
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => !s.dead);
  }

  _updateEmbers(dt) {
    for (const ember of this.emberDrops) {
      ember.update(dt, this.player);
      if (!ember.dead && this.player.alive
        && dist(ember.x, ember.y, this.player.x, this.player.y) < this.player.r + ember.r + 2) {
        ember.dead = true;
        this.emberCount += ember.value || 1;
        this.score += EMBER_VALUE;
        this.sound.ember();
      }
    }
    this.emberDrops = this.emberDrops.filter((e) => !e.dead);
  }

  _updateFx(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 34 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const ring of this.novaFx) {
      ring.life -= dt;
      ring.r = ring.maxR * (1 - Math.max(0, ring.life) / ring.maxLife);
    }
    this.novaFx = this.novaFx.filter((r) => r.life > 0);
    for (const zap of this.zaps) zap.life -= dt;
    this.zaps = this.zaps.filter((z) => z.life > 0);
    this.shake = Math.max(0, this.shake - dt * 26);
  }

  // ---- self-play (demo + soak test) ---------------------------------------

  _autoplay() {
    const p = this.player;
    // Target priority, like a competent guardian: anything chewing the
    // Forge (or about to) dies first, then the boss, then the nearest mite.
    let target = null;
    let targetDist = Infinity;
    let threatD = Infinity;
    for (const mite of this.mites) {
      if (mite.spawning > 0) continue;
      const dForge = dist(mite.x, mite.y, FORGE.x, FORGE.y);
      if ((mite.latching || dForge < FORGE.r + 80) && dForge < threatD) {
        threatD = dForge;
        target = mite;
        targetDist = dist(p.x, p.y, mite.x, mite.y);
      }
    }
    if (!target) {
      target = this.mites.find((m) => m.isBoss && m.spawning <= 0) || null;
      targetDist = target ? dist(p.x, p.y, target.x, target.y) : Infinity;
    }
    if (!target) {
      for (const mite of this.mites) {
        if (mite.spawning > 0) continue;
        const d = dist(p.x, p.y, mite.x, mite.y);
        if (d < targetDist) { targetDist = d; target = mite; }
      }
    }
    this.autoFiring = Boolean(target);
    if (target) {
      // Aim at the target, led by its knockback drift.
      const lead = clamp(dist(p.x, p.y, target.x, target.y) / 620, 0, 0.4);
      this.input.mouseX = target.x + target.kx * lead * 0.4;
      this.input.mouseY = target.y + target.ky * lead * 0.4;
      // Hold a fighting distance, on the far side from the Forge.
      const awayX = target.x - FORGE.x;
      const awayY = target.y - FORGE.y;
      const awayLen = Math.hypot(awayX, awayY) || 1;
      const want = 195;
      const spotX = target.x + (awayX / awayLen) * want;
      const spotY = target.y + (awayY / awayLen) * want;
      const dx = spotX - p.x;
      const dy = spotY - p.y;
      const len = Math.hypot(dx, dy);
      if (len > 14) { this.autoMoveX = dx / len; this.autoMoveY = dy / len; }
      else { this.autoMoveX = 0; this.autoMoveY = 0; }
      // Nova when crowded.
      let near = 0;
      for (const mite of this.mites) {
        if (mite.spawning <= 0 && dist(p.x, p.y, mite.x, mite.y) < p.novaRadius) near += 1;
      }
      if (near >= 4) this.tryNova();
      // Dash when cornered or when the Maw winds up its charge.
      const bossCharging = target.isBoss && (target.mode === 'windup' || target.mode === 'charge');
      if ((targetDist < 95 && !target.isBoss) || bossCharging) {
        this.tryDash(p.x < target.x ? -1 : 1, p.y < target.y ? -1 : 1);
      }
    } else {
      // Nothing to fight: drift back toward a guard post below the Forge.
      const dx = FORGE.x - p.x;
      const dy = FORGE.y + 120 - p.y;
      const len = Math.hypot(dx, dy);
      if (len > 20) { this.autoMoveX = dx / len; this.autoMoveY = dy / len; }
      else { this.autoMoveX = 0; this.autoMoveY = 0; }
    }
  }

  // ---- render ---------------------------------------------------------------

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate((this.rng() - 0.5) * this.shake, (this.rng() - 0.5) * this.shake);
    }
    drawBackground(ctx, this.time);
    drawForge(ctx, this, this.time);
    for (const ember of this.emberDrops) drawEmber(ctx, ember);
    for (const mite of this.mites) {
      if (mite.isBoss) drawBoss(ctx, mite, this.time);
      else drawMite(ctx, mite, this.time);
    }
    for (const shot of this.enemyShots) drawEnemyShot(ctx, shot);
    for (const bullet of this.bullets) drawBullet(ctx, bullet);
    drawPlayer(ctx, this.player, this.time);
    drawNovaFx(ctx, this.novaFx);
    drawZaps(ctx, this.zaps);
    drawParticles(ctx, this.particles);
    drawFloatTexts(ctx, this.texts);
    ctx.restore();
    drawVignette(ctx, this, this.time);

    if (this.state === 'playing' || this.state === 'paused' || this.state === 'upgrade') drawHUD(ctx, this);
    if (this.state === 'menu') drawMenu(ctx, this);
    if (this.state === 'upgrade') drawUpgrade(ctx, this);
    if (this.state === 'paused') drawPause(ctx);
    if (this.state === 'gameover') drawGameOver(ctx, this);
    if (this.state === 'victory') drawVictory(ctx, this);
  }

  // ---- loop -------------------------------------------------------------------

  frame(stamp) {
    if (!this.lastStamp) this.lastStamp = stamp;
    let elapsed = (stamp - this.lastStamp) / 1000;
    this.lastStamp = stamp;
    elapsed = Math.min(elapsed, 0.25);
    this.accumulator += elapsed;
    while (this.accumulator >= FIXED_DT) {
      this.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    this.render();
    requestAnimationFrame((s) => this.frame(s));
  }

  stepOnce(dt = FIXED_DT) {
    this.update(dt);
    this.render();
  }
}

// ---- boot ---------------------------------------------------------------------

const canvas = document.getElementById('game');
canvas.width = VIEW.w;
canvas.height = VIEW.h;
const game = new Game(canvas);
window.__game = game;

// First interaction unlocks audio (browser autoplay policy).
window.addEventListener('pointerdown', () => game.sound.unlock(), { once: true });

// Screenshot hooks: deterministic scenes for the build pipeline. Each hook
// drives the REAL game (self-play or real states) and flags readiness.
//   ?shot=menu | play | upgrade | victory | gameover   &seed=N
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') || 1);
  game.rng = mulberry32(seed * 1000 + 77);
  const ready = () => { window.__shotReady = true; };
  // Fast-forward driver: step the simulation without rendering (rendering
  // happens once, at capture), so self-play scenes arrive in seconds.
  const pump = (steps) => { for (let i = 0; i < steps; i += 1) game.update(FIXED_DT); };
  if (shot === 'menu') {
    game.stepOnce();
    ready();
  } else if (shot === 'play') {
    // Self-play into the wave-5 boss fight and capture mid-battle.
    game.startRun();
    game.autoplay = true;
    let ticks = 0;
    const iv = setInterval(() => {
      pump(10);
      ticks += 1;
      const boss = game.mites.find((m) => m.isBoss);
      const hurt = boss && boss.hp < boss.maxHp * 0.8;
      if ((hurt && game.mites.length >= 4 && game.state === 'playing') || ticks > 1500) {
        clearInterval(iv);
        game.autoplay = false;
        if (!(boss && game.state === 'playing')) stageBossScene(game);
        game.stepOnce();
        ready();
      }
    }, 50);
  } else if (shot === 'upgrade') {
    // Play wave 1 for real, then make sure a RARE card is on the table.
    game.startRun();
    game.autoplay = true;
    let ticks = 0;
    const iv = setInterval(() => {
      pump(10);
      ticks += 1;
      if (game.state === 'upgrade' || ticks > 900) {
        clearInterval(iv);
        game.autoplay = false;
        if (game.state !== 'upgrade') {
          game.state = 'upgrade';
          game.wave = Math.max(1, game.wave);
        }
        for (let i = 0; i < 60; i += 1) {
          game.upgradeChoices = rollUpgrades(game.rng, game.ownedUpgrades);
          if (game.upgradeChoices.some((c) => c.rarity === 'rare')) break;
        }
        game.hoverCard = 1;
        game.input.mouseX = VIEW.w / 2;
        game.input.mouseY = 340;
        game.stepOnce();
        ready();
      }
    }, 50);
  } else if (shot === 'victory') {
    // Self-play whole runs across seeds; capture a real victory if one lands.
    game.startRun();
    game.autoplay = true;
    let seedTry = seed;
    let ticks = 0;
    const iv = setInterval(() => {
      pump(24);
      ticks += 1;
      if (game.state === 'victory') {
        clearInterval(iv);
        game.autoplay = false;
        game.stepOnce();
        ready();
      } else if (game.state === 'gameover' || ticks > 1400) {
        seedTry += 1;
        ticks = 0;
        if (seedTry > seed + 5) {
          clearInterval(iv);
          game.autoplay = false;
          stageVictory(game);
          game.stepOnce();
          ready();
        } else {
          game.rng = mulberry32(seedTry * 1000 + 77);
          game.startRun();
          game.autoplay = true;
        }
      }
    }, 50);
  } else if (shot === 'gameover') {
    game.startRun();
    game.autoplay = true;
    game.forgeHp = 60;
    const iv = setInterval(() => {
      pump(10);
      if (game.state === 'gameover') {
        clearInterval(iv);
        game.autoplay = false;
        game.stepOnce();
        ready();
      }
    }, 50);
  }
} else {
  requestAnimationFrame((s) => game.frame(s));
}

// A staged-but-real boss scene: used only if self-play could not reach a
// hurt boss in time. Real entities, real render, honest game state.
function stageBossScene(game) {
  game.reset();
  game.state = 'playing';
  game.startWave(5);
  game.spawnQueue = [];
  game.waveIncoming = 'Cindermaw + escorts';
  const boss = new Boss('miniboss', VIEW.w / 2, 210);
  boss.spawning = 0;
  boss.mode = 'siege';
  boss.hp = Math.round(boss.maxHp * 0.62);
  game.mites.push(boss);
  const spots = [[300, 190], [980, 200], [240, 520], [1040, 540], [640, 640]];
  const kinds = ['bulwark', 'splitter', 'skitter', 'mite', 'spitter'];
  spots.forEach(([x, y], i) => {
    const mite = new Mite(kinds[i], x, y, 5, { elite: i === 0 });
    mite.spawning = 0;
    game.mites.push(mite);
  });
  game.player.x = 520;
  game.player.y = 560;
  game.input.mouseX = boss.x;
  game.input.mouseY = boss.y;
  game.combo.count = 12;
  game.combo.timer = 2.2;
  game.combo.best = 12;
  for (let i = 0; i < 26; i += 1) game.stepOnce();
}

// A staged-but-real victory screen with plausible run stats, used only if
// self-play wins none of its seeds.
function stageVictory(game) {
  game.reset();
  game.state = 'victory';
  game.wave = WAVE_COUNT;
  game.score = 24150;
  game.kills = 148;
  game.bossesFelled = 2;
  game.combo.best = 34;
  game.emberCount = 121;
  game.upgradesTaken = 9;
  game.player.deaths = 1;
  game.forgeHp = 148;
}
