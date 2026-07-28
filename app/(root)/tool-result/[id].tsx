import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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
          <Text variant="mono.label" tone={isError ? 'danger' : 'success'}>
            {isError ? 'Failed' : 'Success'}
          </Text>
          <Text variant="mono.sm" tone="subtle" className="ml-auto">
            {fmtDateTime(record.createdAt)}
          </Text>
        </View>

        {record.arguments != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="muted" className="mb-1.5">
              Arguments
            </Text>
            <Card padding="sm">
              <Text variant="mono.code">{JSON.stringify(record.arguments, null, 2)}</Text>
            </Card>
          </View>
        ) : null}

        {record.error != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="danger" className="mb-1.5">
              Error
            </Text>
            <View className="bg-danger-soft border border-danger/40 rounded-xl p-3">
              <Text variant="mono.code" tone="danger">
                {typeof record.error === 'string'
                  ? record.error
                  : JSON.stringify(record.error, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}

        {record.result != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="muted" className="mb-1.5">
              Result
            </Text>
            <Card padding="sm">
              <Text variant="mono.code">
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
