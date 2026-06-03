export class AudioManager {
  constructor(settings) {
    this.context    = null;
    this.master     = null;
    this.muted      = false;
    this.soundVolume = settings.soundVolume;
    this.musicVolume = settings.musicVolume;

    // Node references (created lazily on first click)
    this._engine   = null;
    this._turbo    = null;
    this._tire     = null;
    this._music    = null;
    this._crash    = null;
  }

  // Call once user interacts (browser autoplay policy)
  resume() {
    if (!this.context) this._createGraph();
    if (this.context.state === "suspended") this.context.resume();
  }

  _createGraph() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.context = new AC();

    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : this.soundVolume;
    this.master.connect(this.context.destination);

    // ── Engine (3 oscillator layers + band-pass filter) ───────────────────────
    this._engine = this._createEngine();

    // ── Turbo whine ───────────────────────────────────────────────────────────
    this._turbo = this._createTurboLayer();

    // ── Tire screech (filtered noise) ─────────────────────────────────────────
    this._tire = this._createNoiseLayer(800, 1800, 0);

    // ── Ambient music (layered pads) ──────────────────────────────────────────
    this._music = this._createMusicLayer();
  }

  // ── Engine: fundamental + 2nd + 3rd harmonic, slight detune for richness ──
  _createEngine() {
    const t   = this.context;
    const grp = { oscs: [], gains: [], filter: null, masterGain: null };

    const masterGain = t.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(this.master);
    grp.masterGain = masterGain;

    const filter = t.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.7;
    filter.connect(masterGain);
    grp.filter = filter;

    // Layer config: [type, detune, gain]
    const layers = [
      ["sawtooth",  0,    0.55],
      ["sawtooth",  7,    0.28],
      ["square",   -5,    0.12],
    ];

    for (const [type, detune, g] of layers) {
      const osc  = t.createOscillator();
      const gain = t.createGain();
      osc.type  = type;
      osc.detune.value = detune;
      gain.gain.value  = g;
      osc.connect(gain).connect(filter);
      osc.start();
      grp.oscs.push(osc);
      grp.gains.push(gain);
    }
    return grp;
  }

  // ── Turbo whine: rising sine + flutter oscillation ────────────────────────
  _createTurboLayer() {
    const t      = this.context;
    const osc    = t.createOscillator();
    const gain   = t.createGain();
    const flutter = t.createOscillator();  // amplitude flutter
    const fGain  = t.createGain();

    osc.type           = "sine";
    osc.frequency.value = 300;
    flutter.frequency.value = 18;
    flutter.type        = "sine";
    fGain.gain.value    = 0.04;

    flutter.connect(fGain);
    // fGain → gain.gain (amplitude modulation via AudioParam)
    fGain.connect(gain.gain);

    gain.gain.value = 0;
    osc.connect(gain).connect(this.master);
    osc.start();
    flutter.start();

    return { osc, gain };
  }

  // ── Noise layer (tire screech, crash) ─────────────────────────────────────
  _createNoiseLayer(lowFreq, highFreq, initialGain) {
    const t       = this.context;
    const bufSize = t.sampleRate * 2;
    const buf     = t.createBuffer(1, bufSize, t.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = t.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const filter = t.createBiquadFilter();
    filter.type            = "bandpass";
    filter.frequency.value = (lowFreq + highFreq) / 2;
    filter.Q.value         = 0.8;

    const gain = t.createGain();
    gain.gain.value = initialGain;

    src.connect(filter).connect(gain).connect(this.master);
    src.start();

    return { source: src, filter, gain };
  }

  // ── Ambient music: bass pad + mid pad + gentle arpeggiation ───────────────
  _createMusicLayer() {
    const t    = this.context;
    const out  = t.createGain();
    out.gain.value = this.musicVolume * 0.06;

    const reverb = t.createConvolver();
    // Fake impulse response for reverb
    const irBuf = t.createBuffer(2, t.sampleRate * 2, t.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
    }
    reverb.buffer = irBuf;
    reverb.connect(out).connect(this.master);

    const notes = [55, 82.4, 110, 123.5]; // A1 E2 A2 B2
    const oscs = [];
    for (const freq of notes) {
      const osc  = t.createOscillator();
      const gain = t.createGain();
      osc.type           = "triangle";
      osc.frequency.value = freq;
      gain.gain.value     = 0.06;
      osc.connect(gain).connect(reverb);
      osc.start();
      oscs.push({ osc, gain });
    }

    // Simple 4-beat pulse for rhythm feel
    let beat = 0;
    const bpm = 128;
    const beatMs = (60 / bpm) * 1000;
    const pulse = () => {
      if (!this.context || this.muted) return;
      const activeNote = oscs[beat % oscs.length];
      const g = activeNote.gain;
      const ct = this.context.currentTime;
      g.gain.setValueAtTime(0.12, ct);
      g.gain.exponentialRampToValueAtTime(0.04, ct + 0.3);
      beat++;
    };
    this._musicInterval = setInterval(pulse, beatMs);

    return { oscs, out };
  }

  applySettings(settings) {
    this.soundVolume = settings.soundVolume;
    this.musicVolume = settings.musicVolume;
    if (this.master) this.master.gain.value = this.muted ? 0 : settings.soundVolume;
    if (this._music) this._music.out.gain.value = settings.musicVolume * 0.06;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.soundVolume;
  }

  update(car, input) {
    if (!this.context || !this._engine) return;
    const t       = this.context.currentTime;
    const speedMs = Math.abs(car.speed);
    const speedKmh = speedMs * 3.6;

    // ── Engine frequency follows RPM ──────────────────────────────────────────
    // Gear shift produces momentary RPM drop
    const baseFreq = 65 + car.rpm * 210 + speedKmh * 0.18;
    const throttle = input.has("KeyW") || input.has("ArrowUp");
    const engVol   = 0.022 + Math.min(0.11, speedKmh / 2000) + (throttle ? 0.018 : 0);

    for (const osc of this._engine.oscs) {
      osc.frequency.setTargetAtTime(baseFreq * (osc.type === "square" ? 0.5 : 1), t, 0.035);
    }
    this._engine.masterGain.gain.setTargetAtTime(engVol, t, 0.05);
    this._engine.filter.frequency.setTargetAtTime(200 + speedKmh * 3, t, 0.08);

    // ── Turbo ─────────────────────────────────────────────────────────────────
    const turboFreq = car.turboActive ? 720 + speedKmh * 2.8 : 260;
    const turboVol  = car.turboActive ? 0.08 : 0;
    this._turbo.osc.frequency.setTargetAtTime(turboFreq, t, 0.025);
    this._turbo.gain.gain.setTargetAtTime(turboVol, t, 0.04);

    // Turbo flutter on lift-off
    if (!car.turboActive && car._prevTurboActive) {
      this._turboFlutter(t);
    }
    car._prevTurboActive = car.turboActive;

    // ── Tire screech ──────────────────────────────────────────────────────────
    const tireVol  = car.drifting ? 0.055 : (car._wallHit ? 0.04 : 0);
    const tireFreq = car.drifting ? 1200 : 900;
    this._tire.gain.gain.setTargetAtTime(tireVol, t, 0.04);
    this._tire.filter.frequency.setTargetAtTime(tireFreq, t, 0.03);
  }

  _turboFlutter(t) {
    if (!this._turbo) return;
    // Quick frequency flutter then settle
    this._turbo.osc.frequency.setValueAtTime(580, t);
    this._turbo.osc.frequency.linearRampToValueAtTime(320, t + 0.18);
    this._turbo.gain.gain.setValueAtTime(0.055, t);
    this._turbo.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  }

  playCrash(amount = 1) {
    if (!this.context) return;
    const sr     = this.context.sampleRate;
    const len    = sr * 0.38;
    const buf    = this.context.createBuffer(1, len, sr);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.2);
    }
    const src  = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = 0.32 * amount;
    src.buffer = buf;
    src.connect(gain).connect(this.master);
    src.start();
  }

  destroy() {
    clearInterval(this._musicInterval);
    this.context?.close();
  }
}
