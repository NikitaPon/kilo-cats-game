/**
 * Shared WebAudio helpers.
 *
 * Every mini-game synthesises its own sounds, but they all need the same
 * AudioContext. Browsers cap how many AudioContexts a page may hold, so the
 * context is a single lazily-created module-level singleton.
 *
 * The context is only created on the first call, which always happens after a
 * click or key press — browsers refuse to start audio before a user gesture.
 */

let context: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * The shared AudioContext, created on first use.
 * Throws if WebAudio is unavailable, so callers can keep their existing
 * `try { ... } catch { /* audio unavailable *\/ }` guards.
 */
export function getAudioContext(): AudioContext {
  if (!context) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) throw new Error("WebAudio is not available");
    context = new Ctor();
  }
  return context;
}

export interface ToneOptions {
  /** Starting frequency in Hz. */
  frequency: number;
  type?: OscillatorType;
  /** Length of the tone in seconds. */
  duration?: number;
  /** Peak gain, 0..1. */
  volume?: number;
  /** Optional target frequency to glide to over the tone's duration. */
  slideTo?: number;
  /** Seconds to wait before the tone starts. */
  delay?: number;
}

/** Schedule a single enveloped oscillator tone. Never throws. */
export function playTone({
  frequency,
  type = "sine",
  duration = 0.2,
  volume = 0.15,
  slideTo,
  delay = 0,
}: ToneOptions): void {
  try {
    const audio = getAudioContext();
    const start = audio.currentTime + delay;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }

    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

    oscillator.start(start);
    oscillator.stop(start + duration);
  } catch {
    // Audio not available
  }
}

/** Schedule several tones back to back, e.g. for a little jingle. */
export function playSequence(
  notes: { frequency: number; type?: OscillatorType; duration?: number; volume?: number; slideTo?: number }[],
  spacing = 0.09,
): void {
  notes.forEach((note, i) => playTone({ ...note, delay: i * spacing }));
}
