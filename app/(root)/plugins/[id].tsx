import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SchemaForm } from '@/components/ui/SchemaForm';
import { SectionCard } from '@/components/ui/SectionCard';
import { StickyAction } from '@/components/ui/StickyAction';
import { Pill } from '@/components/ui/Pill';
import { useActiveOrg } from '@/store/org';
import {
  useIntegration,
  usePlugin,
  useTestIntegration,
  useUninstallIntegration,
  useUpdateIntegration,
} from '@/api/hooks/pluginHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtRelative } from '@/lib/formatters';
import type { IntegrationStatus } from '@/api/services/types';

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

export default function PluginConfigureScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const integration = useIntegration(activeOrgId, id);
  const plugin = usePlugin(integration.data?.type ?? null);
  const update = useUpdateIntegration({ orgId: activeOrgId ?? '', id: id ?? '' });
  const uninstall = useUninstallIntegration({ orgId: activeOrgId ?? '', id: id ?? '' });
  const test = useTestIntegration({ orgId: activeOrgId ?? '', id: id ?? '' });

  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [pristineName, setPristineName] = useState('');
  const [pristineConfig, setPristineConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (integration.data) {
      setName(integration.data.name ?? '');
      setConfig(integration.data.configuration ?? {});
      setPristineName(integration.data.name ?? '');
      setPristineConfig(integration.data.configuration ?? {});
    }
  }, [integration.data]);

  const isDirty = useMemo(() => {
    return (
      name !== pristineName ||
      JSON.stringify(config) !== JSON.stringify(pristineConfig)
    );
  }, [name, config, pristineName, pristineConfig]);

  const status = integration.data ? statusTone(integration.data.status) : null;

  if (integration.isPending) {
    return (
      <Screen>
        <AppHeader title="Plugin" showBack showOrgPill={false} />
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }
  if (integration.isError || !integration.data) {
    return (
      <Screen>
        <AppHeader title="Plugin" showBack showOrgPill={false} />
        <ErrorState
          message={(integration.error as Error)?.message ?? 'Integration not found'}
          onRetry={() => integration.refetch()}
        />
      </Screen>
    );
  }

  const i = integration.data;

  const handleSave = async () => {
    try {
      await update.mutateAsync({ name, configuration: config });
      setPristineName(name);
      setPristineConfig(config);
    } catch {
      // toast
    }
  };

  const onUninstall = () => {
    Alert.alert('Uninstall plugin?', `This removes "${i.name}" from this organization.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Uninstall',
        style: 'destructive',
        onPress: async () => {
          try {
            await uninstall.mutateAsync();
            router.back();
          } catch {
            // toast
          }
        },
      },
    ]);
  };

  return (
    <Screen avoidKeyboard edges={{ top: true, bottom: false }}>
      <AppHeader title={i.name} showBack showOrgPill={false} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isDirty ? 100 : 24 }}
      >
        <View className="flex-row items-center mb-4 mt-1">
          <View className="w-12 h-12 rounded-xl bg-accent-soft dark:bg-accent-soft-dark border border-accent/30 dark:border-accent-dark/40 items-center justify-center">
            <Text
              className="text-accent dark:text-accent-dark text-lg"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {(i.name ?? i.type ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 ml-3">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-lg"
              style={{ fontFamily: 'Inter_700Bold' }}
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
          {status ? <Pill tone={status.tone}>{status.label}</Pill> : null}
        </View>

        <SectionCard label="Identity">
          <Input label="Connection name" value={name} onChangeText={setName} />
        </SectionCard>

        <SectionCard label="Configuration">
          {plugin.data?.configSchema ? (
            <SchemaForm
              schema={plugin.data.configSchema}
              values={config}
              onChange={setConfig}
            />
          ) : (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-sm"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              No configurable fields.
            </Text>
          )}
        </SectionCard>

        <SectionCard label="Connection">
          <Button
            variant="secondary"
            fullWidth
            loading={test.isPending}
            onPress={() => test.mutate()}
            leftIcon={<Ionicons name="pulse-outline" size={15} color={colors.fg} />}
          >
            Test connection
          </Button>
          {i.metadata?.last_error ? (
            <Text
              className="text-danger text-xs mt-2"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Last error: {i.metadata.last_error}
            </Text>
          ) : null}
        </SectionCard>

        <SectionCard label="Danger zone">
          <Button
            variant="outline-danger"
            fullWidth
            loading={uninstall.isPending}
            onPress={onUninstall}
            leftIcon={<Ionicons name="trash-outline" size={15} color={colors.danger} />}
          >
            Uninstall plugin
          </Button>
        </SectionCard>
      </ScrollView>

      <StickyAction
        visible={isDirty}
        saving={update.isPending}
        onCancel={() => {
          setName(pristineName);
          setConfig(pristineConfig);
        }}
        onSave={handleSave}
      />
    </Screen>
  );
}
