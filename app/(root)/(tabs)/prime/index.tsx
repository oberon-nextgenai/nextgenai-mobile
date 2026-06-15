import { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from '@/components/brand/Logo';
import { ChatList } from '@/components/prime/ChatList';
import { Composer } from '@/components/prime/Composer';
import { usePrimeChat } from '@/api/hooks/chatHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { PrimeAction } from '@/lib/primeStructuredSchema';

export default function PrimeScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
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

  const handleAction = useCallback(
    (a: PrimeAction) => {
      if (a.href) {
        router.push(a.href as never);
      } else if (a.prompt) {
        setInputValue(a.prompt);
      }
    },
    [router, setInputValue],
  );

  const headerRight = (
    <IconButton
      icon="time-outline"
      size={36}
      onPress={() => router.push('/(root)/(tabs)/prime/history')}
    />
  );

  return (
    <Screen avoidKeyboard edges={{ top: true, bottom: false }}>
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
