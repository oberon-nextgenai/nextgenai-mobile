import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useToolResults } from '@/store/toolResults';
import { fmtDateTime } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function ToolResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useToolResults((s) => (id ? s.byId[id] : undefined));
  const { colors } = useThemeMode();

  if (!record) {
    return (
      <Screen>
        <AppHeader title="Tool result" showBack showOrgPill={false} showNotifications={false} />
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={28} color={colors.warning} />}
          title="Result not available"
          description="This tool result is no longer in memory. Run the tool again to view fresh output."
        />
      </Screen>
    );
  }

  const isError = Boolean(record.error);

  return (
    <Screen>
      <AppHeader title={record.toolName} showBack showOrgPill={false} showNotifications={false} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row items-center mb-3">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${isError ? 'bg-danger' : 'bg-success'}`}
          />
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-sm"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {isError ? 'Failed' : 'Success'}
          </Text>
          <Text
            className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] ml-auto"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {fmtDateTime(record.createdAt)}
          </Text>
        </View>

        {record.arguments != null ? (
          <View className="mb-3">
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Arguments
            </Text>
            <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <Text className="text-fg dark:text-fg-dark-DEFAULT text-xs" style={{ fontFamily: 'Menlo' }}>
                {JSON.stringify(record.arguments, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}

        {record.error != null ? (
          <View className="mb-3">
            <Text
              className="text-danger text-[10px] uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Error
            </Text>
            <View className="bg-danger-soft border border-danger/40 rounded-xl p-3">
              <Text className="text-danger text-xs" style={{ fontFamily: 'Menlo' }}>
                {typeof record.error === 'string'
                  ? record.error
                  : JSON.stringify(record.error, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}

        {record.result != null ? (
          <View className="mb-3">
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Result
            </Text>
            <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <Text className="text-fg dark:text-fg-dark-DEFAULT text-xs" style={{ fontFamily: 'Menlo' }}>
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
