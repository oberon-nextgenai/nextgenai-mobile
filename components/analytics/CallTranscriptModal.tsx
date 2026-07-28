import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Text, type TextTone } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtDateTime, fmtDuration } from '@/lib/formatters';
import type { AnalyticsCallSummary } from '@/api/services/types';

interface Props {
  call: AnalyticsCallSummary | null;
  onClose: () => void;
}

function statusOf(c: AnalyticsCallSummary): { label: string; tone: 'positive' | 'negative' | 'neutral' } {
  if (c.evalSuccessful === true) return { label: 'Successful', tone: 'positive' };
  if (c.evalSuccessful === false) return { label: 'Unsuccessful', tone: 'negative' };
  if (c.status === 'failed') return { label: c.disconnectionReason ?? 'failed', tone: 'negative' };
  return { label: c.disconnectionReason ?? c.status ?? 'ended', tone: 'neutral' };
}

const TONE_BG: Record<string, string> = {
  positive: 'bg-success-soft',
  negative: 'bg-danger-soft',
  neutral: 'bg-surface-2 dark:bg-surface-2-dark',
};
const TONE_FG: Record<string, TextTone> = {
  positive: 'success',
  negative: 'danger',
  neutral: 'muted',
};

export function CallTranscriptModal({ call, onClose }: Props) {
  const { colors } = useThemeMode();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const recordingUrl = call?.recordingUrl;
  const transcript = call?.transcript ?? call?.summary;

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!call) {
      void soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
      setPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
      setAudioError(null);
    }
  }, [call]);

  const togglePlay = async () => {
    if (!recordingUrl) return;
    try {
      if (!soundRef.current) {
        setAudioLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordingUrl },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            setPositionMs(status.positionMillis ?? 0);
            setDurationMs(status.durationMillis ?? 0);
            setPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setPlaying(false);
              setPositionMs(0);
              void soundRef.current?.setPositionAsync(0).catch(() => undefined);
            }
          },
        );
        soundRef.current = sound;
        setAudioLoading(false);
        setPlaying(true);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setPlaying(true);
      }
    } catch (e) {
      setAudioLoading(false);
      setAudioError((e as Error).message ?? 'Playback failed');
    }
  };

  if (!call) return null;

  const status = statusOf(call);
  const startedAt = call.startedAt;
  const minutes = call.durationSec != null ? call.durationSec / 60 : undefined;
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
    >
      <Pressable className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-4 px-5 pb-8 max-h-[90%]">
        <View className="items-center mb-3">
          <View className="w-10 h-1 rounded-full bg-fg-subtle dark:bg-fg-dark-subtle opacity-50" />
        </View>
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="display.sm">Call detail</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.fgSubtle} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="mono.value" tone="muted">
              {fmtDateTime(startedAt)}
            </Text>
            <View className={`px-2.5 py-1 rounded-full ${TONE_BG[status.tone]}`}>
              <Text variant="mono.label" tone={TONE_FG[status.tone]}>
                {status.label}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-surface-2 dark:bg-surface-2-dark rounded-lg p-3">
              <Text variant="mono.label" tone="muted">
                Duration
              </Text>
              <Text variant="mono.value" className="mt-0.5">
                {fmtDuration(minutes)}
              </Text>
            </View>
            <View className="flex-1 bg-surface-2 dark:bg-surface-2-dark rounded-lg p-3">
              <Text variant="mono.label" tone="muted">
                End reason
              </Text>
              <Text variant="mono.value" numberOfLines={1} className="mt-0.5">
                {call.disconnectionReason ?? '—'}
              </Text>
            </View>
          </View>

          {recordingUrl ? (
            <View className="bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-xl p-3 mb-4">
              <View className="flex-row items-center">
                <Pressable
                  onPress={togglePlay}
                  disabled={audioLoading}
                  className="w-11 h-11 rounded-full bg-accent dark:bg-accent-dark items-center justify-center"
                >
                  {audioLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
                  )}
                </Pressable>
                <View className="flex-1 ml-3">
                  <Text variant="body.medium">Recording</Text>
                  <View className="h-1 bg-border dark:bg-border-dark rounded-full mt-2 overflow-hidden">
                    <View
                      className="h-full bg-accent dark:bg-accent-dark"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </View>
                  <Text variant="mono.sm" tone="muted" className="mt-1">
                    {Math.floor(positionMs / 1000)}s /{' '}
                    {durationMs > 0 ? `${Math.floor(durationMs / 1000)}s` : '—'}
                  </Text>
                </View>
              </View>
              {audioError ? (
                <Text variant="body.sm" tone="danger" className="mt-2">
                  {audioError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text variant="mono.label" tone="muted" className="mb-2">
            Transcript
          </Text>
          {transcript ? (
            <Text variant="body.sm">{transcript}</Text>
          ) : (
            <Text variant="body.md" tone="muted">
              No transcript available for this call.
            </Text>
          )}

          {call.summary && call.summary !== transcript ? (
            <>
              <Text variant="mono.label" tone="muted" className="mt-4 mb-2">
                Summary
              </Text>
              <Text variant="body.sm">{call.summary}</Text>
            </>
          ) : null}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}
