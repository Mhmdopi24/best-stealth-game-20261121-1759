// The Moon Pearl — the guards.
// Four watchmen on fixed patrol loops the player can learn. Each guard
// carries a vision cone that walls and hedges block, a detection meter
// that fills while the thief is seen, and a small state machine:
// patrol -> suspicious -> alarmed (chase) -> investigate -> patrol.
// Breaking sight is always a chance to recover.

import { GUARD, LIGHT, TILE } from './config.js';
import { isBlockingAtPixel, hasLineOfSight, tileCenter } from './level.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  INVESTIGATE: 'investigate',
};

// A guard the renderer can read without knowing the state machine.
export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints.map(([c, r]) => tileCenter(c, r));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.nextWaypoint = 1 % this.waypoints.length;
    this.dirX = 1;
    this.dirY = 0;
    this.state = GUARD_STATES.PATROL;
    this.meter = 0; // 0 unseen, 1 fully alarmed
    this.suspicious = false; // meter crossed the "?" line
    this.lastSeenX = this.x;
    this.lastSeenY = this.y;
    this.loseSightTimer = 0;
    this.investigateTimer = 0;
    this.scanTimer = 0; // pauses and looks around while investigating
    this.stepAccum = 0;
    this.paused = 0; // brief halt when something first catches the eye
  }

  reset() {
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.nextWaypoint = 1 % this.waypoints.length;
    this.dirX = 1;
    this.dirY = 0;
    this.state = GUARD_STATES.PATROL;
    this.meter = 0;
    this.suspicious = false;
    this.loseSightTimer = 0;
    this.investigateTimer = 0;
    this.scanTimer = 0;
    this.stepAccum = 0;
    this.paused = 0;
  }

  // True when the thief is inside the cone with a clear line of sight.
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.visionRange) return false;
    const facing = Math.atan2(this.dirY, this.dirX);
    const toPlayer = Math.atan2(dy, dx);
    let diff = Math.abs(toPlayer - facing);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > GUARD.visionHalfAngle) return false;
    return hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  // How fast the meter fills while the thief is seen right now.
  detectionRate(player, dist) {
    const closeness = 1 - dist / (GUARD.visionRange * 1.15);
    let rate = GUARD.detectBase * (0.35 + 0.65 * Math.max(0, closeness));
    if (player.sneaking) rate *= LIGHT.sneakMultiplier;
    if (player.running) rate *= LIGHT.runMultiplier;
    if (player.lit) rate *= LIGHT.litMultiplier;
    if (player.shadow) rate *= LIGHT.shadowMultiplier;
    return rate;
  }

  update(dt, player, events) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const sees = this.canSee(player);
    const hearsRunning = !sees && player.running &&
      dist < GUARD.hearingRadius;

    if (sees) {
      this.lastSeenX = player.x;
      this.lastSeenY = player.y;
      this.loseSightTimer = 0;
      const before = this.meter;
      this.meter = Math.min(GUARD.alarmAt, this.meter + this.detectionRate(player, dist) * dt);
      if (before < GUARD.suspiciousAt && this.meter >= GUARD.suspiciousAt) {
        this.suspicious = true;
        this.paused = 0.45; // the guard stops, turns, looks hard
        events.push({ type: 'suspicious', x: this.x, y: this.y, name: this.name });
      }
      if (before < GUARD.alarmAt && this.meter >= GUARD.alarmAt) {
        this.state = GUARD_STATES.CHASE;
        events.push({ type: 'alarm', x: this.x, y: this.y, name: this.name });
      }
    } else if (hearsRunning) {
      this.meter = Math.min(GUARD.alarmAt, this.meter + GUARD.hearFill * dt);
      this.lastSeenX = player.x;
      this.lastSeenY = player.y;
      if (this.meter >= GUARD.suspiciousAt && !this.suspicious) {
        this.suspicious = true;
        events.push({ type: 'suspicious', x: this.x, y: this.y, name: this.name });
      }
    } else {
      this.meter = Math.max(0, this.meter - GUARD.detectDrain * dt);
      if (this.meter < GUARD.suspiciousAt) this.suspicious = false;
    }

    if (this.paused > 0) {
      this.paused -= dt;
      if (sees) this.faceToward(player.x, player.y);
      return;
    }

    if (this.state === GUARD_STATES.CHASE) {
      this.updateChase(dt, player, sees, events);
    } else if (this.state === GUARD_STATES.INVESTIGATE) {
      this.updateInvestigate(dt, events);
    } else {
      this.updatePatrol(dt, sees, player, events);
    }
  }

  updatePatrol(dt, sees, player, events) {
    if (sees && this.suspicious) {
      // Suspicious: stop walking and watch the thief.
      this.faceToward(player.x, player.y);
      return;
    }
    const target = this.waypoints[this.nextWaypoint];
    const arrived = this.moveToward(target.x, target.y, GUARD.patrolSpeed, dt, events);
    if (arrived) this.nextWaypoint = (this.nextWaypoint + 1) % this.waypoints.length;
  }

  updateChase(dt, player, sees, events) {
    if (!sees) {
      this.loseSightTimer += dt;
      if (this.loseSightTimer >= GUARD.loseSightTime) {
        this.state = GUARD_STATES.INVESTIGATE;
        this.investigateTimer = GUARD.investigateTime;
        this.scanTimer = 0;
        return;
      }
    }
    // Chase the last seen spot; a fresh sighting updates it every frame.
    this.moveToward(this.lastSeenX, this.lastSeenY, GUARD.chaseSpeed, dt, events);
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    if (d < GUARD.catchRadius) {
      events.push({ type: 'caught', x: this.x, y: this.y, name: this.name });
    }
  }

  updateInvestigate(dt, events) {
    const arrived = this.moveToward(this.lastSeenX, this.lastSeenY, GUARD.investigateSpeed, dt, events);
    if (arrived) {
      this.investigateTimer -= dt;
      this.scanTimer += dt;
      // Look around while searching the spot.
      const angle = this.scanTimer * 2.4;
      this.dirX = Math.cos(angle);
      this.dirY = Math.sin(angle);
      if (this.investigateTimer <= 0) {
        this.state = GUARD_STATES.PATROL;
        this.meter = 0;
        this.suspicious = false;
      }
    }
  }

  faceToward(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      this.dirX = dx / len;
      this.dirY = dy / len;
    }
  }

  // Walk toward a point, sliding along walls. Returns true on arrival.
  moveToward(tx, ty, speed, dt, events) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(dist, speed * dt);
    const nx = (dx / dist) * step;
    const ny = (dy / dist) * step;
    this.dirX = dx / dist;
    this.dirY = dy / dist;
    const r = GUARD.radius;
    if (!isBlockingAtPixel(this.x + nx - r, this.y - r) && !isBlockingAtPixel(this.x + nx + r, this.y - r) &&
        !isBlockingAtPixel(this.x + nx - r, this.y + r) && !isBlockingAtPixel(this.x + nx + r, this.y + r)) {
      this.x += nx;
    }
    if (!isBlockingAtPixel(this.x - r, this.y + ny - r) && !isBlockingAtPixel(this.x + r, this.y + ny - r) &&
        !isBlockingAtPixel(this.x - r, this.y + ny + r) && !isBlockingAtPixel(this.x + r, this.y + ny + r)) {
      this.y += ny;
    }
    this.stepAccum += step;
    if (this.stepAccum >= GUARD.stepDistance) {
      this.stepAccum = 0;
      events.push({ type: 'guardStep', x: this.x, y: this.y, state: this.state });
    }
    return Math.hypot(tx - this.x, ty - this.y) < 5;
  }
}
