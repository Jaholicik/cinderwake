// All drawing for CINDERWAKE: the arena, the Forge, the wisp, the mites,
// the HUD, and every screen. Nothing here changes game state.

import { FORGE, PALETTE, VIEW, WAVE_COUNT } from './config.js';

function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBackground(ctx, time) {
  const g = ctx.createRadialGradient(FORGE.x, FORGE.y, 60, FORGE.x, FORGE.y, 720);
  g.addColorStop(0, PALETTE.bgGlow);
  g.addColorStop(0.45, PALETTE.bgMid);
  g.addColorStop(1, PALETTE.bgDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // Faint grid so motion reads.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.w; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.h); }
  for (let y = 0; y <= VIEW.h; y += 64) { ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); }
  ctx.stroke();

  // Slow drifting cinders in the background.
  ctx.fillStyle = 'rgba(255, 150, 60, 0.16)';
  for (let i = 0; i < 26; i += 1) {
    const sx = (i * 173.3 + time * (6 + (i % 5) * 3)) % VIEW.w;
    const sy = (i * 97.7 + time * 4) % VIEW.h;
    ctx.beginPath();
    ctx.arc(sx, VIEW.h - sy, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arena ring around the Forge.
  ctx.strokeStyle = 'rgba(255, 150, 60, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, 250, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawForge(ctx, game, time) {
  const hpFrac = game.forgeHp / game.forgeMaxHp;
  const pulse = 1 + Math.sin(time * 3.2) * 0.04;
  const low = hpFrac < 0.3;

  // Heat glow.
  const glow = ctx.createRadialGradient(FORGE.x, FORGE.y, 10, FORGE.x, FORGE.y, 130);
  glow.addColorStop(0, low ? 'rgba(255, 60, 40, 0.5)' : 'rgba(255, 140, 40, 0.5)');
  glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, 130, 0, Math.PI * 2);
  ctx.fill();

  // Stone base.
  ctx.fillStyle = '#2a2438';
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, FORGE.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a4266';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Molten core: brighter and bigger with more HP.
  const coreR = (FORGE.r - 16) * (0.45 + 0.55 * hpFrac) * pulse;
  const core = ctx.createRadialGradient(FORGE.x, FORGE.y, 2, FORGE.x, FORGE.y, coreR + 8);
  core.addColorStop(0, PALETTE.forgeCore);
  core.addColorStop(0.6, PALETTE.forgeHot);
  core.addColorStop(1, PALETTE.forgeEmber);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Flame licks.
  ctx.fillStyle = 'rgba(255, 190, 80, 0.85)';
  for (let i = 0; i < 5; i += 1) {
    const a = time * 2.4 + (i * Math.PI * 2) / 5;
    const fx = FORGE.x + Math.cos(a) * (FORGE.r - 8);
    const fy = FORGE.y + Math.sin(a) * (FORGE.r - 8) - 6;
    ctx.beginPath();
    ctx.arc(fx, fy, 5 + Math.sin(time * 5 + i * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forge HP arc.
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, FORGE.r + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = low ? PALETTE.danger : PALETTE.forgeHot;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, FORGE.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
  ctx.stroke();

  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORGE', FORGE.x, FORGE.y + FORGE.r + 30);
  ctx.fillStyle = low ? PALETTE.danger : PALETTE.textDim;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(game.forgeHp)} / ${game.forgeMaxHp}`, FORGE.x, FORGE.y + FORGE.r + 46);
}

export function drawPlayer(ctx, player, time) {
  if (!player.alive) return;
  const blink = player.invuln > 0 && Math.floor(time * 12) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  // Glow.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 46);
  glow.addColorStop(0, PALETTE.playerGlow);
  glow.addColorStop(1, 'rgba(45, 225, 194, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 46, 0, Math.PI * 2);
  ctx.fill();

  // Wisp body: a teardrop pointing at the aim.
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  const flame = 6 + player.thrust * 8 + Math.sin(time * 9) * 2;
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-player.r - flame, 0);
  ctx.quadraticCurveTo(-player.r * 0.4, -player.r * 0.9, player.r, 0);
  ctx.quadraticCurveTo(-player.r * 0.4, player.r * 0.9, -player.r - flame, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, player.r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#06281f';
  ctx.beginPath();
  ctx.arc(player.r * 0.35, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eafffa';
  ctx.beginPath();
  ctx.arc(player.r * 0.35 + 1.5, -1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Aim tick.
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.8)';
  ctx.lineWidth = 2;
  const ax = player.x + Math.cos(player.facing) * (player.r + 16);
  const ay = player.y + Math.sin(player.facing) * (player.r + 16);
  ctx.beginPath();
  ctx.moveTo(ax - 5, ay);
  ctx.lineTo(ax + 5, ay);
  ctx.moveTo(ax, ay - 5);
  ctx.lineTo(ax, ay + 5);
  ctx.stroke();
}

export function drawMite(ctx, mite, time) {
  const t = mite.type;
  ctx.save();
  // Shadow blob.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(mite.x, mite.y + mite.r * 0.75, mite.r * 0.9, mite.r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const squash = 1 + Math.sin(mite.wobble * 2) * 0.08;
  ctx.translate(mite.x, mite.y);
  ctx.scale(squash, 1 / squash);
  ctx.fillStyle = mite.flash > 0 ? '#ffffff' : t.color;
  ctx.beginPath();
  ctx.arc(0, 0, mite.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.dark;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Spikes for brutes, dots for the rest.
  if (mite.kind === 'brute') {
    ctx.fillStyle = t.dark;
    for (let i = 0; i < 6; i += 1) {
      const a = (i * Math.PI * 2) / 6 + time * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * mite.r * 0.95, Math.sin(a) * mite.r * 0.95, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Eyes look toward the Forge.
  const look = Math.atan2(FORGE.y - mite.y, FORGE.x - mite.x);
  const ex = Math.cos(look);
  const ey = Math.sin(look);
  ctx.fillStyle = PALETTE.enemyEye;
  ctx.beginPath();
  ctx.arc(ex * 5 - ey * 5, ey * 5 + ex * 5, 3.4, 0, Math.PI * 2);
  ctx.arc(ex * 5 + ey * 5, ey * 5 - ex * 5, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.arc(ex * 6 - ey * 5, ey * 6 + ex * 5, 1.7, 0, Math.PI * 2);
  ctx.arc(ex * 6 + ey * 5, ey * 6 - ex * 5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // HP bar when hurt.
  if (mite.hp < mite.maxHp) {
    bar(ctx, mite.x - 16, mite.y - mite.r - 12, 32, 4, mite.hp / mite.maxHp, '#c084fc');
  }
  // Spitter charge telegraph.
  if (mite.type.ranged && mite.shotTimer < 0.5) {
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mite.x, mite.y, mite.r + 6 + (0.5 - mite.shotTimer) * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawBullet(ctx, bullet) {
  ctx.fillStyle = PALETTE.bullet;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.r + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
  ctx.fill();
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemyShot(ctx, shot) {
  ctx.fillStyle = 'rgba(232, 121, 249, 0.35)';
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.r + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e879f9';
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEmber(ctx, ember) {
  const bob = Math.sin(ember.bob) * 2;
  const glow = ctx.createRadialGradient(ember.x, ember.y + bob, 1, ember.x, ember.y + bob, 14);
  glow.addColorStop(0, 'rgba(255, 166, 43, 0.8)');
  glow.addColorStop(1, 'rgba(255, 166, 43, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ember.x, ember.y + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(ember.x, ember.y + bob, ember.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe1a8';
  ctx.beginPath();
  ctx.arc(ember.x - 1.5, ember.y + bob - 1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloatTexts(ctx, texts) {
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

export function drawHUD(ctx, game) {
  const p = game.player;
  ctx.textAlign = 'left';
  // Top-left: wave, score, embers.
  ctx.fillStyle = 'rgba(8, 8, 26, 0.6)';
  roundRect(ctx, 14, 12, 300, 86, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`WAVE ${Math.min(game.wave, WAVE_COUNT)} / ${WAVE_COUNT}`, 28, 40);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Score  ${game.score.toLocaleString('en-US')}`, 28, 64);
  ctx.fillStyle = PALETTE.ember;
  ctx.fillText(`◆ Embers  ${game.embers}`, 28, 86);

  // Top-right: enemies left.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(8, 8, 26, 0.6)';
  roundRect(ctx, VIEW.w - 234, 12, 220, 52, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px system-ui, sans-serif';
  const left = game.enemiesLeft();
  ctx.fillText(left > 0 ? `Mites left: ${left}` : 'Wave clear!', VIEW.w - 28, 33);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(game.waveIncoming, VIEW.w - 28, 54);

  // Bottom-left: player HP.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8, 8, 26, 0.6)';
  roundRect(ctx, 14, VIEW.h - 66, 250, 52, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('WISP', 28, VIEW.h - 44);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 250, VIEW.h - 44);
  ctx.textAlign = 'left';
  bar(ctx, 28, VIEW.h - 36, 200, 10, p.hp / p.maxHp, PALETTE.player);

  // Bottom-right: Forge HP.
  ctx.fillStyle = 'rgba(8, 8, 26, 0.6)';
  roundRect(ctx, VIEW.w - 264, VIEW.h - 66, 250, 52, 10);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(game.forgeHp)} / ${game.forgeMaxHp}`, VIEW.w - 250, VIEW.h - 44);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('FORGE', VIEW.w - 28, VIEW.h - 44);
  const frac = game.forgeHp / game.forgeMaxHp;
  bar(ctx, VIEW.w - 228, VIEW.h - 36, 200, 10, frac, frac < 0.3 ? PALETTE.danger : PALETTE.forgeHot);

  // Intermission countdown.
  if (game.state === 'playing' && game.intermission > 0 && game.spawnQueue.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Wave ${game.wave + 1} in ${Math.ceil(game.intermission)}…`, VIEW.w / 2, 150);
  }

  // Controls hint, first wave only.
  if (game.wave === 1 && game.waveTime < 6) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(241, 245, 255, 0.75)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD / arrows to move · Mouse to aim · Hold click to shoot · P pause · M mute', VIEW.w / 2, VIEW.h - 84);
  }
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(7, 7, 22, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function title(ctx, text, y, size = 64, color = PALETTE.text) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.fillText(text, VIEW.w / 2, y);
}

