// The Moon Pearl — tuning constants for the whole game.
// One place holds every number a designer would tweak: speeds, sight,
// detection rates, light, and the palette. Nothing here loads anything.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 22;
export const WORLD_WIDTH = TILE * COLS; // 1280
export const WORLD_HEIGHT = TILE * ROWS; // 704

export const PLAYER = {
  radius: 11,
  runSpeed: 150, // pixels per second, upright and quick
  sneakSpeed: 78, // pixels per second, crouched and quiet
  pickupRadius: 22, // walk this close to a pearl to take it
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 55,
  chaseSpeed: 168, // a touch faster than the player's run
  investigateSpeed: 95,
  visionRange: 185, // how far a guard can see, in pixels
  visionHalfAngle: 0.62, // radians, about 35 degrees either side of facing
  catchRadius: 24, // an alarmed guard this close catches the thief
  hearingRadius: 95, // running footsteps heard inside this range
  hearFill: 0.28, // detection gained per second while heard but unseen
  detectBase: 0.62, // detection gained per second at point blank, in the open
  detectDrain: 0.38, // detection lost per second while unseen
  suspiciousAt: 0.5, // meter level where the guard turns and shows "?"
  alarmAt: 1.0, // meter level where the guard gives chase
  loseSightTime: 2.5, // seconds of no sight while alarmed before investigating
  investigateTime: 2.2, // seconds spent looking around the last seen spot
  stepDistance: 46, // pixels walked between footstep ripples
};

export const LIGHT = {
  lampRadius: 125, // pixels of warm light around each lamp post
  litMultiplier: 1.55, // detection speed while standing in lamplight
  shadowMultiplier: 0.55, // detection speed while standing in shadow
  sneakMultiplier: 0.5, // detection speed while sneaking
  runMultiplier: 1.25, // detection speed while running upright
};

export const COLORS = {
  floorA: '#3a3f4d',
  floorB: '#343947',
  floorLine: '#2c3040',
  shadowFloor: '#232838',
  wallTop: '#5d6478',
  wallSide: '#3c4152',
  hedge: '#2c4a2e',
  hedgeLight: '#3f6b35',
  crate: '#6b5232',
  crateEdge: '#8a6a42',
  treeTrunk: '#4a3524',
  treeTop: '#274d2a',
  treeTopLight: '#356636',
  lampGlow: '#ffd27a',
  lampPost: '#22242e',
  pearl: '#cfe8ff',
  pearlCore: '#ffffff',
  exitGold: '#e8b64c',
  exitArch: '#8a6a2f',
  guardBody: '#7a2e2e',
  guardTrim: '#c9a24d',
  guardCone: 'rgba(255, 214, 90, 0.20)',
  guardConeEdge: 'rgba(255, 214, 90, 0.45)',
  alarmCone: 'rgba(255, 70, 60, 0.26)',
  alarmConeEdge: 'rgba(255, 70, 60, 0.55)',
  playerCloak: '#2b2f6b',
  playerHood: '#3d4391',
  playerSkin: '#e8c39a',
  night: 'rgba(8, 10, 26, 0.34)',
  ripple: 'rgba(190, 205, 255, 0.5)',
};
