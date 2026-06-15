import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useVoices } from '@/api/hooks/voiceHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';
import type { VoiceConfig } from '@/api/services/types';

interface Props {
  orgId: string | null;
  selectedVoiceId?: string;
  onPick: (voice: VoiceConfig) => void;
  onClose: () => void;
}

type Gender = 'all' | 'male' | 'female' | 'neutral';

export function VoicePickerSheet({ orgId, selectedVoiceId, onPick, onClose }: Props) {
  const { colors } = useThemeMode();
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<Gender>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const voices = useVoices({
    orgId,
    gender: gender === 'all' ? undefined : gender,
  });

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = voices.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.voiceId.toLowerCase().includes(q) ||
        v.provider?.providerName?.toLowerCase().includes(q),
    );
  }, [voices.data, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, VoiceConfig[]>();
    for (const v of filtered) {
      const key = v.provider?.providerName ?? 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const playPreview = async (v: VoiceConfig) => {
    if (!v.sampleAudioUrl) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
      if (playingId === v._id) {
        setPlayingId(null);
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: v.sampleAudioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        },
      );
      soundRef.current = sound;
      setPlayingId(v._id);
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
    >
      <Pressable className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-4 px-5 pb-6 max-h-[85%]">
        <View className="items-center mb-3">
          <View className="w-10 h-1 rounded-full bg-fg-subtle dark:bg-fg-dark-subtle opacity-50" />
        </View>
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-base"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            Voice library
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.fgSubtle} />
          </Pressable>
        </View>

        <View className="mb-3 gap-2">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or provider…"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="search" size={16} color={colors.fgMuted} />}
          />
          <View className="flex-row flex-wrap gap-2">
            {(['all', 'male', 'female', 'neutral'] as Gender[]).map((g) => (
              <Chip
                key={g}
                label={g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                selected={gender === g}
                onPress={() => setGender(g)}
              />
            ))}
          </View>
        </View>

        {voices.isPending ? (
          <View className="py-10 items-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : voices.isError ? (
          <Text
            className="text-danger text-sm py-4"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {(voices.error as Error).message}
          </Text>
        ) : filtered.length === 0 ? (
          <View className="py-8 items-center">
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-sm"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              No voices match.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {grouped.map(([providerName, list]) => (
              <View key={providerName} className="mb-3">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5 px-1"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {providerName}
                </Text>
                {list.map((v) => {
                  const selected = v.voiceId === selectedVoiceId;
                  const isPlaying = playingId === v._id;
                  return (
                    <Pressable
                      key={v._id}
                      onPress={() => onPick(v)}
                      className={cn(
                        'flex-row items-center px-3 py-2.5 rounded-lg mb-1.5',
                        selected
                          ? 'bg-accent-soft dark:bg-accent-soft-dark'
                          : 'bg-surface-2 dark:bg-surface-2-dark',
                      )}
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                          style={{ fontFamily: 'Inter_500Medium' }}
                          numberOfLines={1}
                        >
                          {v.name}
                        </Text>
                        <Text
                          className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
                          style={{ fontFamily: 'Inter_400Regular' }}
                          numberOfLines={1}
                        >
                          {[v.gender, v.age, v.languages?.[0]]
                            .filter(Boolean)
                            .join(' · ') || v.voiceId}
                        </Text>
                      </View>
                      {v.sampleAudioUrl ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            void playPreview(v);
                          }}
                          hitSlop={8}
                          className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark items-center justify-center mr-2"
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={12}
                            color={colors.fg}
                          />
                        </Pressable>
                      ) : null}
                      {selected ? (
                        <Ionicons name="checkmark" size={16} color={colors.accent} />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={colors.fgSubtle}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}

        <View className="mt-2">
          <Button variant="secondary" fullWidth onPress={onClose}>
            Close
          </Button>
        </View>
      </Pressable>
    </Pressable>
  );
}
