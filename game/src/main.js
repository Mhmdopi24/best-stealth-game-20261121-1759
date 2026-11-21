// The Moon Pearl — the game loop, the state machine and the input.
// Title -> playing -> caught or win. The loop owns the clock, reads the
// keyboard and the mouse, hands each frame's events to the sound bank and
// the HUD, and keeps a small debug hook so the game can be playtested
// from a console: window.MOONPEARL.

import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { PLAYER_START, freshPearls, EXIT_TILES, GUARD_DEFS, LAMPS } from './level.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { drawWorld } from './render.js';
import { SoundBank } from './audio.js';

const PEARLS_TO_WIN = 3;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hudPearls = document.getElementById('hud-pearls');
const hudAlert = document.getElementById('hud-alert');
const hudTimer = document.getElementById('hud-timer');
const hudHint = document.getElementById('hud-hint');
const titleScreen = document.getElementById('title-screen');
const caughtScreen = document.getElementById('caught-screen');
const winScreen = document.getElementById('win-screen');
const caughtText = document.getElementById('caught-text');
const winText = document.getElementById('win-text');

const sounds = new SoundBank();

const game = {
  state: 'title', // title | playing | caught | win
  player: new Player(PLAYER_START.x, PLAYER_START.y),
  guards: GUARD_DEFS.map((def) => new Guard(def)),
  pearls: freshPearls(),
  ripples: [],
  particles: [],
  time: 0,
  playTime: 0,
  hintTimer: 0,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sneak: false,
};

function resetGame() {
  game.player.reset(PLAYER_START.x, PLAYER_START.y);
  for (const guard of game.guards) guard.reset();
  game.pearls = freshPearls();
  game.ripples = [];
  game.particles = [];
  game.playTime = 0;
  game.hintTimer = 0;
  hudHint.textContent = '';
}

function startGame() {
  sounds.ensure();
  sounds.click();
  resetGame();
  game.state = 'playing';
  titleScreen.classList.add('hidden');
  caughtScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  canvas.focus();
}

function endCaught(guardName) {
  game.state = 'caught';
  sounds.caught();
  caughtText.textContent = `Caught by ${guardName} — the manor wakes, and the pearls stay in the dark.`;
  caughtScreen.classList.remove('hidden');
}

function endWin() {
  game.state = 'win';
  sounds.win();
  const t = formatTime(game.playTime);
  winText.textContent = `All three moon pearls are yours in ${t}. The gate swings open — the night is yours.`;
  winScreen.classList.remove('hidden');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function showHint(text) {
  hudHint.textContent = text;
  game.hintTimer = 3;
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'playerStep') {
      game.ripples.push({ x: ev.x, y: ev.y, age: 0, life: 0.7, maxRadius: ev.loud ? 26 : 14, loud: ev.loud });
      if (ev.loud) sounds.playerStep();
    } else if (ev.type === 'guardStep') {
      game.ripples.push({ x: ev.x, y: ev.y, age: 0, life: 0.9, maxRadius: 22, loud: ev.state === 'chase' });
      const d = Math.hypot(ev.x - game.player.x, ev.y - game.player.y);
      sounds.footstep(Math.min(1, d / 420));
    } else if (ev.type === 'suspicious') {
      sounds.suspicious();
      showHint(`${ev.name} heard something…`);
    } else if (ev.type === 'alarm') {
      sounds.alarm();
      showHint(`${ev.name} spotted you — RUN!`);
    } else if (ev.type === 'caught') {
      endCaught(ev.name);
    }
  }
}

function update(dt) {
  game.time += dt;
  if (game.state === 'title') {
    // Attract mode: the garden lives behind the title, guards on patrol.
    for (const guard of game.guards) {
      guard.updatePatrol(dt, false, game.player, []);
    }
  }
  if (game.state !== 'playing') return;
  game.playTime += dt;

  const player = game.player;
  const events = [];
  player.update(dt, input, events);
  // The guards judge what the player looks like right now.
  player.lit = player.litByLamp(LAMPS);
  player.shadow = player.inShadow();

  for (const guard of game.guards) {
    guard.update(dt, player, events);
    if (game.state !== 'playing') break;
  }
  handleEvents(events);
  if (game.state !== 'playing') return;

  const taken = player.tryPickup(game.pearls);
  if (taken) {
    sounds.pickup();
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 70;
      game.particles.push({
        x: taken.x, y: taken.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        age: 0, life: 0.6 + Math.random() * 0.4,
      });
    }
    if (player.pearls === PEARLS_TO_WIN) showHint('All three pearls — reach the golden gate!');
  }

  if (player.onExit(EXIT_TILES)) {
    if (player.pearls >= PEARLS_TO_WIN) endWin();
    else if (game.hintTimer <= 0) showHint(`The gate needs all three moon pearls (${player.pearls}/3).`);
  }

  for (const ripple of game.ripples) ripple.age += dt;
  game.ripples = game.ripples.filter((r) => r.age < r.life);
  for (const p of game.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  game.particles = game.particles.filter((p) => p.age < p.life);
  if (game.hintTimer > 0) {
    game.hintTimer -= dt;
    if (game.hintTimer <= 0) hudHint.textContent = '';
  }
}

function updateHud() {
  const dots = game.pearls.map((p) => (p.taken ? '●' : '○')).join(' ');
  hudPearls.textContent = `Pearls ${dots} ${game.player.pearls}/3`;
  let alert = 'CALM';
  let alertClass = 'calm';
  for (const guard of game.guards) {
    if (guard.state === 'chase') {
      alert = 'ALARMED';
      alertClass = 'alarmed';
      break;
    }
    if (guard.suspicious || guard.meter >= 0.5) {
      alert = 'SUSPICIOUS';
      alertClass = 'suspicious';
    }
  }
  hudAlert.textContent = alert;
  hudAlert.className = alertClass;
  hudTimer.textContent = formatTime(game.playTime);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawWorld(ctx, game, game.time);
  updateHud();
  requestAnimationFrame(frame);
}

// --- input: keyboard -------------------------------------------------
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) {
    input[KEYMAP[e.code]] = true;
    e.preventDefault();
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = true;
  if (e.code === 'Enter' || e.code === 'Space') {
    if (game.state === 'title' || game.state === 'caught' || game.state === 'win') {
      startGame();
      e.preventDefault();
    }
  }
  if (e.code === 'KeyR' && game.state !== 'title') startGame();
});

window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = false;
});

// --- input: mouse ----------------------------------------------------
// Click the garden to walk there; click a button to start or retry.
canvas.addEventListener('click', (e) => {
  if (game.state !== 'playing') return;
  sounds.ensure();
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
  const y = ((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
  game.player.moveTarget = { x, y };
});

document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('retry-button').addEventListener('click', startGame);
document.getElementById('again-button').addEventListener('click', startGame);

// --- a small hook for playtesting from the console -------------------
window.MOONPEARL = {
  game,
  state: () => game.state,
  start: startGame,
  teleport: (x, y) => { game.player.x = x; game.player.y = y; game.player.moveTarget = null; },
  collectAll: () => { for (const p of game.pearls) p.taken = true; game.player.pearls = PEARLS_TO_WIN; },
  alarmNearest: () => {
    let best = null;
    let bestD = Infinity;
    for (const g of game.guards) {
      const d = Math.hypot(g.x - game.player.x, g.y - game.player.y);
      if (d < bestD) { bestD = d; best = g; }
    }
    if (best) { best.meter = 1; best.state = 'chase'; best.lastSeenX = game.player.x; best.lastSeenY = game.player.y; }
    return best ? best.name : null;
  },
};

canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;
requestAnimationFrame(frame);
