// The Moon Pearl — everything the eye sees.
// One canvas, drawn in layers: stone floor, shadow patches, cover, lamps,
// the gate and the pearls, then each guard's vision cone, the guards and
// the thief, then footstep ripples, and finally the night itself — a dark
// wash with warm pools of lamplight punched back through it.

import { TILE, COLS, ROWS, WORLD_WIDTH, WORLD_HEIGHT, COLORS, GUARD } from './config.js';
import { FULL_MAP, LAMPS, EXIT_TILES, tileAt, rayDistance } from './level.js';

// A stable pseudo-random shade per tile, so the floor reads as stone
// without any image file.
function tileShade(col, row) {
  const h = (col * 374761393 + row * 668265263) ^ (col * row * 974634211);
  return ((h >>> 0) % 100) / 100;
}

function drawFloor(ctx, time) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = FULL_MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      const shade = tileShade(col, row);
      if (ch === ',') {
        ctx.fillStyle = COLORS.shadowFloor;
      } else {
        ctx.fillStyle = shade > 0.5 ? COLORS.floorA : COLORS.floorB;
      }
      ctx.fillRect(x, y, TILE, TILE);
      if (shade > 0.86) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 4, y + 5, 12, 7);
      }
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawCover(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = FULL_MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wallSide;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 9);
        ctx.strokeStyle = '#232634';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (ch === 'H') {
        ctx.fillStyle = COLORS.hedge;
        ctx.beginPath();
        ctx.arc(x + 10, y + 12, 11, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 10, 12, 0, Math.PI * 2);
        ctx.arc(x + 16, y + 22, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.hedgeLight;
        ctx.beginPath();
        ctx.arc(x + 11, y + 11, 5, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 9, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      } else if (ch === 'T') {
        ctx.fillStyle = COLORS.treeTrunk;
        ctx.fillRect(x + 13, y + 18, 6, 12);
        ctx.fillStyle = COLORS.treeTop;
        ctx.beginPath();
        ctx.arc(x + 16, y + 13, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.treeTopLight;
        ctx.beginPath();
        ctx.arc(x + 12, y + 10, 6, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLamps(ctx, time) {
  for (const lamp of LAMPS) {
    const flicker = 0.9 + 0.1 * Math.sin(time * 2.1 + lamp.flicker);
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.radius * flicker);
    glow.addColorStop(0, 'rgba(255, 210, 122, 0.30)');
    glow.addColorStop(0.6, 'rgba(255, 210, 122, 0.10)');
    glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - lamp.radius, lamp.y - lamp.radius, lamp.radius * 2, lamp.radius * 2);
    ctx.fillStyle = COLORS.lampPost;
    ctx.fillRect(lamp.x - 2, lamp.y - 4, 4, 12);
    ctx.fillStyle = COLORS.lampGlow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, time) {
  for (const [col, row] of EXIT_TILES) {
    const x = col * TILE;
    const y = row * TILE;
    ctx.fillStyle = COLORS.exitArch;
    ctx.fillRect(x, y, TILE, TILE);
  }
  const first = EXIT_TILES[0];
  const gx = first[0] * TILE;
  const gy = first[1] * TILE;
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4);
  ctx.fillStyle = `rgba(232, 182, 76, ${0.25 * pulse})`;
  ctx.fillRect(gx, gy, TILE * 2, TILE);
  ctx.strokeStyle = COLORS.exitGold;
  ctx.lineWidth = 3;
  ctx.strokeRect(gx + 2, gy + 2, TILE * 2 - 4, TILE - 4);
  ctx.fillStyle = COLORS.exitGold;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GATE', gx + TILE, gy + TILE / 2);
}

function drawPearls(ctx, pearls, time) {
  for (const pearl of pearls) {
    if (pearl.taken) continue;
    const bob = Math.sin(time * 2 + pearl.bob) * 2;
    const y = pearl.y + bob;
    const glow = ctx.createRadialGradient(pearl.x, y, 2, pearl.x, y, 26);
    glow.addColorStop(0, 'rgba(207, 232, 255, 0.55)');
    glow.addColorStop(1, 'rgba(207, 232, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pearl.x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.pearl;
    ctx.beginPath();
    ctx.arc(pearl.x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.pearlCore;
    ctx.beginPath();
    ctx.arc(pearl.x - 2, y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A guard's vision cone, cut short by whatever blocks the ray: hedges and
// walls carve the cone's edge, so cover reads at a glance.
function drawVisionCone(ctx, guard) {
  const rays = 26;
  const facing = Math.atan2(guard.dirY, guard.dirX);
  const alarmed = guard.state === 'chase';
  const fill = alarmed ? COLORS.alarmCone : COLORS.guardCone;
  const edge = alarmed ? COLORS.alarmConeEdge : COLORS.guardConeEdge;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const a = facing - GUARD.visionHalfAngle + (2 * GUARD.visionHalfAngle * i) / rays;
    const d = rayDistance(guard.x, guard.y, Math.cos(a), Math.sin(a), GUARD.visionRange);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  drawVisionCone(ctx, guard);
  const bob = Math.sin(time * 6 + guard.x * 0.05) * 0.6;
  const x = guard.x;
  const y = guard.y + bob;
  // Body: a watchman in a dark red coat with a brass-trimmed helmet.
  ctx.fillStyle = COLORS.guardBody;
  ctx.beginPath();
  ctx.arc(x, y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.guardTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.guardTrim;
  ctx.beginPath();
  ctx.arc(x + guard.dirX * 5, y + guard.dirY * 5, 4, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick so the patrol direction reads even without the cone.
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + guard.dirX * (GUARD.radius - 2), y + guard.dirY * (GUARD.radius - 2));
  ctx.lineTo(x + guard.dirX * (GUARD.radius + 6), y + guard.dirY * (GUARD.radius + 6));
  ctx.stroke();
  // Detection meter: a ring that fills as suspicion grows.
  if (guard.meter > 0.03) {
    ctx.strokeStyle = guard.meter >= 1 ? '#ff463c' : '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.meter * Math.PI * 2);
    ctx.stroke();
  }
  // "?" while suspicious, "!" while chasing — the near miss, made visible.
  if (guard.state === 'chase') {
    drawMark(ctx, x, y - GUARD.radius - 14, '!', '#ff463c');
  } else if (guard.suspicious) {
    drawMark(ctx, x, y - GUARD.radius - 14, '?', '#ffd65a');
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
}

function drawPlayer(ctx, player, time) {
  const x = player.x;
  const y = player.y;
  const crouch = player.sneaking ? 0.82 : 1;
  const bob = player.moving ? Math.sin(time * (player.sneaking ? 7 : 10)) * 1 : 0;
  // A soft glow around the thief so the eye finds the hero in the dark.
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 34);
  glow.addColorStop(0, 'rgba(140, 160, 255, 0.16)');
  glow.addColorStop(1, 'rgba(140, 160, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  // Cloak, hood and face, turned toward the direction of travel.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.ellipse(x, y + bob, 11, 11 * crouch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(x + player.dirX * 2, y + player.dirY * 2 + bob, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.playerSkin;
  ctx.beginPath();
  ctx.arc(x + player.dirX * 4, y + player.dirY * 4 + bob, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Click-to-move target marker.
  if (player.moveTarget) {
    ctx.strokeStyle = 'rgba(207, 232, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.moveTarget.x, player.moveTarget.y, 7, 0, Math.PI * 2);
    ctx.moveTo(player.moveTarget.x - 10, player.moveTarget.y);
    ctx.lineTo(player.moveTarget.x + 10, player.moveTarget.y);
    ctx.moveTo(player.moveTarget.x, player.moveTarget.y - 10);
    ctx.lineTo(player.moveTarget.x, player.moveTarget.y + 10);
    ctx.stroke();
  }
}

function drawRipples(ctx, ripples) {
  for (const ripple of ripples) {
    const t = ripple.age / ripple.life;
    const radius = 4 + t * ripple.maxRadius;
    ctx.strokeStyle = `rgba(190, 205, 255, ${0.5 * (1 - t)})`;
    ctx.lineWidth = ripple.loud ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    const t = p.age / p.life;
    ctx.fillStyle = `rgba(207, 232, 255, ${1 - t})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * (1 - t) + 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The night: one dark wash over the garden, with the lamp pools and a
// soft halo around the thief glowing back through it.
function drawNight(ctx, player) {
  ctx.fillStyle = COLORS.night;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of LAMPS) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.radius);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.26)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - lamp.radius, lamp.y - lamp.radius, lamp.radius * 2, lamp.radius * 2);
  }
  const halo = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 90);
  halo.addColorStop(0, 'rgba(120, 140, 255, 0.10)');
  halo.addColorStop(1, 'rgba(120, 140, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(player.x - 90, player.y - 90, 180, 180);
  ctx.globalCompositeOperation = 'source-over';
  // A gentle vignette so the garden feels like night.
  const vig = ctx.createRadialGradient(
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.42,
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.95,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

export function drawWorld(ctx, game, time) {
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawFloor(ctx, time);
  drawLamps(ctx, time);
  drawExit(ctx, time);
  drawPearls(ctx, game.pearls, time);
  drawCover(ctx);
  for (const guard of game.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, game.player, time);
  drawRipples(ctx, game.ripples);
  drawParticles(ctx, game.particles);
  drawNight(ctx, game.player);
}
