import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { ErrorState } from '@/components/common/ErrorState';
import { useActiveOrg } from '@/store/org';
import { useAgent } from '@/api/hooks/agentHooks';
import { useUpdateAgent } from '@/api/hooks/agentMutations';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function EditPromptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const agent = useAgent(activeOrgId, id);
  const update = useUpdateAgent({ orgId: activeOrgId ?? '', id: id ?? '' });
  const [prompt, setPrompt] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (agent.data && !seeded) {
      setPrompt(agent.data.systemPrompt ?? '');
      setSeeded(true);
    }
  }, [agent.data, seeded]);

  const headerRight = (
    <View className="flex-row items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => router.back()}
        disabled={update.isPending}
      >
        Cancel
      </Button>
      <Button
        size="sm"
        loading={update.isPending}
        disabled={!seeded || prompt === (agent.data?.systemPrompt ?? '')}
        onPress={async () => {
          try {
            await update.mutateAsync({ systemPrompt: prompt });
            router.back();
          } catch {
            // toast handled
          }
        }}
      >
        Save
      </Button>
    </View>
  );

  return (
    <Screen avoidKeyboard>
      <AppHeader
        title="System prompt"
        showBack={false}
        showOrgPill={false}
        showNotifications={false}
        right={headerRight}
      />
      {agent.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : agent.isError ? (
        <ErrorState
          message={(agent.error as Error).message}
          onRetry={() => agent.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-xs mb-3"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Markdown-style headers are supported. Prime re-reads this on the next call.
          </Text>
          <TextArea
            value={prompt}
            onChangeText={setPrompt}
            placeholder="### BEHAVIOUR\n…\n\n### PERSONALITY\n…"
            monospace
            minLines={18}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
