/**
 * Lightweight synthesised sound effects using the Web Audio API.
 * No audio files — everything is oscillator-based.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _volume = 0.35;
let _sfxVolume = 0.7;

function ensureCtx(): { ctx: AudioContext; gain: GainNode } {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return { ctx, gain: masterGain! };
}

/** Set master volume (0–1). */
export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _volume;
}

export function getVolume(): number {
  return _volume;
}

/** Set SFX master multiplier (0–1). All sound effects scale by this. */
export function setSfxVolume(level: number): void {
  _sfxVolume = Math.max(0, Math.min(1, level));
}

export function getSfxVolume(): number {
  return _sfxVolume;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  ramp = true,
  vol = 0.6,
): void {
  const { ctx: ac, gain } = ensureCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const v = vol * _sfxVolume;
  env.gain.value = v;
  if (ramp) {
    env.gain.setValueAtTime(v, ac.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  }
  osc.connect(env);
  env.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

/** Short chirp on avatar click. */
export function sfxClick(): void {
  playTone(880, 0.08, "sine");
}

/** Two-tone pet purr on double-click. */
export function sfxPet(): void {
  const { ctx: ac, gain } = ensureCtx();
  [440, 554].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const v = 0.4 * _sfxVolume;
    env.gain.setValueAtTime(v, ac.currentTime + i * 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.15);
    osc.connect(env);
    env.connect(gain);
    osc.start(ac.currentTime + i * 0.1);
    osc.stop(ac.currentTime + i * 0.1 + 0.15);
  });
}

/** Whoosh for sending a chat message. */
export function sfxSend(): void {
  const { ctx: ac, gain } = ensureCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.12);
  const v = 0.3 * _sfxVolume;
  env.gain.setValueAtTime(v, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(env);
  env.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

/** Pop for receiving a chat reply. */
export function sfxReceive(): void {
  playTone(660, 0.06, "sine");
  setTimeout(() => playTone(990, 0.06, "sine"), 60);
}

/** Short ascending jingle for game start. */
export function sfxGameStart(): void {
  [523, 659, 784].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.1, "triangle"), i * 80);
  });
}

/** Celebration fanfare for confetti / game complete. */
export function sfxCelebrate(): void {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, "triangle"), i * 70);
  });
}

/** Soft chirp when hovering over avatar. */
export function sfxHover(): void {
  playTone(1300, 0.07, "sine", true, 0.1);
}

/** Rising woosh when starting a drag. */
export function sfxDragStart(): void {
  const { ctx: ac, gain } = ensureCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.12);
  const v = 0.15 * _sfxVolume;
  env.gain.setValueAtTime(v, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
  osc.connect(env);
  env.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.12);
}

/** Soft landing thud when drag ends. */
export function sfxDragEnd(): void {
  const { ctx: ac, gain } = ensureCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ac.currentTime + 0.1);
  const v = 0.15 * _sfxVolume;
  env.gain.setValueAtTime(v, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  osc.connect(env);
  env.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.1);
  // Small bounce overtone
  const bounce = ac.createOscillator();
  const bounceEnv = ac.createGain();
  bounce.type = "sine";
  bounce.frequency.value = 250;
  const bv = 0.08 * _sfxVolume;
  bounceEnv.gain.setValueAtTime(0, ac.currentTime + 0.08);
  bounceEnv.gain.linearRampToValueAtTime(bv, ac.currentTime + 0.1);
  bounceEnv.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
  bounce.connect(bounceEnv);
  bounceEnv.connect(gain);
  bounce.start(ac.currentTime + 0.08);
  bounce.stop(ac.currentTime + 0.18);
}

/** Soft sigh when falling asleep. */
export function sfxSleep(): void {
  const { ctx: ac, gain } = ensureCtx();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(130, ac.currentTime + 0.4);
  const v = 0.12 * _sfxVolume;
  env.gain.setValueAtTime(v, ac.currentTime);
  env.gain.setTargetAtTime(0, ac.currentTime + 0.1, 0.1);
  osc.connect(env);
  env.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.7);
}

