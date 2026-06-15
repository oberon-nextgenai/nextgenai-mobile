import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Pill } from '@/components/ui/Pill';
import { useActiveOrg } from '@/store/org';
import {
  useInstalledIntegrations,
  usePluginCatalog,
  usePluginCategories,
} from '@/api/hooks/pluginHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';
import { fmtRelative } from '@/lib/formatters';
import type { Integration, IntegrationStatus, Plugin } from '@/api/services/types';

type Tab = 'installed' | 'marketplace';

const TABS: { value: Tab; label: string }[] = [
  { value: 'installed', label: 'Installed' },
  { value: 'marketplace', label: 'Marketplace' },
];

function statusTone(s: IntegrationStatus): {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
  switch (s) {
    case 'active':
      return { label: 'Active', tone: 'success' };
    case 'authentication_required':
      return { label: 'Auth required', tone: 'warning' };
    case 'pending_setup':
      return { label: 'Setup pending', tone: 'warning' };
    case 'disabled':
      return { label: 'Disabled', tone: 'neutral' };
    case 'error':
      return { label: 'Error', tone: 'danger' };
    default:
      return { label: String(s ?? '—'), tone: 'neutral' };
  }
}

function PluginInitial({ plugin, size = 36 }: { plugin: Pick<Plugin, 'name' | 'icon'>; size?: number }) {
  const { colors } = useThemeMode();
  // Subtle 1px accent ring — the only marketplace decoration.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        borderWidth: 1,
        borderColor: colors.accent + '55',
      }}
      className="items-center justify-center bg-accent-soft dark:bg-accent-soft-dark"
    >
      <Text
        className="text-accent dark:text-accent-dark"
        style={{ fontFamily: 'Inter_700Bold', fontSize: size * 0.42 }}
      >
        {(plugin.name ?? '?').slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export default function PluginsIndexScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const [tab, setTab] = useState<Tab>('installed');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  const installed = useInstalledIntegrations(activeOrgId);
  const catalogFilter = useMemo(
    () => ({ search: search.trim() || undefined, category }),
    [search, category],
  );
  const catalog = usePluginCatalog(tab === 'marketplace' ? catalogFilter : undefined);
  const categories = usePluginCategories();

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Plugins & integrations" showBack showOrgPill={false} />
      <View className="px-4 pt-3 pb-2">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>

      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : tab === 'installed' ? (
        installed.isPending ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : installed.isError ? (
          <ErrorState
            message={(installed.error as Error).message}
            onRetry={() => installed.refetch()}
          />
        ) : (installed.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Ionicons name="extension-puzzle-outline" size={28} color={colors.accent} />}
            title="No integrations installed"
            description="Visit the Marketplace tab to install your first plugin."
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={installed.isFetching}
                onRefresh={() => installed.refetch()}
                tintColor={colors.accent}
              />
            }
          >
            {(installed.data ?? []).map((i: Integration) => {
              const status = statusTone(i.status);
              return (
                <Pressable
                  key={i._id}
                  onPress={() => router.push(`/plugins/${i._id}` as never)}
                  className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2 active:bg-accent-soft dark:active:bg-accent-soft-dark"
                >
                  <PluginInitial plugin={{ name: i.name, icon: undefined }} size={36} />
                  <View className="flex-1 mx-3">
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                      numberOfLines={1}
                    >
                      {i.name}
                    </Text>
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {i.type}
                      {i.metadata?.last_sync
                        ? ` · synced ${fmtRelative(i.metadata.last_sync)}`
                        : ''}
                    </Text>
                  </View>
                  <Pill tone={status.tone}>{status.label}</Pill>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.fgSubtle}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={catalog.isFetching}
              onRefresh={() => catalog.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          <View className="mb-3">
            <Input
              placeholder="Search plugins…"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="search" size={16} color={colors.fgMuted} />}
            />
          </View>

          {categories.data && categories.data.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                <Chip
                  label="All"
                  selected={!category}
                  onPress={() => setCategory(undefined)}
                />
                {categories.data.map((c) => (
                  <Chip
                    key={c.name}
                    label={c.count != null ? `${c.name} (${c.count})` : c.name}
                    selected={category === c.name}
                    onPress={() => setCategory(c.name)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

          {catalog.isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : catalog.isError ? (
            <ErrorState
              message={(catalog.error as Error).message}
              onRetry={() => catalog.refetch()}
            />
          ) : (catalog.data ?? []).length === 0 ? (
            <EmptyState
              title="No plugins match"
              description={search ? `Nothing matches "${search}"` : 'Try a different category.'}
            />
          ) : (
            <View className="flex-row flex-wrap -mx-1.5">
              {(catalog.data ?? []).map((p) => {
                const oauth = p.authType === 'oauth2';
                return (
                  <View key={p.type} className="w-1/2 px-1.5 mb-3">
                    <Pressable
                      onPress={() =>
                        oauth ? undefined : router.push(`/plugins/install/${p.type}` as never)
                      }
                      disabled={oauth}
                      className={cn(
                        'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-3.5',
                        oauth && 'opacity-80',
                      )}
                    >
                      <View className="flex-row items-center mb-2">
                        <PluginInitial plugin={p} size={32} />
                        {oauth ? (
                          <View className="ml-auto">
                            <Pill tone="warning">OAuth</Pill>
                          </View>
                        ) : (
                          <View className="ml-auto">
                            <Pill tone={p.authType === 'none' ? 'success' : 'neutral'}>
                              {p.authType === 'none' ? 'Ready' : 'API key'}
                            </Pill>
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                        style={{ fontFamily: 'Inter_600SemiBold' }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      {p.description ? (
                        <Text
                          className="text-fg-muted dark:text-fg-dark-muted text-xs mt-1 leading-4"
                          style={{ fontFamily: 'Inter_400Regular' }}
                          numberOfLines={2}
                        >
                          {p.description}
                        </Text>
                      ) : null}
                      <View className="mt-2.5">
                        <Text
                          className={cn(
                            'text-xs',
                            oauth
                              ? 'text-fg-subtle dark:text-fg-dark-subtle'
                              : 'text-accent dark:text-accent-dark',
                          )}
                          style={{ fontFamily: 'Inter_600SemiBold' }}
                        >
                          {oauth ? 'Configure on web' : 'Install →'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
