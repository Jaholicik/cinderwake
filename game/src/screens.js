// Screens and HUD for CINDERWAKE: the frame the player reads while fighting
// (wave, score, combo, ability cooldowns, the boss bar) and the full-screen
// states — menu, upgrade choice, pause, victory and game over. The world
// itself is drawn in render.js. Nothing here changes game state.

import { PALETTE, VIEW, WAVE_COUNT } from './config.js';
import { bar, roundRect } from './render.js';

function abilityChip(ctx, x, y, label, key, fracReadyRaw, color) {
  const fracReady = Math.max(0, Math.min(1, fracReadyRaw));
  const w = 118;
  const h = 40;
  ctx.fillStyle = 'rgba(8, 8, 26, 0.62)';
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = fracReady >= 1 ? color : 'rgba(59, 59, 122, 0.8)';
  ctx.lineWidth = fracReady >= 1 ? 2 : 1;
  roundRect(ctx, x, y, w, h, 9);
  ctx.stroke();
  if (fracReady < 1) {
    ctx.fillStyle = 'rgba(125, 249, 255, 0.13)';
    ctx.fillRect(x + 3, y + 3, (w - 6) * fracReady, h - 6);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = fracReady >= 1 ? color : PALETTE.textDim;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(label, x + 10, y + 17);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(fracReady >= 1 ? 'READY' : key, x + 10, y + 33);
  ctx.textAlign = 'right';
  ctx.fillStyle = fracReady >= 1 ? color : PALETTE.textDim;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(key, x + w - 9, y + 17);
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

  // Boss bar, top centre, while a boss lives.
  const boss = game.mites.find((m) => m.isBoss);
  if (boss) {
    const w = 430;
    const x = (VIEW.w - w) / 2;
    ctx.fillStyle = 'rgba(8, 8, 26, 0.66)';
    roundRect(ctx, x - 12, 10, w + 24, 46, 10);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = boss.enraged ? PALETTE.danger : PALETTE.boss;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(boss.type.bossName + (boss.enraged ? ' — ENRAGED' : ''), VIEW.w / 2, 29);
    bar(ctx, x, 36, w, 10, boss.hp / boss.maxHp, boss.enraged ? PALETTE.danger : PALETTE.boss);
  }

  // Combo meter, under the enemies panel: the streak and its cooling bar.
  if (game.combo.count >= 2) {
    const w = 220;
    const x = VIEW.w - 234;
    ctx.fillStyle = 'rgba(8, 8, 26, 0.6)';
    roundRect(ctx, x, 72, w, 44, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.combo;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`COMBO ×${game.combo.count}`, x + 14, 92);
    ctx.textAlign = 'right';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`best ×${game.combo.best}`, VIEW.w - 28, 92);
    ctx.textAlign = 'left';
    bar(ctx, x + 14, 100, w - 28, 5, game.combo.frac, PALETTE.combo);
  }

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

  // Bottom-centre: the two abilities and their cooldowns.
  const dashFrac = 1 - p.dashCd / p.dashCdMax;
  const novaFrac = 1 - p.novaCd / p.novaCdMax;
  abilityChip(ctx, VIEW.w / 2 - 124, VIEW.h - 58, 'DASH', 'SHIFT', dashFrac, PALETTE.player);
  abilityChip(ctx, VIEW.w / 2 + 6, VIEW.h - 58, 'NOVA', 'E', novaFrac, PALETTE.nova);

  // Forge critical warning.
  if (game.state === 'playing' && frac < 0.3 && Math.floor(game.time * 2) % 2 === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText('⚠ FORGE CRITICAL ⚠', VIEW.w / 2, 108);
  }

  // Intermission countdown.
  if (game.state === 'playing' && game.intermission > 0 && game.spawnQueue.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Wave ${game.wave + 1} in ${Math.ceil(game.intermission)}…`, VIEW.w / 2, 150);
  }

  // Controls hint, first wave only.
  if (game.wave === 1 && game.waveTime < 7) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(241, 245, 255, 0.75)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD move · Mouse aim · Hold click to shoot · SHIFT dash · E nova · P pause', VIEW.w / 2, VIEW.h - 84);
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
  ctx.fillText('THE LAST FORGE IS BURNING LOW', VIEW.w / 2, 138);
  title(ctx, 'CINDERWAKE', 228, 92, PALETTE.forgeCore);
  subtitle(ctx, 'A guardian wisp. Ten waves of void mites. One forge left to keep lit.', 268, 20, PALETTE.text);
  subtitle(ctx, 'Cindermaw stirs at wave 5. The Hollow Maw waits at wave 10.', 296, 18);

  // How to play card.
  ctx.fillStyle = 'rgba(26, 26, 62, 0.9)';
  roundRect(ctx, VIEW.w / 2 - 340, 330, 680, 196, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW.w / 2 - 310, 362);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'Move — WASD or arrow keys · Aim & shoot — mouse, hold left click',
    'Dash — SHIFT or right-click: a flicker of speed, untouchable mid-dash',
    'Ember Nova — E: a shockwave that wounds and shoves everything near',
    'Mites chew the Forge. Kill them, chain combos, grab their embers.',
    'Between waves pick 1 of 3 upgrades — gold RARE cards bend the run.',
    'Fall in battle and you wake at the Forge — at a score cost.',
  ];
  lines.forEach((line, i) => ctx.fillText('•  ' + line, VIEW.w / 2 - 310, 388 + i * 22));

  // Start button.
  ctx.fillStyle = PALETTE.forgeHot;
  roundRect(ctx, VIEW.w / 2 - 150, 556, 300, 62, 12);
  ctx.fill();
  ctx.fillStyle = '#1a0d00';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  LIGHT THE FORGE', VIEW.w / 2, 595);
  subtitle(ctx, 'click, or press Enter / Space', 646, 15);
  subtitle(ctx, 'P pause · M mute · a tiny original game by Jaholicik', 716, 14, 'rgba(154,163,199,0.7)');
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
    const rare = up.rarity === 'rare';
    ctx.fillStyle = hover ? '#23235a' : PALETTE.card;
    roundRect(ctx, x, y0, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = rare ? PALETTE.cardRare : hover ? PALETTE.cardHot : PALETTE.cardEdge;
    ctx.lineWidth = rare ? 3 : hover ? 3 : 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    if (rare) {
      ctx.fillStyle = PALETTE.cardRare;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('★ RARE ★', x + cardW / 2, y0 + 26);
    }
    ctx.fillStyle = PALETTE.forgeCore;
    ctx.font = '44px system-ui, sans-serif';
    ctx.fillText(up.icon, x + cardW / 2, y0 + 70);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(up.name, x + cardW / 2, y0 + 116);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    wrapText(ctx, up.desc, x + cardW / 2, y0 + 148, cardW - 40, 22);
    if (up.synergyLit) {
      ctx.fillStyle = PALETTE.combo;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`✦ SYNERGY — ${up.synergyName} ✦`, x + cardW / 2, y0 + cardH - 44);
    }
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
    title(ctx, 'THE FORGE ASCENDS', 196, 64, PALETTE.forgeCore);
    subtitle(ctx, 'Both Maws are broken and wave 10 is survived. Dawn breaks over the cinders.', 242, 20, PALETTE.text);
  } else {
    title(ctx, 'THE FORGE GOES DARK', 196, 64, PALETTE.danger);
    subtitle(ctx, 'The mites overran the last Forge. The dark is patient — try again.', 242, 20, PALETTE.text);
  }
  const stats = [
    ['Final score', game.score.toLocaleString('en-US')],
    ['Waves survived', `${won ? WAVE_COUNT : game.wave - 1} / ${WAVE_COUNT}`],
    ['Mites slain', String(game.kills)],
    ['Bosses felled', `${game.bossesFelled} / 2`],
    ['Highest combo', `×${game.combo.best}`],
    ['Embers gathered', String(game.embers)],
    ['Times fallen', String(game.player.deaths)],
    ['Upgrades taken', String(game.upgradesTaken)],
  ];
  ctx.fillStyle = 'rgba(26, 26, 62, 0.9)';
  roundRect(ctx, VIEW.w / 2 - 260, 282, 520, 44 + stats.length * 33, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  stats.forEach(([label, value], i) => {
    const y = 322 + i * 33;
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
  roundRect(ctx, VIEW.w / 2 - 150, 618, 300, 62, 12);
  ctx.fill();
  ctx.fillStyle = won ? '#1a0d00' : PALETTE.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? '↻  PLAY AGAIN' : '↻  TRY AGAIN', VIEW.w / 2, 657);
  subtitle(ctx, 'click, or press Enter / R to restart', 706, 15);
}

export function drawGameOver(ctx, game) {
  endScreen(ctx, game, false);
}

export function drawVictory(ctx, game) {
  endScreen(ctx, game, true);
}