function subtitle(ctx, text, y, size = 19, color = PALETTE.textDim) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.fillText(text, VIEW.w / 2, y);
}

export function drawMenu(ctx, game) {
  overlay(ctx);
  // Ember glow behind the title.
  const glow = ctx.createRadialGradient(VIEW.w / 2, 250, 10, VIEW.w / 2, 250, 320);
  glow.addColorStop(0, 'rgba(255, 140, 40, 0.28)');
  glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.forgeHot;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('THE LAST FORGE IS BURNING LOW', VIEW.w / 2, 150);
  title(ctx, 'CINDERWAKE', 240, 92, PALETTE.forgeCore);
  subtitle(ctx, 'A guardian wisp. Ten waves of void mites. One forge left to keep lit.', 282, 20, PALETTE.text);
  subtitle(ctx, 'Survive wave 10 and the Forge ascends. If it falls, the dark wins.', 312, 18);

  // How to play card.
  ctx.fillStyle = 'rgba(26, 26, 62, 0.9)';
  roundRect(ctx, VIEW.w / 2 - 330, 350, 660, 178, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW.w / 2 - 300, 384);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'Move — WASD or arrow keys',
    'Aim & shoot — mouse, hold left click',
    'Mites walk to the Forge and chew it. Kill them, grab their embers.',
    'Between waves, pick 1 of 3 upgrades. Wave 10 is the last one.',
    'Fall in battle and you wake at the Forge — at a score cost.',
  ];
  lines.forEach((line, i) => ctx.fillText('•  ' + line, VIEW.w / 2 - 300, 412 + i * 22));

  // Start button.
  ctx.fillStyle = PALETTE.forgeHot;
  roundRect(ctx, VIEW.w / 2 - 150, 562, 300, 62, 12);
  ctx.fill();
  ctx.fillStyle = '#1a0d00';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  LIGHT THE FORGE', VIEW.w / 2, 601);
  subtitle(ctx, 'click, or press Enter / Space', 654, 15);
  subtitle(ctx, 'P pause · M mute · a tiny original game by Jaholicik', 720, 14, 'rgba(154,163,199,0.7)');
}

