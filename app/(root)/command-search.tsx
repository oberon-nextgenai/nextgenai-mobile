import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { MoreMenuRow } from '@/components/executive/MoreMenuRow';
import { useAgentsList } from '@/api/hooks/agentHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  run: () => void;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <Text
      className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2 mt-5 px-1"
      style={{ fontFamily: 'Inter_500Medium' }}
    >
      {children}
    </Text>
  );
}

export default function CommandSearchScreen() {
  const { colors } = useThemeMode();
  const { activeOrgId } = useActiveOrg();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const agentsQuery = useAgentsList({
    orgId: activeOrgId,
    search: debounced.length > 0 ? debounced : undefined,
  });
  const agentResults = useMemo(
    () =>
      debounced.length > 0
        ? (agentsQuery.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 8)
        : [],
    [agentsQuery.data, debounced],
  );

  // Navigate out of the modal (replace drops the search from history).
  const leave = (target: Parameters<typeof router.replace>[0]) => {
    router.replace(target);
  };

  const actions: QuickAction[] = [
    {
      icon: 'sparkles-outline',
      label: 'Ask Prime',
      description: query ? `Ask: “${query}”` : 'Open the command chat',
      run: () =>
        leave({
          pathname: '/(root)/(tabs)/prime',
          params: query ? { prompt: query } : {},
        } as never),
    },
    {
      icon: 'document-text-outline',
      label: 'Draft a board update',
      description: 'Generate a reviewable board update',
      run: () =>
        leave({
          pathname: '/(root)/(tabs)/prime',
          params: { prompt: 'Draft a board update for this week.' },
        } as never),
    },
    {
      icon: 'alert-circle-outline',
      label: 'Show SLA risks',
      description: 'Which agents need attention',
      run: () => leave('/(root)/(tabs)/workforce' as never),
    },
    {
      icon: 'bar-chart-outline',
      label: 'Open analytics',
      description: 'Outcomes & operational metrics',
      run: () => leave('/(root)/(tabs)/analytics' as never),
    },
  ];

  return (
    <Screen background="nebula">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <View className="flex-1 flex-row items-center bg-surface-2 dark:bg-surface-2-dark rounded-full px-4 py-2.5 border border-border dark:border-border-dark">
          <Ionicons name="search" size={18} color={colors.fgMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search agents, actions…"
            placeholderTextColor={colors.fgSubtle}
            returnKeyType="search"
            className="flex-1 text-fg dark:text-fg-dark-DEFAULT text-[15px] ml-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={18} color={colors.fgSubtle} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close search"
        >
          <Text
            className="text-accent-2 dark:text-accent-2-dark text-[15px]"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {agentResults.length > 0 ? (
          <>
            <GroupLabel>Agents</GroupLabel>
            <View className="gap-2">
              {agentResults.map((a) => (
                <MoreMenuRow
                  key={a._id ?? a.id ?? a.name}
                  icon="person-circle-outline"
                  label={a.name}
                  description={a.type ? `${a.type} agent` : undefined}
                  onPress={() =>
                    leave(
                      `/(root)/(tabs)/workforce/${a._id ?? a.id}` as never,
                    )
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        <GroupLabel>Actions</GroupLabel>
        <View className="gap-2">
          {actions.map((act) => (
            <MoreMenuRow
              key={act.label}
              icon={act.icon}
              label={act.label}
              description={act.description}
              onPress={act.run}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
