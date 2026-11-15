// Synthesized sound for CINDERWAKE: every effect is a WebAudio oscillator
// or a short noise burst, built at run time. No audio files, no network.
// The context is created lazily on the first user gesture, and every call
// is guarded so a headless run without audio never throws.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  _tone(freq, dur, type = 'sine', volume = 1, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Sound is garnish; a failure must never break the game.
    }
  }

  _noise(dur, volume = 1, lowpass = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch {
      // Ignore audio failures.
    }
  }

  shoot() { this._tone(720, 0.07, 'square', 0.35, 320); }
  hit() { this._tone(190, 0.05, 'triangle', 0.4, 120); }
  kill() { this._noise(0.16, 0.7, 900); this._tone(320, 0.14, 'sawtooth', 0.3, 60); }
  pickup() { this._tone(980, 0.08, 'sine', 0.4, 1560); }
  hurt() { this._tone(140, 0.18, 'sawtooth', 0.55, 70); }
  forgeHit() { this._tone(110, 0.12, 'square', 0.35, 80); }
  waveStart() { this._tone(220, 0.16, 'triangle', 0.5, 440); this._tone(440, 0.2, 'triangle', 0.4, 660, 0.12); }
  upgrade() { this._tone(523, 0.1, 'sine', 0.5); this._tone(784, 0.14, 'sine', 0.5, null, 0.09); this._tone(1046, 0.2, 'sine', 0.45, null, 0.18); }
  click() { this._tone(660, 0.05, 'sine', 0.35); }
  gameOver() { this._tone(330, 0.3, 'sawtooth', 0.5, 110); this._tone(220, 0.5, 'sawtooth', 0.45, 55, 0.25); }
  victory() {
    [523, 659, 784, 1046].forEach((freq, i) => this._tone(freq, 0.22, 'triangle', 0.5, null, i * 0.13));
  }
}
