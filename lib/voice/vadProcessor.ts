import { CALL_MODE, type CallModeConfig } from './callModeConfig';

export type VadMode = 'listen' | 'barge';

export interface VadState {
  /** True once speech has been confirmed in the current listening segment. */
  speechActive: boolean;
  /** Accumulated ms above the start / barge threshold. */
  holdMs: number;
  /** Accumulated ms below the end threshold after speech started. */
  silenceMs: number;
  /** ms since speech became active (listen mode). */
  utteranceMs: number;
  /** ms of continuous silence with no speech (listen mode idle rotation). */
  idleMs: number;
}

export type VadEvent =
  | { type: 'speech_start' }
  | { type: 'end_of_turn' }
  | { type: 'max_utterance' }
  | { type: 'idle_rotate' }
  | { type: 'barge_in' };

export function createVadState(): VadState {
  return {
    speechActive: false,
    holdMs: 0,
    silenceMs: 0,
    utteranceMs: 0,
    idleMs: 0,
  };
}

/**
 * Advance VAD state from one metering sample.
 *
 * `meteringDb` may be null when expo-av has not yet published a level — treat as silence.
 * Monitor audio used in `barge` mode must never be uploaded for transcription.
 */
export function processVadSample(
  state: VadState,
  meteringDb: number | null,
  mode: VadMode,
  dtMs: number,
  config: CallModeConfig = CALL_MODE,
): VadEvent | null {
  const level = meteringDb ?? -160;
  const next = state;

  if (mode === 'barge') {
    if (level >= config.BARGE_IN_DB) {
      next.holdMs += dtMs;
    } else {
      next.holdMs = 0;
    }
    if (next.holdMs >= config.BARGE_IN_HOLD_MS) {
      next.holdMs = 0;
      return { type: 'barge_in' };
    }
    return null;
  }

  // --- listen mode ---
  if (!next.speechActive) {
    if (level >= config.SPEECH_START_DB) {
      next.holdMs += dtMs;
      next.idleMs = 0;
    } else {
      next.holdMs = 0;
      next.idleMs += dtMs;
      if (next.idleMs >= config.IDLE_ROTATE_MS) {
        next.idleMs = 0;
        return { type: 'idle_rotate' };
      }
    }
    if (next.holdMs >= config.SPEECH_START_HOLD_MS) {
      next.speechActive = true;
      next.holdMs = 0;
      next.silenceMs = 0;
      next.utteranceMs = 0;
      next.idleMs = 0;
      return { type: 'speech_start' };
    }
    return null;
  }

  next.utteranceMs += dtMs;
  if (next.utteranceMs >= config.MAX_UTTERANCE_MS) {
    return { type: 'max_utterance' };
  }

  if (level < config.SPEECH_END_DB) {
    next.silenceMs += dtMs;
  } else {
    next.silenceMs = 0;
  }

  if (
    next.silenceMs >= config.END_OF_TURN_SILENCE_MS &&
    next.utteranceMs >= config.MIN_UTTERANCE_MS
  ) {
    return { type: 'end_of_turn' };
  }

  return null;
}
