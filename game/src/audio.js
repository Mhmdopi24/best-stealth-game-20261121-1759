// The Moon Pearl — every sound, synthesized, no audio files.
// A small WebAudio bank: a chime for a pearl, a low sting for the alarm,
// a soft blip for suspicion, quiet ticks for footsteps, and short tunes
// for winning and being caught. The context is created on the first
// gesture, so the game never plays sound before the player has acted.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  // One oscillator note with a quick attack and an exponential decay.
  note(freq, startAt, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + startAt;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  pickup() {
    this.note(880, 0, 0.35, 'sine', 0.25);
    this.note(1318.5, 0.09, 0.45, 'sine', 0.22);
  }

  suspicious() {
    this.note(659, 0, 0.18, 'triangle', 0.2);
    this.note(659, 0.12, 0.18, 'triangle', 0.14);
  }

  alarm() {
    this.note(110, 0, 0.55, 'sawtooth', 0.22);
    this.note(164.8, 0.08, 0.55, 'sawtooth', 0.18);
    this.note(220, 0.16, 0.4, 'sawtooth', 0.12);
  }

  footstep(distance01) {
    // distance01 is 0 beside the player, 1 at the edge of hearing.
    const vol = 0.12 * (1 - distance01);
    if (vol <= 0.01) return;
    this.note(95 + Math.random() * 20, 0, 0.07, 'sine', vol);
  }

  playerStep() {
    this.note(80, 0, 0.05, 'sine', 0.05);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.note(f, i * 0.13, 0.5, 'sine', 0.22));
  }

  caught() {
    this.note(392, 0, 0.3, 'triangle', 0.2);
    this.note(311.1, 0.22, 0.35, 'triangle', 0.2);
    this.note(233.1, 0.48, 0.6, 'triangle', 0.22);
  }

  click() {
    this.note(520, 0, 0.08, 'sine', 0.12);
  }
}
