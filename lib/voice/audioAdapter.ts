import { Audio, type AVPlaybackStatus } from 'expo-av';
import { CALL_MODE } from './callModeConfig';

/**
 * Thin isolation boundary around expo-av for Prime voice (record + playback).
 *
 * expo-av is deprecated and removed in newer Expo SDKs; keeping every expo-av call
 * behind this module means migrating to expo-audio / a native duplex stack later is
 * a change to THIS file only.
 *
 * Call-mode limits (documented):
 * - Metering VAD is best-effort; speaker echo can false-trigger barge-in.
 * - On barge-in we discard the monitor recording and start a fresh user capture —
 *   the first syllable may be clipped.
 * - No production-grade echo cancellation on this Expo 53 / expo-av stack.
 *
 * Playback uses a base64 data URI so we don't depend on expo-file-system for a temp file.
 */

let recording: Audio.Recording | null = null;
let sound: Audio.Sound | null = null;
let playbackSettler: ((result: 'completed' | 'interrupted') => void) | null = null;
let callSessionActive = false;

export type MeterCallback = (meteringDb: number | null) => void;

/** Enter call-friendly audio routing (mic + play in silent mode). */
export async function prepareCallAudioMode(): Promise<void> {
  callSessionActive = true;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    playThroughEarpieceAndroid: false,
  });
}

/** Leave call audio mode (safe to call when already torn down). */
export async function teardownCallAudioMode(): Promise<void> {
  callSessionActive = false;
  await cancelRecording();
  await stopPlayback();
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch {
    // ignore — mode may already be default
  }
}

export async function requestMicPermission(): Promise<boolean> {
  const perm = await Audio.requestPermissionsAsync();
  return perm.granted;
}

/**
 * Start a single metered recording. Replaces any prior recorder.
 * `onMeter` is invoked ~every `intervalMs` with expo-av metering (dB) when available.
 */
export async function startMeteredRecording(
  onMeter: MeterCallback,
  intervalMs: number = CALL_MODE.METER_INTERVAL_MS,
): Promise<void> {
  await cancelRecording();

  if (callSessionActive) {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });
  } else {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  }

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
    (status) => {
      if (!status.isRecording) return;
      onMeter(typeof status.metering === 'number' ? status.metering : null);
    },
    intervalMs,
  );
  recording = rec;
}

/** @deprecated Prefer startMeteredRecording for call mode. Kept for simple one-shots. */
export async function startRecording(): Promise<void> {
  await startMeteredRecording(() => undefined);
}

/** Stops the recording and returns the local file URI (or null if nothing was recorded). */
export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
    return rec.getURI();
  } catch {
    return null;
  }
}

/** Discards an in-progress recording without returning it (e.g. barge monitor / cleanup). */
export async function cancelRecording(): Promise<void> {
  if (!recording) return;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
  } catch {
    // already stopped/unloaded
  }
}

export function isRecording(): boolean {
  return recording !== null;
}

/**
 * Play MP3 base64. Resolves `'completed'` when natural end fires, or `'interrupted'`
 * when stopPlayback() cancels mid-play.
 */
export async function playBase64Mp3(base64: string): Promise<'completed' | 'interrupted'> {
  await stopPlayback();

  if (callSessionActive) {
    // Keep allowsRecordingIOS so barge-in monitor can run alongside playback.
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });
  }

  const uri = `data:audio/mpeg;base64,${base64}`;
  const { sound: snd } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  sound = snd;

  return new Promise<'completed' | 'interrupted'>((resolve) => {
    playbackSettler = resolve;
    snd.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        const settle = playbackSettler;
        playbackSettler = null;
        void stopPlaybackInternal(false).then(() => settle?.('completed'));
      }
    });
  });
}

async function stopPlaybackInternal(signalInterrupted: boolean): Promise<void> {
  const settle = playbackSettler;
  playbackSettler = null;
  if (signalInterrupted) {
    settle?.('interrupted');
  }

  if (!sound) return;
  const snd = sound;
  sound = null;
  try {
    snd.setOnPlaybackStatusUpdate(null);
  } catch {
    // ignore
  }
  try {
    await snd.stopAsync();
  } catch {
    // not playing
  }
  try {
    await snd.unloadAsync();
  } catch {
    // already unloaded
  }
}

export async function stopPlayback(): Promise<void> {
  await stopPlaybackInternal(true);
}
