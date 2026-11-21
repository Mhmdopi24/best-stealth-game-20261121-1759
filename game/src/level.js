// The Moon Pearl — the manor garden level.
// One hand-designed garden, drawn as text so the layout is readable at a
// glance. Legend:
//   # stone wall / fountain block — stops movement and sight
//   H hedge — stops movement and sight
//   C crate — stops movement and sight
//   T tree — stops movement and sight
//   , shadow patch — dark floor, harder to be spotted here
//   . stone floor
//   P moon pearl (loot)
//   E garden gate (exit)
//   @ where the thief starts, in the south-west shadow
//
// The garden is split by a tall hedge wall down column 20 with two gaps,
// so the thief must choose when to cross while the centre guard patrols.

import { TILE, COLS, ROWS, LIGHT } from './config.js';

export const MAP = [
  '########################################',
  '#.,,,...............................EE.#',
  '#....T......T....,,,H..................#',
  '#.....HHH........,P,H..................#',
  '#.....HHH...........H..............P...#',
  '#.....HHH...........H..................#',
  '#............................,,,.......#',
  '#............................,,,.......#',
];

// The rest of the garden: the west pearl nook, the fountain plaza, the
// north-east hedge, and the two gaps in the central hedge wall.
export const MAP_REST = [
  '#...................H..................#',
  '#...................H..................#',
  '#...P.......CC......H......##..........#',
  '#...................H......##..........#',
  '#...................H.........CC.HHH...#',
  '#...................H............HHH...#',
  '#......................................#',
  '#......................................#',
];

// The south rows: the second hedge gap, the south hedge block, the
// south-west shadow where the thief starts, and the south-east shadow.
export const MAP_SOUTH = [
  '#.........HHH.......H..................#',
  '#.........HHH.......H............C.....#',
  '#.,,,,....HHH.......H...T.........,,,,.#',
  '#.,@,,..............H...T.........,,,,.#',
  '#.,,,,..............H.............,,,,.#',
  '########################################',
];

// The whole garden, north to south.
export const FULL_MAP = [...MAP, ...MAP_REST, ...MAP_SOUTH];

// Tiles that stop movement and block a guard's line of sight.
const BLOCKERS = new Set(['#', 'H', 'C', 'T']);

export function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return FULL_MAP[row][col];
}

export function tileAtPixel(x, y) {
  return tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
}

export function isBlocking(col, row) {
  return BLOCKERS.has(tileAt(col, row));
}

export function isBlockingAtPixel(x, y) {
  return BLOCKERS.has(tileAtPixel(x, y));
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

// The thief's start, the pearls and the gate, read from the map text.
function findAll(ch) {
  const found = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (FULL_MAP[row][col] === ch) found.push([col, row]);
    }
  }
  return found;
}

export const PLAYER_START = (() => {
  const [c, r] = findAll('@')[0];
  return tileCenter(c, r);
})();

export function freshPearls() {
  return findAll('P').map(([c, r]) => {
    const p = tileCenter(c, r);
    return { x: p.x, y: p.y, col: c, row: r, taken: false, bob: Math.random() * Math.PI * 2 };
  });
}

export const EXIT_TILES = findAll('E');

// Lamp posts: warm pools of light where the thief is easy to spot.
export const LAMPS = [
  [10, 3],
  [25, 5],
  [33, 8],
  [16, 10],
  [8, 18],
  [36, 16],
].map(([c, r]) => {
  const p = tileCenter(c, r);
  return { x: p.x, y: p.y, radius: LIGHT.lampRadius, flicker: Math.random() * Math.PI * 2 };
});

// The four watchmen and the loops they walk, in tile coordinates.
export const GUARD_DEFS = [
  { name: 'Bramble', waypoints: [[3, 8], [9, 8], [9, 13], [3, 13]] },
  { name: 'Thorn', waypoints: [[17, 4], [17, 15], [19, 15], [19, 4]] },
  { name: 'Rowan', waypoints: [[28, 3], [37, 3], [37, 9], [28, 9]] },
  { name: 'Wren', waypoints: [[26, 14], [37, 14], [37, 19], [26, 19]] },
];

// True when no wall, hedge, crate or tree stands between two points.
// Samples the segment every few pixels; cheap and exact enough for a cone.
export function hasLineOfSight(x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isBlockingAtPixel(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

// How far a ray from (x, y) in direction (dx, dy) travels before it hits
// something that blocks sight. Used to draw a cone that hedges cut short.
export function rayDistance(x, y, dx, dy, maxDist) {
  let d = 0;
  while (d < maxDist) {
    d += 6;
    if (isBlockingAtPixel(x + dx * d, y + dy * d)) return d;
  }
  return maxDist;
}

// True while a point stands inside any lamp's pool of light.
export function isLit(x, y) {
  for (const lamp of LAMPS) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy < lamp.radius * lamp.radius) return true;
  }
  return false;
}
