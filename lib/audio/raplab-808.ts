export const BEAT_INSTRUMENTS = ["kick", "snare", "hat", "bass"] as const;
export type BeatInstrument = (typeof BEAT_INSTRUMENTS)[number];

export const BEAT_STEPS = 8;
export const MIN_BPM = 70;
export const MAX_BPM = 160;

export type BeatPattern = Record<BeatInstrument, boolean[]>;

export const DEFAULT_BEAT_PATTERN: BeatPattern = {
  kick: [true, false, false, false, true, false, true, false],
  snare: [false, false, true, false, false, false, true, false],
  hat: [true, true, true, true, true, true, true, true],
  bass: [true, false, false, true, false, true, false, false],
};

export type PersistedBeatState = {
  bpm: number;
  volume: number;
  pattern: BeatPattern;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cloneDefaultPattern(): BeatPattern {
  return Object.fromEntries(
    BEAT_INSTRUMENTS.map((instrument) => [instrument, [...DEFAULT_BEAT_PATTERN[instrument]]])
  ) as BeatPattern;
}

export function emptyBeatPattern(): BeatPattern {
  return Object.fromEntries(
    BEAT_INSTRUMENTS.map((instrument) => [instrument, Array(BEAT_STEPS).fill(false)])
  ) as BeatPattern;
}

export function normalizeBeatState(value: unknown): PersistedBeatState {
  const fallback: PersistedBeatState = {
    bpm: 104,
    volume: 0.72,
    pattern: cloneDefaultPattern(),
  };

  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<PersistedBeatState>;
  const bpm = typeof candidate.bpm === "number" ? clamp(Math.round(candidate.bpm), MIN_BPM, MAX_BPM) : fallback.bpm;
  const volume = typeof candidate.volume === "number" ? clamp(candidate.volume, 0, 1) : fallback.volume;
  const pattern = cloneDefaultPattern();

  if (candidate.pattern && typeof candidate.pattern === "object") {
    for (const instrument of BEAT_INSTRUMENTS) {
      const row = candidate.pattern[instrument];
      if (Array.isArray(row) && row.length === BEAT_STEPS) {
        pattern[instrument] = row.map(Boolean);
      }
    }
  }

  return { bpm, volume, pattern };
}

export function stepDurationSeconds(bpm: number) {
  return 60 / clamp(bpm, MIN_BPM, MAX_BPM) / 2;
}

export class RapLab808Engine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume = 0.72;

  ensureContext() {
    if (this.context) return this.context;
    if (typeof AudioContext === "undefined") return null;

    try {
      this.context = new AudioContext({ latencyHint: "interactive", sampleRate: 48_000 });
    } catch {
      this.context = new AudioContext({ latencyHint: "interactive" });
    }

    const master = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    master.gain.value = this.volume * 0.42;
    master.connect(compressor);
    compressor.connect(this.context.destination);
    this.master = master;
    this.compressor = compressor;
    this.noise = this.createNoiseBuffer(this.context);
    return this.context;
  }

  async activate() {
    const context = this.ensureContext();
    if (!context) return null;
    if (context.state === "suspended") await context.resume();
    return context;
  }

  get currentTime() {
    return this.context?.currentTime ?? 0;
  }

  setVolume(value: number) {
    this.volume = clamp(value, 0, 1);
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.volume * 0.42, this.context.currentTime, 0.015);
    }
  }

  trigger(instrument: BeatInstrument, when?: number, velocity = 1, step = 0) {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const start = Math.max(when ?? context.currentTime, context.currentTime + 0.004);
    const level = clamp(velocity, 0.1, 1.2);

    if (instrument === "kick") this.kick(context, this.master, start, level);
    if (instrument === "snare") this.snare(context, this.master, start, level);
    if (instrument === "hat") this.hat(context, this.master, start, level);
    if (instrument === "bass") this.bass(context, this.master, start, level, step);
  }

  close() {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noise = null;
    if (context) void context.close();
  }

  private createNoiseBuffer(context: AudioContext) {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private noiseSource(context: AudioContext) {
    const source = context.createBufferSource();
    source.buffer = this.noise;
    return source;
  }

  private kick(context: AudioContext, output: AudioNode, start: number, velocity: number) {
    const oscillator = context.createOscillator();
    const body = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(168, start);
    oscillator.frequency.exponentialRampToValueAtTime(52, start + 0.11);
    oscillator.frequency.exponentialRampToValueAtTime(43, start + 0.42);
    body.gain.setValueAtTime(0.0001, start);
    body.gain.exponentialRampToValueAtTime(0.95 * velocity, start + 0.006);
    body.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    oscillator.connect(body);
    body.connect(output);
    oscillator.start(start);
    oscillator.stop(start + 0.52);

    const click = this.noiseSource(context);
    const highpass = context.createBiquadFilter();
    const clickGain = context.createGain();
    highpass.type = "highpass";
    highpass.frequency.value = 2800;
    clickGain.gain.setValueAtTime(0.11 * velocity, start);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.018);
    click.connect(highpass);
    highpass.connect(clickGain);
    clickGain.connect(output);
    click.start(start);
    click.stop(start + 0.025);
  }

  private snare(context: AudioContext, output: AudioNode, start: number, velocity: number) {
    const noise = this.noiseSource(context);
    const highpass = context.createBiquadFilter();
    const noiseGain = context.createGain();
    highpass.type = "highpass";
    highpass.frequency.value = 1350;
    noiseGain.gain.setValueAtTime(0.52 * velocity, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    noise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(output);
    noise.start(start);
    noise.stop(start + 0.18);

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(190, start);
    body.frequency.exponentialRampToValueAtTime(118, start + 0.1);
    bodyGain.gain.setValueAtTime(0.22 * velocity, start);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    body.connect(bodyGain);
    bodyGain.connect(output);
    body.start(start);
    body.stop(start + 0.14);
  }

  private hat(context: AudioContext, output: AudioNode, start: number, velocity: number) {
    const noise = this.noiseSource(context);
    const highpass = context.createBiquadFilter();
    const peak = context.createBiquadFilter();
    const gain = context.createGain();
    highpass.type = "highpass";
    highpass.frequency.value = 6900;
    peak.type = "peaking";
    peak.frequency.value = 10_500;
    peak.Q.value = 0.9;
    peak.gain.value = 5;
    gain.gain.setValueAtTime(0.19 * velocity, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.052);
    noise.connect(highpass);
    highpass.connect(peak);
    peak.connect(gain);
    gain.connect(output);
    noise.start(start);
    noise.stop(start + 0.06);
  }

  private bass(
    context: AudioContext,
    output: AudioNode,
    start: number,
    velocity: number,
    step: number
  ) {
    const notes = [49, 49, 55, 43, 49, 41, 55, 46];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const frequency = notes[Math.abs(step) % notes.length];
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * 1.08, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.055);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(720, start);
    filter.frequency.exponentialRampToValueAtTime(190, start + 0.48);
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.52 * velocity, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + 0.72);
  }
}