export function drawUpgrade(ctx, game) {
  overlay(ctx);
  title(ctx, `WAVE ${game.wave} CLEARED`, 130, 46, PALETTE.forgeCore);
  subtitle(ctx, `Bonus +${(game.wave * 100).toLocaleString('en-US')} score  ·  Choose one upgrade — it shapes the rest of your run`, 168, 18);
  subtitle(ctx, `Forge ${Math.ceil(game.forgeHp)} / ${game.forgeMaxHp} HP  ·  ${game.embers} embers banked`, 196, 16);

  const cardW = 300;
  const cardH = 250;
  const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  const x0 = (VIEW.w - totalW) / 2;
  const y0 = 250;
  game.upgradeChoices.forEach((up, i) => {
    const x = x0 + i * (cardW + gap);
    const hover = game.hoverCard === i;
    ctx.fillStyle = hover ? '#23235a' : PALETTE.card;
    roundRect(ctx, x, y0, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.cardHot : PALETTE.cardEdge;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.forgeCore;
    ctx.font = '44px system-ui, sans-serif';
    ctx.fillText(up.icon, x + cardW / 2, y0 + 66);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(up.name, x + cardW / 2, y0 + 112);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    wrapText(ctx, up.desc, x + cardW / 2, y0 + 146, cardW - 40, 22);
    ctx.fillStyle = PALETTE.cardHot;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]  click to take`, x + cardW / 2, y0 + cardH - 20);
  });
  subtitle(ctx, 'Press 1, 2 or 3 — or click a card', 560, 16);
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function drawPause(ctx) {
  overlay(ctx);
  title(ctx, 'PAUSED', 330, 64);
  subtitle(ctx, 'The mites wait. The Forge does not cool.', 380, 19);
  subtitle(ctx, 'P or Esc to resume · R to restart the run', 420, 17);
}

function endScreen(ctx, game, won) {
  overlay(ctx);
  if (won) {
    title(ctx, 'THE FORGE ASCENDS', 210, 64, PALETTE.forgeCore);
    subtitle(ctx, 'Wave 10 survived. Dawn breaks over the cinders — you kept the last light alive.', 258, 20, PALETTE.text);
  } else {
    title(ctx, 'THE FORGE GOES DARK', 210, 64, PALETTE.danger);
    subtitle(ctx, 'The mites overran the last Forge. The dark is patient — try again.', 258, 20, PALETTE.text);
  }
  const stats = [
    ['Final score', game.score.toLocaleString('en-US')],
    ['Waves survived', `${won ? WAVE_COUNT : game.wave - 1} / ${WAVE_COUNT}`],
    ['Mites slain', String(game.kills)],
    ['Embers gathered', String(game.embers)],
    ['Times fallen', String(game.player.deaths)],
    ['Upgrades taken', String(game.upgradesTaken)],
  ];
  ctx.fillStyle = 'rgba(26, 26, 62, 0.9)';
  roundRect(ctx, VIEW.w / 2 - 260, 300, 520, 44 + stats.length * 34, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  stats.forEach(([label, value], i) => {
    const y = 340 + i * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(label, VIEW.w / 2 - 230, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(value, VIEW.w / 2 + 230, y);
  });

  ctx.fillStyle = won ? PALETTE.forgeHot : '#3b3b7a';
  roundRect(ctx, VIEW.w / 2 - 150, 610, 300, 62, 12);
  ctx.fill();
  ctx.fillStyle = won ? '#1a0d00' : PALETTE.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? '↻  PLAY AGAIN' : '↻  TRY AGAIN', VIEW.w / 2, 649);
  subtitle(ctx, 'click, or press Enter / R to restart', 700, 15);
}

export function drawGameOver(ctx, game) {
  endScreen(ctx, game, false);
}

export function drawVictory(ctx, game) {
  endScreen(ctx, game, true);
}
