// World drawing for CINDERWAKE: the arena, its layered backdrop, the Forge,
// the wisp, the mites and bosses, and the transient effects. Screens and the
// HUD live in screens.js. Nothing here changes game state.

import { FORGE, PALETTE, SPAWN_TELEGRAPH, VIEW } from './config.js';

export function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The backdrop in three depths: a far skyline of dead furnaces, a nearer
// row of chimney stacks and a great slow gear, then drifting cinders. The
// layers sway at different rates, so the arena feels deep when things move.
export function drawBackground(ctx, time) {
  const g = ctx.createRadialGradient(FORGE.x, FORGE.y, 60, FORGE.x, FORGE.y, 720);
  g.addColorStop(0, PALETTE.bgGlow);
  g.addColorStop(0.45, PALETTE.bgMid);
  g.addColorStop(1, PALETTE.bgDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // Far silhouettes: furnace crowns along the horizon.
  ctx.fillStyle = PALETTE.silhouetteFar;
  const swayFar = Math.sin(time * 0.05) * 5;
  for (let i = 0; i < 7; i += 1) {
    const x = i * 195 - 40 + swayFar;
    const hgt = 60 + (i % 3) * 26;
    ctx.fillRect(x, VIEW.h - hgt, 110, hgt);
    ctx.beginPath();
    ctx.moveTo(x - 8, VIEW.h - hgt);
    ctx.lineTo(x + 55, VIEW.h - hgt - 22);
    ctx.lineTo(x + 118, VIEW.h - hgt);
    ctx.closePath();
    ctx.fill();
  }

  // Near silhouettes: two chimney stacks and a gear that turns with the age.
  ctx.fillStyle = PALETTE.silhouette;
  const swayNear = Math.sin(time * 0.09) * 9;
  ctx.fillRect(52 + swayNear, VIEW.h - 210, 44, 210);
  ctx.fillRect(44 + swayNear, VIEW.h - 226, 60, 18);
  ctx.fillRect(VIEW.w - 150 + swayNear, VIEW.h - 168, 38, 168);
  ctx.fillRect(VIEW.w - 158 + swayNear, VIEW.h - 182, 54, 16);
  ctx.save();
  ctx.translate(VIEW.w - 92 + swayNear, 108);
  ctx.rotate(time * 0.05);
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI * 2) / 8;
    ctx.rect(Math.cos(a) * 44 - 7, Math.sin(a) * 44 - 7, 14, 14);
  }
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.bgDeep;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

