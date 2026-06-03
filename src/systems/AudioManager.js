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
    this._patrolTexture = null;
    this._tire     = null;
    this._music    = null;
    this._crash    = null;
    this._lastGear = null;
    this._lastThrottle = false;
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
    this._patrolTexture = this._createPatrolTextureLayer();

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
    const grp = { oscs: [], gains: [], filter: null, masterGain: null, idleLfo: null, idleLfoDepth: null };

    const masterGain = t.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(this.master);
    grp.masterGain = masterGain;

    const drive = t.createWaveShaper();
    drive.curve = this._makeDriveCurve(1.8);
    drive.oversample = "2x";

    const filter = t.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.9;
    filter.connect(masterGain);
    grp.filter = filter;
    drive.connect(filter);

    const idleLfo = t.createOscillator();
    const idleLfoDepth = t.createGain();
    idleLfo.type = "sine";
    idleLfo.frequency.value = 11;
    idleLfoDepth.gain.value = 0.006;
    idleLfo.connect(idleLfoDepth).connect(masterGain.gain);
    idleLfo.start();
    grp.idleLfo = idleLfo;
    grp.idleLfoDepth = idleLfoDepth;

    const layers = [
      { type: "triangle", harmonic: 0.33, detune: -7, gain: 0.26 },
      { type: "sawtooth", harmonic: 0.50, detune: -3, gain: 0.32 },
      { type: "sawtooth", harmonic: 1.00, detune:  0, gain: 0.42 },
      { type: "square",   harmonic: 1.50, detune:  5, gain: 0.11 },
      { type: "sine",     harmonic: 2.00, detune:  8, gain: 0.06 },
    ];

    for (const layer of layers) {
      const osc  = t.createOscillator();
      const gain = t.createGain();
      osc.type  = layer.type;
      osc.detune.value = layer.detune;
      osc.userData = { harmonic: layer.harmonic };
      gain.gain.value  = layer.gain;
      osc.connect(gain).connect(drive);
      osc.start();
      grp.oscs.push(osc);
      grp.gains.push(gain);
    }
    return grp;
  }

  _makeDriveCurve(amount = 1) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    return curve;
  }

  _createPatrolTextureLayer() {
    const t = this.context;
    const bufferSeconds = 2;
    const buf = t.createBuffer(1, t.sampleRate * bufferSeconds, t.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = t.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const exhaustFilter = t.createBiquadFilter();
    exhaustFilter.type = "lowpass";
    exhaustFilter.frequency.value = 130;
    exhaustFilter.Q.value = 1.2;

    const exhaustGain = t.createGain();
    exhaustGain.gain.value = 0;

    const intakeFilter = t.createBiquadFilter();
    intakeFilter.type = "bandpass";
    intakeFilter.frequency.value = 950;
    intakeFilter.Q.value = 1.8;

    const intakeGain = t.createGain();
    intakeGain.gain.value = 0;

    noise.connect(exhaustFilter).connect(exhaustGain).connect(this.master);
    noise.connect(intakeFilter).connect(intakeGain).connect(this.master);
    noise.start();

    return { noise, exhaustFilter, exhaustGain, intakeFilter, intakeGain };
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
    const throttle = input.has("KeyW") || input.has("ArrowUp");
    const load = throttle ? 1 : car.turboActive ? 0.75 : 0.32;
    const rpm = Math.max(0.08, car.rpm);
    const baseFreq = 36 + rpm * 145 + speedKmh * 0.08;
    const engVol = 0.026 + rpm * 0.035 + load * 0.034 + Math.min(0.025, speedKmh / 3600);

    for (const osc of this._engine.oscs) {
      const harmonic = osc.userData?.harmonic ?? 1;
      const turboPitch = car.turboActive ? 1.045 : 1;
      osc.frequency.setTargetAtTime(baseFreq * harmonic * turboPitch, t, 0.035);
    }
    this._engine.masterGain.gain.setTargetAtTime(engVol, t, 0.05);
    this._engine.filter.frequency.setTargetAtTime(520 + rpm * 1700 + load * 360, t, 0.08);
    this._engine.filter.Q.setTargetAtTime(0.85 + load * 0.45, t, 0.08);
    this._engine.idleLfo.frequency.setTargetAtTime(8 + rpm * 25, t, 0.12);
    this._engine.idleLfoDepth.gain.setTargetAtTime(0.004 + (1 - rpm) * 0.009, t, 0.12);

    if (this._patrolTexture) {
      const exhaustVol = 0.012 + rpm * 0.026 + load * 0.038 + (car.drifting ? 0.018 : 0);
      const intakeVol = throttle ? 0.012 + rpm * 0.035 + (car.turboActive ? 0.018 : 0) : 0.002;
      this._patrolTexture.exhaustGain.gain.setTargetAtTime(exhaustVol, t, 0.055);
      this._patrolTexture.exhaustFilter.frequency.setTargetAtTime(105 + rpm * 260 + load * 80, t, 0.08);
      this._patrolTexture.intakeGain.gain.setTargetAtTime(intakeVol, t, 0.045);
      this._patrolTexture.intakeFilter.frequency.setTargetAtTime(620 + rpm * 1250 + speedKmh * 1.2, t, 0.04);
    }

    if (this._lastGear !== null && car.gear > 0 && car.gear !== this._lastGear && speedKmh > 18) {
      this._gearShiftBlip(t, rpm);
    }
    this._lastGear = car.gear;

    if (!throttle && this._lastThrottle && speedKmh > 28) {
      this._exhaustBurble(t, Math.min(1, speedKmh / 130));
    }
    this._lastThrottle = throttle;

    // ── Turbo ─────────────────────────────────────────────────────────────────
    const turboFreq = car.turboActive ? 580 + speedKmh * 2.35 + rpm * 260 : 240;
    const turboVol  = car.turboActive ? 0.055 + rpm * 0.025 : 0;
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

  _gearShiftBlip(t, rpm = 0.5) {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(96 + rpm * 135, t);
    osc.frequency.exponentialRampToValueAtTime(72 + rpm * 95, t + 0.11);

    filter.type = "lowpass";
    filter.frequency.value = 650 + rpm * 900;
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.075, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  _exhaustBurble(t, strength = 0.6) {
    if (!this.context) return;
    for (let i = 0; i < 3; i++) {
      const start = t + i * 0.07;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();

      osc.type = i % 2 ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(54 + Math.random() * 26, start);
      filter.type = "lowpass";
      filter.frequency.value = 180 + Math.random() * 120;
      filter.Q.value = 1.6;

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.028 * strength, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.075);

      osc.connect(filter).connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.09);
    }
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
