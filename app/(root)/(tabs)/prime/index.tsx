import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
import { Logo } from '@/components/brand/Logo';
import { ChatList } from '@/components/prime/ChatList';
import { Composer } from '@/components/prime/Composer';
import { usePrimeChat } from '@/api/hooks/chatHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { PrimeAction } from '@/lib/primeStructuredSchema';

const SUGGESTED_PROMPTS = [
  'Summarize what happened overnight',
  'Which agents need my attention?',
  'Draft a board update',
  'Show me the biggest cost drivers',
];

export default function PrimeScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const {
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    streamingContent,
    handleSubmit,
    clearMessages,
  } = usePrimeChat(activeOrgId);

  useEffect(() => {
    clearMessages();
  }, [activeOrgId, clearMessages]);

  // Seed the composer from a deep-linked prompt (e.g. "Ask Prime about this agent").
  const seededPrompt = useRef<string | null>(null);
  useEffect(() => {
    if (prompt && seededPrompt.current !== prompt) {
      seededPrompt.current = prompt;
      setInputValue(prompt);
    }
  }, [prompt, setInputValue]);

  const handleAction = useCallback(
    (a: PrimeAction) => {
      if (a.href) {
        router.push(a.href as never);
      } else if (a.prompt) {
        // Suggestion chips are send-ready replies — send immediately, don't just prefill.
        void handleSubmit(a.prompt);
      }
    },
    [router, handleSubmit],
  );

  const headerRight = (
    <IconButton
      icon="time-outline"
      size={36}
      onPress={() => router.push('/(root)/(tabs)/prime/history')}
    />
  );

  return (
    <Screen avoidKeyboard background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader brand right={headerRight} />
      {!activeOrgId ? (
        <EmptyState
          icon={<Ionicons name="business-outline" size={32} color={colors.accent} />}
          title="Choose an organization"
          description="Prime needs an active organization to take actions on your behalf."
        />
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="opacity-60 mb-4">
            <Logo size={56} />
          </View>
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-base text-center"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Ask Prime anything
          </Text>
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-sm text-center mt-1.5 max-w-[300px]"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Prime can manage agents, campaigns, tasks, knowledge bases, and surface analytics —
            all from chat.
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2 mt-5 max-w-[340px]">
            {SUGGESTED_PROMPTS.map((p) => (
              <Chip
                key={p}
                label={p}
                leftIcon={
                  <Ionicons name="sparkles-outline" size={13} color={colors.accent2} />
                }
                onPress={() => handleSubmit(p)}
              />
            ))}
          </View>
        </View>
      ) : (
        <ChatList
          messages={messages}
          streamingContent={streamingContent}
          onAction={handleAction}
        />
      )}
      <Composer
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => handleSubmit()}
        isStreaming={isStreaming}
        disabled={!activeOrgId}
      />
    </Screen>
  );
}