// Crack polylines for the Forge's stone, revealed as its HP falls. Fixed
// shapes (drawn from a table, not random) so the damage reads the same
// every frame.
const FORGE_CRACKS = [
  [[-30, -28], [-14, -12], [-18, 4], [-6, 16]],
  [[26, -30], [16, -14], [24, -2], [14, 12]],
  [[-38, 8], [-22, 12], [-12, 22]],
  [[34, 18], [20, 20], [10, 30]],
  [[0, -40], [-4, -24], [4, -12]],
];

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

  // Cracks show through the stone as the Forge weakens.
  if (hpFrac < 0.65) {
    const shown = hpFrac < 0.3 ? FORGE_CRACKS.length : hpFrac < 0.45 ? 3 : 1;
    ctx.strokeStyle = 'rgba(5, 4, 14, 0.8)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < shown; i += 1) {
      ctx.beginPath();
      FORGE_CRACKS[i].forEach(([cx, cy], j) => {
        if (j === 0) ctx.moveTo(FORGE.x + cx, FORGE.y + cy);
        else ctx.lineTo(FORGE.x + cx, FORGE.y + cy);
      });
      ctx.stroke();
    }
  }

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

  // Rotating rune ring: the old wards, still turning.
  ctx.save();
  ctx.translate(FORGE.x, FORGE.y);
  ctx.rotate(time * 0.25);
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.arc(0, 0, FORGE.r + 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

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
  const blink = player.invuln > 0 && !player.dashing && Math.floor(time * 12) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  // Dash afterimages: the wisp smeared along its flicker.
  for (let i = player.dashTrail.length - 1; i >= 0; i -= 1) {
    const ghost = player.dashTrail[i];
    ctx.globalAlpha = 0.13 * (i + 1);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, player.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = blink ? 0.35 : 1;

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

function drawEyes(ctx, mite, look) {
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
}

export function drawMite(ctx, mite, time) {
  const t = mite.type;
  // Spawn telegraph: a shrinking warning ring and a ghost of what's coming.
  if (mite.spawning > 0) {
    const frac = 1 - mite.spawning / SPAWN_TELEGRAPH;
    ctx.strokeStyle = `rgba(255, 77, 77, ${0.35 + frac * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mite.x, mite.y, mite.r + 16 * (1 - frac) + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25 + frac * 0.35;
  }
  ctx.save();
  // Shadow blob.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(mite.x, mite.y + mite.r * 0.75, mite.r * 0.9, mite.r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const squash = 1 + Math.sin(mite.wobble * 2) * 0.08;
  ctx.translate(mite.x, mite.y);
  ctx.scale(squash, 1 / squash);
  const look = Math.atan2(FORGE.y - mite.y, FORGE.x - mite.x);
  const body = mite.flash > 0 ? '#ffffff' : t.color;

  if (mite.kind === 'skitter') {
    // A darting shard-bug: pointed body, legs flickering.
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 2;
    for (let leg = 0; leg < 3; leg += 1) {
      const ph = Math.sin(time * 26 + leg * 2.1) * 4;
      ctx.beginPath();
      ctx.moveTo(-4 + leg * 4, -mite.r * 0.5);
      ctx.lineTo(-8 + leg * 4 + ph, -mite.r - 3);
      ctx.moveTo(-4 + leg * 4, mite.r * 0.5);
      ctx.lineTo(-8 + leg * 4 - ph, mite.r + 3);
      ctx.stroke();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(mite.r + 4, 0);
    ctx.lineTo(-mite.r, -mite.r * 0.72);
    ctx.lineTo(-mite.r * 0.4, 0);
    ctx.lineTo(-mite.r, mite.r * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (mite.kind === 'splitter') {
    // A cluster of fused orbs: the children are visible inside the mother.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, mite.r * 0.78, 0, Math.PI * 2);
    ctx.arc(-mite.r * 0.62, mite.r * 0.4, mite.r * 0.45, 0, Math.PI * 2);
    ctx.arc(mite.r * 0.62, mite.r * 0.4, mite.r * 0.45, 0, Math.PI * 2);
    ctx.arc(0, -mite.r * 0.62, mite.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, mite.r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mite.kind === 'bulwark') {
    // A hexagonal ward-bearer; its shield is drawn after the body below.
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i * Math.PI * 2) / 6 + Math.PI / 6;
      const px = Math.cos(a) * mite.r;
      const py = Math.sin(a) * mite.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = t.dark;
    ctx.beginPath();
    ctx.arc(0, 0, mite.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, mite.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (mite.kind === 'brute') {
      ctx.fillStyle = t.dark;
      for (let i = 0; i < 6; i += 1) {
        const a = (i * Math.PI * 2) / 6 + time * 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * mite.r * 0.95, Math.sin(a) * mite.r * 0.95, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (mite.kind === 'spitter') {
      // A venom sac that swells as the next shot charges.
      const charge = 1 - Math.max(0, mite.shotTimer) / (t.shotCooldown || 2.4);
      ctx.fillStyle = mite.flash > 0 ? '#ffffff' : '#f0abfc';
      ctx.beginPath();
      ctx.arc(0, 0, mite.r * (0.3 + charge * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawEyes(ctx, mite, look);
  ctx.restore();

  // Bulwark ward: an arc of light on the Forge side, completeness = HP.
  if (mite.shieldMax > 0 && mite.shieldHp > 0) {
    const frac = mite.shieldHp / mite.shieldMax;
    ctx.strokeStyle = mite.shieldFlash > 0 ? '#ffffff' : PALETTE.shield;
    ctx.globalAlpha = 0.45 + frac * 0.5;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(mite.x, mite.y, mite.r + 7, look - 1.15, look + 1.15);
    ctx.stroke();
    ctx.globalAlpha = 1;
    bar(ctx, mite.x - 16, mite.y - mite.r - 20, 32, 3.5, frac, PALETTE.shield);
  }

  // Elite gilding: a gold ring and crown ticks.
  if (mite.elite) {
    ctx.strokeStyle = PALETTE.elite;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mite.x, mite.y, mite.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.elite;
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      ctx.beginPath();
      ctx.arc(mite.x + Math.cos(a) * (mite.r + 4), mite.y + Math.sin(a) * (mite.r + 4), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // HP bar when hurt.
  if (mite.hp < mite.maxHp) {
    bar(ctx, mite.x - 16, mite.y - mite.r - 12, 32, 4, mite.hp / mite.maxHp, mite.elite ? PALETTE.elite : '#c084fc');
  }
  // Spitter charge telegraph.
  if (mite.type.ranged && mite.shotTimer < 0.5 && mite.spawning <= 0) {
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mite.x, mite.y, mite.r + 6 + (0.5 - mite.shotTimer) * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawBoss(ctx, boss, time) {
  const t = boss.type;
  // Spawn telegraph: a wide warning ring — something big is coming through.
  if (boss.spawning > 0) {
    const frac = 1 - boss.spawning / SPAWN_TELEGRAPH;
    ctx.strokeStyle = `rgba(255, 77, 77, ${0.4 + frac * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 30 * (1 - frac) + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(boss.x, boss.y + boss.r * 0.8, boss.r * 0.95, boss.r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Charge telegraph: a dashed lane from the Maw to its target.
  if (boss.mode === 'windup') {
    const blinkOn = Math.floor(time * 10) % 2 === 0;
    ctx.strokeStyle = blinkOn ? 'rgba(255, 77, 77, 0.85)' : 'rgba(255, 77, 77, 0.3)';
    ctx.lineWidth = boss.r * 1.1;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + boss.chargeDirX * 700, boss.y + boss.chargeDirY * 700);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.translate(boss.x, boss.y);
  const shudder = boss.mode === 'windup' ? Math.sin(time * 60) * 2 : 0;
  ctx.translate(shudder, 0);
  const pulse = 1 + Math.sin(time * (boss.enraged ? 5.2 : 2.6)) * 0.05;

  // Outer maw: a ring of rotating teeth around a dark gullet.
  ctx.fillStyle = boss.flash > 0 ? '#ffffff' : t.dark;
  ctx.beginPath();
  ctx.arc(0, 0, boss.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = boss.flash > 0 ? '#ffffff' : t.color;
  const teeth = 10;
  for (let i = 0; i < teeth; i += 1) {
    const a = (i * Math.PI * 2) / teeth + time * 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * boss.r * 0.98, Math.sin(a) * boss.r * 0.98);
    ctx.lineTo(Math.cos(a + 0.16) * boss.r * 0.66, Math.sin(a + 0.16) * boss.r * 0.66);
    ctx.lineTo(Math.cos(a - 0.16) * boss.r * 0.66, Math.sin(a - 0.16) * boss.r * 0.66);
    ctx.closePath();
    ctx.fill();
  }
  const gullet = ctx.createRadialGradient(0, 0, 2, 0, 0, boss.r * 0.62);
  gullet.addColorStop(0, '#05020a');
  gullet.addColorStop(0.8, '#1c0512');
  gullet.addColorStop(1, t.dark);
  ctx.fillStyle = gullet;
  ctx.beginPath();
  ctx.arc(0, 0, boss.r * 0.62 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Eyes ring the gullet and track the wisp.
  const look = Math.atan2(FORGE.y - boss.y, FORGE.x - boss.x);
  ctx.fillStyle = PALETTE.bossEye;
  const eyes = boss.kind === 'boss' ? 5 : 3;
  for (let i = 0; i < eyes; i += 1) {
    const a = (i * Math.PI * 2) / eyes + time * 0.3;
    const ex = Math.cos(a) * boss.r * 0.8;
    const ey = Math.sin(a) * boss.r * 0.8;
    ctx.beginPath();
    ctx.arc(ex, ey, boss.r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0510';
    ctx.beginPath();
    ctx.arc(ex + Math.cos(look) * 2, ey + Math.sin(look) * 2, boss.r * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.bossEye;
  }
  ctx.restore();

  // Name plate under the boss.
  ctx.textAlign = 'center';
  ctx.fillStyle = boss.enraged ? PALETTE.danger : PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(t.label.toUpperCase(), boss.x, boss.y + boss.r + 22);
}

export function drawBullet(ctx, bullet) {
  if (bullet.explosive) {
    // Star shell: a bright core with a cross sparkle.
    ctx.fillStyle = 'rgba(255, 190, 90, 0.4)';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76b';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3cf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bullet.x - bullet.r - 4, bullet.y);
    ctx.lineTo(bullet.x + bullet.r + 4, bullet.y);
    ctx.moveTo(bullet.x, bullet.y - bullet.r - 4);
    ctx.lineTo(bullet.x, bullet.y + bullet.r + 4);
    ctx.stroke();
    return;
  }
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

// Expanding nova rings, drawn from game.novaFx entries {x, y, r, life, maxLife}.
export function drawNovaFx(ctx, fx) {
  for (const ring of fx) {
    const frac = ring.life / ring.maxLife;
    ctx.strokeStyle = `rgba(125, 249, 255, ${frac * 0.85})`;
    ctx.lineWidth = 3 + frac * 5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${frac * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Arc-conductor lightning, from game.zaps entries {x1, y1, x2, y2, life}.
export function drawZaps(ctx, zaps) {
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.9)';
  ctx.lineWidth = 2;
  for (const zap of zaps) {
    ctx.globalAlpha = Math.max(0, zap.life / 0.16);
    ctx.beginPath();
    const segs = 4;
    for (let i = 0; i <= segs; i += 1) {
      const f = i / segs;
      const jx = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * 16;
      const jy = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * 16;
      const x = zap.x1 + (zap.x2 - zap.x1) * f + jx;
      const y = zap.y1 + (zap.y2 - zap.y1) * f + jy;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Edge vignettes: red creep when the Forge is dying, a hot flash when the
// wisp is hurt, and a slow pulse on the alarm beat.
export function drawVignette(ctx, game, time) {
  const forgeFrac = game.forgeHp / game.forgeMaxHp;
  if (forgeFrac < 0.3 && game.state === 'playing') {
    const pulse = 0.16 + Math.sin(time * 5.2) * 0.07;
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, 320, VIEW.w / 2, VIEW.h / 2, 760);
    g.addColorStop(0, 'rgba(255, 40, 30, 0)');
    g.addColorStop(1, `rgba(255, 40, 30, ${pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  if (game.player.hurtFlash > 0) {
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, 300, VIEW.w / 2, VIEW.h / 2, 740);
    g.addColorStop(0, 'rgba(255, 60, 40, 0)');
    g.addColorStop(1, `rgba(255, 60, 40, ${game.player.hurtFlash * 0.5})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}