/** Gentle morning chime when waking up. */
export function sfxWake(): void {
  const { ctx: ac, gain } = ensureCtx();
  const v = 0.18 * _sfxVolume;
  [523, 784].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(v, ac.currentTime + i * 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.12);
    osc.connect(env);
    env.connect(gain);
    osc.start(ac.currentTime + i * 0.1);
    osc.stop(ac.currentTime + i * 0.1 + 0.12);
  });
}

/** Soft error buzz — two short pulses. */
export function sfxError(): void {
  const { ctx: ac, gain } = ensureCtx();
  const v = 0.1 * _sfxVolume;
  [0, 0.11].forEach((offset) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "square";
    osc.frequency.value = 150;
    env.gain.setValueAtTime(v, ac.currentTime + offset);
    env.gain.setValueAtTime(0, ac.currentTime + offset + 0.08);
    osc.connect(env);
    env.connect(gain);
    osc.start(ac.currentTime + offset);
    osc.stop(ac.currentTime + offset + 0.08);
  });
}

/** Achievement unlock fanfare — ascending 5-note jingle. */
export function sfxAchievement(): void {
  const { ctx: ac, gain } = ensureCtx();
  const v = 0.2 * _sfxVolume;
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(v, ac.currentTime + i * 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.08 + 0.15);
    osc.connect(env);
    env.connect(gain);
    osc.start(ac.currentTime + i * 0.08);
    osc.stop(ac.currentTime + i * 0.08 + 0.15);
  });
}

/** Subtle ping when a thought bubble appears. */
export function sfxThought(): void {
  playTone(880, 0.05, "sine", true, 0.06);
}

/* ---------------------------------------------------------------------------
   Ambient Mood Tones — soft continuous drone that shifts with mood
   --------------------------------------------------------------------------- */

const MOOD_TONES: Record<string, { freq: number; type: OscillatorType }> = {
  idle:      { freq: 174, type: "sine" },
  playful:   { freq: 220, type: "triangle" },
  curious:   { freq: 196, type: "sine" },
  sleepy:    { freq: 130, type: "sine" },
  surprised: { freq: 262, type: "triangle" },
};

let ambientOsc: OscillatorNode | null = null;
let ambientEnv: GainNode | null = null;
let _ambientEnabled = true;

export function isAmbientEnabled(): boolean {
  return _ambientEnabled;
}

export function setAmbientEnabled(on: boolean): void {
  _ambientEnabled = on;
  if (!on) {
    stopAmbient();
  }
}

export function updateAmbientMood(mood: string): void {
  if (!_ambientEnabled) return;
  const tone = MOOD_TONES[mood] ?? MOOD_TONES.idle;
  const { ctx: ac, gain } = ensureCtx();

  if (!ambientOsc) {
    ambientOsc = ac.createOscillator();
    ambientEnv = ac.createGain();
    ambientOsc.type = tone.type;
    ambientOsc.frequency.value = tone.freq;
    ambientEnv.gain.value = 0;
    ambientOsc.connect(ambientEnv);
    ambientEnv.connect(gain);
    ambientOsc.start();
    // Fade in gently
    ambientEnv.gain.setTargetAtTime(0.06, ac.currentTime, 0.5);
  } else {
    // Crossfade to new frequency
    ambientOsc.frequency.setTargetAtTime(tone.freq, ac.currentTime, 0.8);
    ambientOsc.type = tone.type;
  }
}

function stopAmbient(): void {
  if (ambientOsc && ambientEnv) {
    const { ctx: ac } = ensureCtx();
    ambientEnv.gain.setTargetAtTime(0, ac.currentTime, 0.3);
    const osc = ambientOsc;
    setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 1500);
    ambientOsc = null;
    ambientEnv = null;
  }
}
