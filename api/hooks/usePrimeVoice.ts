import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { synthesizeSpeech, transcribeAudio } from '@/api/services/chat';
import * as audio from '@/lib/voice/audioAdapter';
import { CALL_MODE } from '@/lib/voice/callModeConfig';
import { createVadState, processVadSample, type VadState } from '@/lib/voice/vadProcessor';

export type PrimeVoicePhase =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking';

export interface UsePrimeVoiceOptions {
  orgId: string | null;
  /** Fired once per completed user utterance while the call is active. */
  onTranscript?: (text: string) => void;
  /**
   * True while Prime chat is streaming. Keeps capture paused in `thinking`
   * and prevents listening from restarting mid-turn.
   */
  isThinking?: boolean;
}

export interface UsePrimeVoice {
  callActive: boolean;
  phase: PrimeVoicePhase;
  startCall: () => Promise<void>;
  endCall: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
}

/**
 * Hands-free call voice for Prime on mobile (expo-av / metering VAD).
 *
 * Limitations (not production-grade duplex):
 * - Speaker echo can false-trigger barge-in; headphones recommended.
 * - After barge-in the first syllable may be clipped (fresh recording starts post-interrupt).
 * - Calls end on app background — background duplex is unsupported on this stack.
 */
export function usePrimeVoice(options: UsePrimeVoiceOptions): UsePrimeVoice {
  const { orgId, isThinking = false } = options;

  const [callActive, setCallActive] = useState(false);
  const [phase, setPhase] = useState<PrimeVoicePhase>('idle');

  const sessionRef = useRef(0);
  const callActiveRef = useRef(false);
  const phaseRef = useRef<PrimeVoicePhase>('idle');
  const isThinkingRef = useRef(isThinking);
  isThinkingRef.current = isThinking;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  const onTranscriptRef = useRef(options.onTranscript);
  onTranscriptRef.current = options.onTranscript;

  const vadRef = useRef<VadState>(createVadState());
  const meterHandlingRef = useRef(false);
  const bargeActiveRef = useRef(false);
  const voiceAbortRef = useRef<AbortController | null>(null);

  // Stable late-bound loop entry points (avoid circular useCallback deps).
  const startListeningLoopRef = useRef<(session: number) => Promise<void>>(async () => undefined);
  const submitRecordingRef = useRef<(session: number, uri: string) => Promise<void>>(
    async () => undefined,
  );

  const setPhaseSafe = useCallback((next: PrimeVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const isLive = useCallback((session: number) => {
    return session === sessionRef.current && callActiveRef.current;
  }, []);

  const abortVoiceNetwork = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
  }, []);

  const stopSpeaking = useCallback(async () => {
    abortVoiceNetwork();
    bargeActiveRef.current = false;
    await audio.cancelRecording();
    await audio.stopPlayback();
  }, [abortVoiceNetwork]);

  const endCall = useCallback(() => {
    sessionRef.current += 1;
    callActiveRef.current = false;
    setCallActive(false);
    meterHandlingRef.current = false;
    bargeActiveRef.current = false;
    abortVoiceNetwork();
    void audio.teardownCallAudioMode();
    setPhaseSafe('idle');
  }, [abortVoiceNetwork, setPhaseSafe]);

  submitRecordingRef.current = async (session: number, uri: string) => {
    const currentOrg = orgIdRef.current;
    if (!isLive(session) || !currentOrg || !uri) {
      if (isLive(session)) void startListeningLoopRef.current(session);
      return;
    }

    setPhaseSafe('transcribing');
    const abort = new AbortController();
    voiceAbortRef.current = abort;

    try {
      const text = await transcribeAudio(currentOrg, uri, {
        signal: abort.signal,
        timeoutMs: CALL_MODE.TRANSCRIBE_TIMEOUT_MS,
      });
      if (!isLive(session)) return;
      const trimmed = text.trim();
      if (!trimmed) {
        void startListeningLoopRef.current(session);
        return;
      }
      setPhaseSafe('thinking');
      onTranscriptRef.current?.(trimmed);
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') return;
      if (error instanceof Error && error.name === 'AbortError') return;
      // Axios abort
      if ((error as { code?: string })?.code === 'ERR_CANCELED') return;
      if (!isLive(session)) return;
      void startListeningLoopRef.current(session);
    } finally {
      if (voiceAbortRef.current === abort) voiceAbortRef.current = null;
    }
  };

  startListeningLoopRef.current = async (session: number) => {
    if (!isLive(session)) return;
    if (isThinkingRef.current) {
      setPhaseSafe('thinking');
      return;
    }

    try {
      await audio.cancelRecording();
      if (!isLive(session) || isThinkingRef.current) return;

      vadRef.current = createVadState();
      meterHandlingRef.current = false;
      setPhaseSafe('listening');

      await audio.startMeteredRecording((meteringDb) => {
        if (!isLive(session)) return;
        if (phaseRef.current !== 'listening') return;
        if (isThinkingRef.current) return;
        if (meterHandlingRef.current) return;

        const event = processVadSample(
          vadRef.current,
          meteringDb,
          'listen',
          CALL_MODE.METER_INTERVAL_MS,
        );
        if (!event) return;

        if (event.type === 'idle_rotate') {
          meterHandlingRef.current = true;
          void (async () => {
            await audio.cancelRecording();
            meterHandlingRef.current = false;
            if (isLive(session) && !isThinkingRef.current) {
              await startListeningLoopRef.current(session);
            }
          })();
          return;
        }

        if (event.type === 'end_of_turn' || event.type === 'max_utterance') {
          meterHandlingRef.current = true;
          void (async () => {
            let uri: string | null = null;
            try {
              uri = await audio.stopRecording();
            } catch {
              uri = null;
            }
            meterHandlingRef.current = false;
            if (!isLive(session)) return;
            if (!uri) {
              await startListeningLoopRef.current(session);
              return;
            }
            await submitRecordingRef.current(session, uri);
          })();
        }
      });
    } catch {
      if (!isLive(session)) return;
      Toast.show({ type: 'error', text1: 'Could not start listening' });
      endCall();
    }
  };

  const startBargeMonitor = useCallback(
    async (session: number) => {
      if (!isLive(session) || phaseRef.current !== 'speaking') return;
      bargeActiveRef.current = true;
      vadRef.current = createVadState();

      try {
        await audio.startMeteredRecording((meteringDb) => {
          if (!isLive(session) || !bargeActiveRef.current) return;
          if (phaseRef.current !== 'speaking') return;
          if (meterHandlingRef.current) return;

          const event = processVadSample(
            vadRef.current,
            meteringDb,
            'barge',
            CALL_MODE.METER_INTERVAL_MS,
          );
          if (event?.type !== 'barge_in') return;

          meterHandlingRef.current = true;
          bargeActiveRef.current = false;
          void (async () => {
            // Discard monitor audio — never send to Whisper.
            await audio.cancelRecording();
            await audio.stopPlayback();
            meterHandlingRef.current = false;
            if (!isLive(session)) return;
            await startListeningLoopRef.current(session);
          })();
        });
      } catch {
        bargeActiveRef.current = false;
      }
    },
    [isLive],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = (text || '').trim();
      const session = sessionRef.current;
      if (!isLive(session) || !orgIdRef.current) return;

      if (!clean) {
        await startListeningLoopRef.current(session);
        return;
      }

      meterHandlingRef.current = false;
      bargeActiveRef.current = false;
      await audio.cancelRecording();
      await audio.stopPlayback();
      if (!isLive(session)) return;

      setPhaseSafe('speaking');
      const abort = new AbortController();
      voiceAbortRef.current = abort;

      let audioBase64 = '';
      try {
        const result = await synthesizeSpeech(orgIdRef.current, clean, {
          signal: abort.signal,
        });
        audioBase64 = result.audioBase64;
      } catch (error) {
        if ((error as { code?: string })?.code === 'ERR_CANCELED') return;
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
          return;
        }
        if (!isLive(session)) return;
        await startListeningLoopRef.current(session);
        return;
      } finally {
        if (voiceAbortRef.current === abort) voiceAbortRef.current = null;
      }

      if (!isLive(session) || !audioBase64) {
        if (isLive(session)) await startListeningLoopRef.current(session);
        return;
      }

      void startBargeMonitor(session);

      try {
        const result = await audio.playBase64Mp3(audioBase64);
        bargeActiveRef.current = false;
        await audio.cancelRecording();
        if (!isLive(session)) return;
        if (result === 'completed') {
          await startListeningLoopRef.current(session);
        }
        // interrupted → barge-in or endCall already owns next phase
      } catch {
        bargeActiveRef.current = false;
        await audio.cancelRecording();
        if (isLive(session)) await startListeningLoopRef.current(session);
      }
    },
    [isLive, setPhaseSafe, startBargeMonitor],
  );

  const startCall = useCallback(async () => {
    if (callActiveRef.current) return;
    if (!orgIdRef.current) {
      Toast.show({ type: 'error', text1: 'Choose an organization first' });
      return;
    }

    try {
      const granted = await audio.requestMicPermission();
      if (!granted) {
        Toast.show({
          type: 'error',
          text1: 'Microphone blocked',
          text2: 'Enable mic access in Settings.',
        });
        return;
      }
      await audio.prepareCallAudioMode();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not start call' });
      return;
    }

    sessionRef.current += 1;
    const session = sessionRef.current;
    callActiveRef.current = true;
    setCallActive(true);

    if (isThinkingRef.current) {
      setPhaseSafe('thinking');
      return;
    }
    await startListeningLoopRef.current(session);
  }, [setPhaseSafe]);

  // Chat streaming → pause capture into thinking (typed send or voice turn).
  useEffect(() => {
    if (!callActiveRef.current) return;

    if (isThinking) {
      if (phaseRef.current === 'listening' || phaseRef.current === 'transcribing') {
        void audio.cancelRecording();
        meterHandlingRef.current = false;
        setPhaseSafe('thinking');
      } else if (phaseRef.current !== 'speaking') {
        setPhaseSafe('thinking');
      }
      return;
    }

    // Streaming ended. If speak() is about to run, it will move to speaking.
    // Otherwise resume listening after a short deferral.
    if (phaseRef.current !== 'thinking') return;
    const session = sessionRef.current;
    const timer = setTimeout(() => {
      if (!isLive(session)) return;
      if (phaseRef.current === 'thinking' && !isThinkingRef.current) {
        void startListeningLoopRef.current(session);
      }
    }, 75);
    return () => clearTimeout(timer);
  }, [isThinking, isLive, setPhaseSafe]);

  // End call on background — duplex audio is unsupported while backgrounded.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if ((next === 'background' || next === 'inactive') && callActiveRef.current) {
        endCall();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [endCall]);

  // Org change while mounted → end call.
  const prevOrgRef = useRef(orgId);
  useEffect(() => {
    if (prevOrgRef.current !== orgId) {
      prevOrgRef.current = orgId;
      if (callActiveRef.current) endCall();
    }
  }, [orgId, endCall]);

  // Unmount teardown.
  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      callActiveRef.current = false;
      abortVoiceNetwork();
      void audio.teardownCallAudioMode();
    };
  }, [abortVoiceNetwork]);

  return {
    callActive,
    phase,
    startCall,
    endCall,
    speak,
    stopSpeaking,
  };
}
