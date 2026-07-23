/**
 * Conservative call-mode timing / VAD thresholds for expo-av metering.
 *
 * Metering is approximate dBFS (typically ~-160…0). Speaker playback can leak into
 * the mic — barge-in uses a higher threshold and is best-effort only. Headphones
 * improve reliability; do not treat this as production-grade AEC.
 */
export const CALL_MODE = {
  /** Progress updates from expo-av Recording (~100 ms). */
  METER_INTERVAL_MS: 100,

  /** Crossing above this (with hold) starts an utterance while listening. */
  SPEECH_START_DB: -40,
  /** Dropping below this (with silence hold) ends an utterance (hysteresis). */
  SPEECH_END_DB: -48,
  /** Sustained above SPEECH_START_DB before counting as speech. */
  SPEECH_START_HOLD_MS: 200,
  /** Sustained below SPEECH_END_DB after speech before end-of-turn. */
  END_OF_TURN_SILENCE_MS: 900,

  /** Ignore tiny blips; require this much speech before allowing end-of-turn. */
  MIN_UTTERANCE_MS: 400,
  /** Hard cap — force-submit / stop capture. */
  MAX_UTTERANCE_MS: 30_000,
  /** Discard and restart a silent listening recording to bound file size. */
  IDLE_ROTATE_MS: 45_000,

  /**
   * Barge-in during TTS monitor recording. Higher than listen thresholds to
   * reduce false triggers from speaker echo. First syllable after barge-in
   * may be clipped because a fresh user recording starts after interrupt.
   */
  BARGE_IN_DB: -28,
  BARGE_IN_HOLD_MS: 250,

  /** Client abort for Whisper upload — longer than typical backend timeout. */
  TRANSCRIBE_TIMEOUT_MS: 60_000,
} as const;

export type CallModeConfig = typeof CALL_MODE;
