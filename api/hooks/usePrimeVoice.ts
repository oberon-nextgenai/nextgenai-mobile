import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { synthesizeSpeech, transcribeAudio } from '@/api/services/chat';
import * as audio from '@/lib/voice/audioAdapter';

export interface UsePrimeVoiceOptions {
  orgId: string | null;
  /** Fired with the recognized transcript when a recording is transcribed. */
  onTranscript?: (text: string) => void;
}

export interface UsePrimeVoice {
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  muted: boolean;
  toggleMute: () => void;
  startRecording: () => Promise<void>;
  stopAndSubmit: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
}

/**
 * Push-to-talk voice for Prime on mobile: expo-av (behind an adapter) records audio,
 * the backend transcribes it (Whisper) and synthesizes replies (ElevenLabs). TTS text
 * comes from the backend's speakableText — this hook never re-flattens structured replies.
 */
export function usePrimeVoice(options: UsePrimeVoiceOptions): UsePrimeVoice {
  const { orgId } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const recordingRef = useRef(false);
  const onTranscriptRef = useRef(options.onTranscript);
  onTranscriptRef.current = options.onTranscript;

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    try {
      // Barge-in: stop any spoken reply so recording is clean.
      await audio.stopPlayback();
      setIsSpeaking(false);

      const granted = await audio.requestMicPermission();
      if (!granted) {
        Toast.show({ type: 'error', text1: 'Microphone blocked', text2: 'Enable mic access in Settings.' });
        return;
      }
      await audio.startRecording();
      recordingRef.current = true;
      setIsRecording(true);
    } catch {
      recordingRef.current = false;
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'Could not start recording' });
    }
  }, []);

  const stopAndSubmit = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);

    let uri: string | null = null;
    try {
      uri = await audio.stopRecording();
    } catch {
      Toast.show({ type: 'error', text1: 'Recording failed' });
      return;
    }
    if (!uri || !orgId) return;

    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(orgId, uri);
      const trimmed = text.trim();
      if (trimmed) onTranscriptRef.current?.(trimmed);
    } catch {
      // http interceptor surfaces the toast; stay quiet here.
    } finally {
      setIsTranscribing(false);
    }
  }, [orgId]);

  const speak = useCallback(
    async (text: string) => {
      if (mutedRef.current || !text?.trim() || !orgId) return;
      try {
        const { audioBase64 } = await synthesizeSpeech(orgId, text.trim());
        if (mutedRef.current || !audioBase64) return;
        setIsSpeaking(true);
        await audio.playBase64Mp3(audioBase64, () => setIsSpeaking(false));
      } catch {
        setIsSpeaking(false);
      }
    },
    [orgId],
  );

  const stopSpeaking = useCallback(async () => {
    await audio.stopPlayback();
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        void audio.stopPlayback();
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  // Tear down recording + playback on unmount or org change.
  useEffect(() => {
    return () => {
      void audio.cancelRecording();
      void audio.stopPlayback();
    };
  }, [orgId]);

  return {
    isRecording,
    isTranscribing,
    isSpeaking,
    muted,
    toggleMute,
    startRecording,
    stopAndSubmit,
    speak,
    stopSpeaking,
  };
}
