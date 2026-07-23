import { Audio } from 'expo-av';

/**
 * Thin isolation boundary around expo-av for Prime voice (record + playback).
 *
 * expo-av is deprecated and removed in newer Expo SDKs; keeping every expo-av call
 * behind this module means migrating to expo-audio later is a change to THIS file only.
 *
 * Playback uses a base64 data URI so we don't depend on expo-file-system for a temp file.
 */

let recording: Audio.Recording | null = null;
let sound: Audio.Sound | null = null;

export async function requestMicPermission(): Promise<boolean> {
  const perm = await Audio.requestPermissionsAsync();
  return perm.granted;
}

export async function startRecording(): Promise<void> {
  // Guard against a dangling recording from an interrupted session.
  await cancelRecording();

  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  recording = rec;
}

/** Stops the recording and returns the local file URI (or null if nothing was recorded). */
export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
    return rec.getURI();
  } finally {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }
}

/** Discards an in-progress recording without returning it (e.g. on cleanup). */
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

export async function playBase64Mp3(base64: string, onEnd?: () => void): Promise<void> {
  await stopPlayback();
  const uri = `data:audio/mpeg;base64,${base64}`;
  const { sound: snd } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  sound = snd;
  snd.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      onEnd?.();
      void stopPlayback();
    }
  });
}

export async function stopPlayback(): Promise<void> {
  if (!sound) return;
  const snd = sound;
  sound = null;
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
