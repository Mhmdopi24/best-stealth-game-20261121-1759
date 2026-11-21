// The Moon Pearl — the thief.
// Movement, sneaking, noise and pearl pickup. The player never knows the
// guards' code; it only reports where it is, how fast it moves and how
// loud that is, and the guards react to that.

import { PLAYER, TILE } from './config.js';
import { isBlockingAtPixel, tileAtPixel } from './level.js';

export class Player {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.radius = PLAYER.radius;
    this.dirX = 0;
    this.dirY = -1;
    this.moving = false;
    this.sneaking = false;
    this.running = false; // upright and fast: loud, easy to spot
    this.moveTarget = null; // { x, y } while click-to-move is active
    this.stepAccum = 0; // distance walked since the last footstep ripple
    this.pearls = 0;
  }

  reset(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.dirX = 0;
    this.dirY = -1;
    this.moving = false;
    this.sneaking = false;
    this.running = false;
    this.moveTarget = null;
    this.stepAccum = 0;
    this.pearls = 0;
  }

  // How loud this step is, 0 when sneaking or still, 1 when running.
  noiseLevel() {
    if (!this.moving) return 0;
    return this.sneaking ? 0.15 : 1;
  }

  update(dt, input, events) {
    let vx = 0;
    let vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    // A click sets a walk target; any arrow or WASD key takes over from it.
    if (vx === 0 && vy === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.moveTarget = null;
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    } else if (vx !== 0 || vy !== 0) {
      this.moveTarget = null;
    }

    const len = Math.hypot(vx, vy);
    this.moving = len > 0;
    this.sneaking = Boolean(input.sneak) && this.moving;
    this.running = this.moving && !this.sneaking;
    if (this.moving) {
      vx /= len;
      vy /= len;
      this.dirX = vx;
      this.dirY = vy;
    }

    const speed = this.sneaking ? PLAYER.sneakSpeed : PLAYER.runSpeed;
    const stepX = vx * speed * dt;
    const stepY = vy * speed * dt;
    this.moveWithCollision(stepX, stepY);

    if (this.moving) {
      this.stepAccum += Math.hypot(stepX, stepY);
      const stride = this.sneaking ? 34 : 44;
      if (this.stepAccum >= stride) {
        this.stepAccum = 0;
        events.push({ type: 'playerStep', x: this.x, y: this.y, loud: this.running });
      }
    }
  }

  // Move one axis at a time so the thief slides along walls instead of
  // sticking on their corners.
  moveWithCollision(dx, dy) {
    const r = this.radius;
    const nx = this.x + dx;
    if (!isBlockingAtPixel(nx - r, this.y - r) && !isBlockingAtPixel(nx + r, this.y - r) &&
        !isBlockingAtPixel(nx - r, this.y + r) && !isBlockingAtPixel(nx + r, this.y + r)) {
      this.x = nx;
    }
    const ny = this.y + dy;
    if (!isBlockingAtPixel(this.x - r, ny - r) && !isBlockingAtPixel(this.x + r, ny - r) &&
        !isBlockingAtPixel(this.x - r, ny + r) && !isBlockingAtPixel(this.x + r, ny + r)) {
      this.y = ny;
    }
  }

  // True while standing on a shadow tile.
  inShadow() {
    return tileAtPixel(this.x, this.y) === ',';
  }

  // True while standing inside a lamp's warm pool of light.
  litByLamp(lamps) {
    for (const lamp of lamps) {
      const dx = this.x - lamp.x;
      const dy = this.y - lamp.y;
      if (dx * dx + dy * dy < lamp.radius * lamp.radius) return true;
    }
    return false;
  }

  // Pick up any pearl within reach. Returns the pearl taken, or null.
  tryPickup(pearls) {
    for (const pearl of pearls) {
      if (pearl.taken) continue;
      const dx = pearl.x - this.x;
      const dy = pearl.y - this.y;
      if (dx * dx + dy * dy < PLAYER.pickupRadius * PLAYER.pickupRadius) {
        pearl.taken = true;
        this.pearls += 1;
        return pearl;
      }
    }
    return null;
  }

  // True while standing on the garden gate.
  onExit(exitTiles) {
    const col = Math.floor(this.x / TILE);
    const row = Math.floor(this.y / TILE);
    return exitTiles.some(([c, r]) => c === col && r === row);
  }
}
