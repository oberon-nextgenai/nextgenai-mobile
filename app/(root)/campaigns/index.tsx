import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/Card';
import { Tag, type TagTone } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useActiveOrg } from '@/store/org';
import { useCampaigns } from '@/api/hooks/campaignHooks';
import { fmtRelative } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

const STATUS_TONE: Record<string, TagTone> = {
  active: 'success',
  scheduled: 'warning',
  draft: 'neutral',
  completed: 'success',
  paused: 'warning',
  failed: 'danger',
  cancelled: 'danger',
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
                className="mb-2 active:opacity-80"
              >
                {/* No gloss: this renders once per campaign in a scrolling list. */}
                <Card padding="sm">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text variant="display.sm" className="flex-1 pr-3" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Tag label={c.status} tone={tone} />
                  </View>
                  {c.description ? (
                    <Text variant="body.sm" tone="muted" className="mt-0.5" numberOfLines={2}>
                      {c.description}
                    </Text>
                  ) : null}
                  <View className="flex-row gap-4 mt-2">
                    <Text variant="mono.sm" tone="muted">
                      {c.contacts?.length ?? 0} contacts
                    </Text>
                    {c.updatedAt ? (
                      <Text variant="mono.sm" tone="muted">
                        Updated {fmtRelative(c.updatedAt)}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
