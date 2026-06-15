import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useActiveOrg } from '@/store/org';
import { useCampaigns } from '@/api/hooks/campaignHooks';
import { fmtRelative } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

const STATUS_TONE: Record<string, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  active: 'positive',
  scheduled: 'warning',
  draft: 'neutral',
  completed: 'positive',
  paused: 'warning',
  failed: 'negative',
  cancelled: 'negative',
};

const TONE_BG: Record<string, string> = {
  positive: 'bg-success-soft',
  warning: 'bg-warning-soft',
  negative: 'bg-danger-soft',
  neutral: 'bg-surface-2 dark:bg-surface-2-dark',
};
const TONE_FG: Record<string, string> = {
  positive: 'text-success',
  warning: 'text-warning',
  negative: 'text-danger',
  neutral: 'text-fg-muted dark:text-fg-dark-muted',
};

export default function CampaignsListScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useCampaigns(activeOrgId);

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Campaigns" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : q.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          variant="accent"
          icon={<Ionicons name="megaphone-outline" size={22} color={colors.accent} />}
          title="No campaigns"
          description="Outbound campaigns appear here once they're created on the web."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          {(q.data ?? []).map((c) => {
            const tone = STATUS_TONE[c.status] ?? 'neutral';
            return (
              <Pressable
                key={c._id}
                onPress={() => router.push(`/(root)/campaigns/${c._id}` as never)}
                className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2 active:opacity-80"
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1 pr-3"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${TONE_BG[tone]}`}>
                    <Text
                      className={`text-[10px] uppercase tracking-wider ${TONE_FG[tone]}`}
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {c.status}
                    </Text>
                  </View>
                </View>
                {c.description ? (
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={2}
                  >
                    {c.description}
                  </Text>
                ) : null}
                <View className="flex-row gap-4 mt-2">
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-[11px]"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {c.contacts?.length ?? 0} contacts
                  </Text>
                  {c.updatedAt ? (
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-[11px]"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      Updated {fmtRelative(c.updatedAt)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
