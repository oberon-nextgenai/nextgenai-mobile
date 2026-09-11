import {
  AudioRecorder,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
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

let recorder: AudioRecorder | null = null;
let meterTimer: ReturnType<typeof setInterval> | null = null;
let player: AudioPlayer | null = null;
let playbackSettler: ((result: 'completed' | 'interrupted') => void) | null = null;
let callSessionActive = false;

export type MeterCallback = (meteringDb: number | null) => void;

/** Enter call-friendly audio routing (mic + play in silent mode). */
export async function prepareCallAudioMode(): Promise<void> {
  callSessionActive = true;
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}

/** Leave call audio mode (safe to call when already torn down). */
export async function teardownCallAudioMode(): Promise<void> {
  callSessionActive = false;
  await cancelRecording();
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

function clearMeterTimer(): void {
  if (meterTimer) {
    clearInterval(meterTimer);
    meterTimer = null;
  }
}

/**
 * Start a single metered recording. Replaces any prior recorder.
 * `onMeter` is invoked ~every `intervalMs` with metering (dB) when available.
 */
export async function startMeteredRecording(
  onMeter: MeterCallback,
  intervalMs: number = CALL_MODE.METER_INTERVAL_MS,
): Promise<void> {
  await cancelRecording();

  if (callSessionActive) {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } else {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }

  const rec = new AudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  await rec.prepareToRecordAsync();
  rec.record();
  recorder = rec;

  meterTimer = setInterval(() => {
    const active = recorder;
    if (!active) return;
    try {
      const status = active.getStatus();
      if (!status.isRecording) return;
      onMeter(typeof status.metering === 'number' ? status.metering : null);
    } catch {
      // recorder was torn down between tick and read
    }
  }, intervalMs);
}

/** @deprecated Prefer startMeteredRecording for call mode. Kept for simple one-shots. */
export async function startRecording(): Promise<void> {
  await startMeteredRecording(() => undefined);
}

/** Stops the recording and returns the local file URI (or null if nothing was recorded). */
export async function stopRecording(): Promise<string | null> {
  if (!recorder) return null;
  const rec = recorder;
  recorder = null;
  clearMeterTimer();
  try {
    await rec.stop();
    return rec.uri;
  } catch {
    return null;
  }
}

/** Discards an in-progress recording without returning it (e.g. barge monitor / cleanup). */
export async function cancelRecording(): Promise<void> {
  if (!recorder) return;
  const rec = recorder;
  recorder = null;
  clearMeterTimer();
  try {
    await rec.stop();
  } catch {
    // already stopped
  }
}

export function isRecording(): boolean {
  return recorder !== null;
}

/**
 * Play MP3 base64. Resolves `'completed'` when natural end fires, or `'interrupted'`
 * when stopPlayback() cancels mid-play.
 */
export async function playBase64Mp3(base64: string): Promise<'completed' | 'interrupted'> {
  await stopPlayback();

  if (callSessionActive) {
    // Keep allowsRecording so the barge-in monitor can run alongside playback.
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
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
