import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { CALL_MODE } from './callModeConfig';

/**
 * Thin isolation boundary around expo-audio for Prime voice (record + playback).
 *
 * Every audio call in the app goes through this module, so swapping the library
 * again — or moving to a native duplex stack — stays a change to THIS file only.
 *
 * Shape note: playback, permissions and audio routing are plain module functions,
 * but RECORDING is a hook (`useVoiceRecorder`). expo-audio only exposes recorder
 * construction through `useAudioRecorder`; the underlying class is not part of the
 * public API. Going through the hook keeps us off private internals, which is the
 * whole reason this file exists.
 *
 * Call-mode limits (documented):
 * - Metering VAD is best-effort; speaker echo can false-trigger barge-in.
 * - On barge-in we discard the monitor recording and start a fresh user capture —
 *   the first syllable may be clipped.
 * - No production-grade echo cancellation on this stack.
 *
 * Playback uses a base64 data URI so we don't depend on expo-file-system for a temp file.
 *
 * Metering note: expo-av pushed levels through a recording-status callback with a
 * configurable interval. expo-audio has no push equivalent, so we poll getStatus()
 * on that same interval and feed the VAD from there — same cadence, same dB scale.
 */

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const CALL_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
} as const;

let player: AudioPlayer | null = null;
let playbackSettler: ((result: 'completed' | 'interrupted') => void) | null = null;
let callSessionActive = false;

export type MeterCallback = (meteringDb: number | null) => void;

export interface VoiceRecorder {
  /** Start a metered capture, replacing any in-progress one. */
  startMetered: (onMeter: MeterCallback, intervalMs?: number) => Promise<void>;
  /** Stop and return the local file URI (null if nothing was captured). */
  stop: () => Promise<string | null>;
  /** Discard an in-progress capture (barge monitor / cleanup). */
  cancel: () => Promise<void>;
  isRecording: () => boolean;
}

/**
 * Recorder bound to the calling component's lifetime. One recorder instance is
 * reused across turns: stop() then startMetered() yields a fresh capture.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const meterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  const clearMeterTimer = useCallback(() => {
    if (meterTimer.current) {
      clearInterval(meterTimer.current);
      meterTimer.current = null;
    }
  }, []);

  const cancel = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    clearMeterTimer();
    try {
      await recorder.stop();
    } catch {
      // already stopped
    }
  }, [recorder, clearMeterTimer]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!active.current) return null;
    active.current = false;
    clearMeterTimer();
    try {
      await recorder.stop();
      return recorder.uri;
    } catch {
      return null;
    }
  }, [recorder, clearMeterTimer]);

  const startMetered = useCallback(
    async (onMeter: MeterCallback, intervalMs: number = CALL_MODE.METER_INTERVAL_MS) => {
      await cancel();

      await setAudioModeAsync(
        callSessionActive
          ? CALL_AUDIO_MODE
          : { allowsRecording: true, playsInSilentMode: true },
      );

      await recorder.prepareToRecordAsync();
      recorder.record();
      active.current = true;

      meterTimer.current = setInterval(() => {
        if (!active.current) return;
        try {
          const status = recorder.getStatus();
          if (!status.isRecording) return;
          onMeter(typeof status.metering === 'number' ? status.metering : null);
        } catch {
          // recorder torn down between tick and read
        }
      }, intervalMs);
    },
    [recorder, cancel],
  );

  const isRecording = useCallback(() => active.current, []);

  useEffect(() => clearMeterTimer, [clearMeterTimer]);

  return useMemo(
    () => ({ startMetered, stop, cancel, isRecording }),
    [startMetered, stop, cancel, isRecording],
  );
}

/** Enter call-friendly audio routing (mic + play in silent mode). */
export async function prepareCallAudioMode(): Promise<void> {
  callSessionActive = true;
  await setAudioModeAsync(CALL_AUDIO_MODE);
}

/**
 * Leave call audio mode (safe to call when already torn down).
 * Callers must cancel any in-progress recording first — the recorder now lives
 * on the hook, so this function cannot reach it.
 */
export async function teardownCallAudioMode(): Promise<void> {
  callSessionActive = false;
  await stopPlayback();
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    // ignore — mode may already be default
  }
}

export async function requestMicPermission(): Promise<boolean> {
  const perm = await requestRecordingPermissionsAsync();
  return perm.granted;
}

/**
 * Play MP3 base64. Resolves `'completed'` when natural end fires, or `'interrupted'`
 * when stopPlayback() cancels mid-play.
 */
export async function playBase64Mp3(base64: string): Promise<'completed' | 'interrupted'> {
  await stopPlayback();

  if (callSessionActive) {
    // Keep allowsRecording so the barge-in monitor can run alongside playback.
    await setAudioModeAsync(CALL_AUDIO_MODE);
  }

  const uri = `data:audio/mpeg;base64,${base64}`;
  const snd = createAudioPlayer({ uri });
  player = snd;

  return new Promise<'completed' | 'interrupted'>((resolve) => {
    playbackSettler = resolve;
    snd.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        const settle = playbackSettler;
        playbackSettler = null;
        void stopPlaybackInternal(false).then(() => settle?.('completed'));
      }
    });
    snd.play();
  });
}

async function stopPlaybackInternal(signalInterrupted: boolean): Promise<void> {
  const settle = playbackSettler;
  playbackSettler = null;
  if (signalInterrupted) {
    settle?.('interrupted');
  }

  if (!player) return;
  const snd = player;
  player = null;
  try {
    snd.removeAllListeners('playbackStatusUpdate');
  } catch {
    // ignore
  }
  try {
    snd.pause();
  } catch {
    // not playing
  }
  try {
    snd.remove();
  } catch {
    // already released
  }
}

export async function stopPlayback(): Promise<void> {
  await stopPlaybackInternal(true);
}
