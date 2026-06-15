import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SchemaForm } from '@/components/ui/SchemaForm';
import { useActiveOrg } from '@/store/org';
import { useInstallIntegration, usePlugin } from '@/api/hooks/pluginHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { PluginConfigField } from '@/api/services/types';

function defaultsFor(schema?: Record<string, PluginConfigField>): Record<string, unknown> {
  if (!schema) return {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (field.default !== undefined) out[key] = field.default;
  }
  return out;
}

function validate(
  schema: Record<string, PluginConfigField> | undefined,
  values: Record<string, unknown>,
): Record<string, string | undefined> {
  if (!schema) return {};
  const errors: Record<string, string | undefined> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (!field.required) continue;
    const v = values[key];
    if (v == null || v === '') errors[key] = 'Required';
  }
  return errors;
}

export default function PluginInstallScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const plugin = usePlugin(type ?? null);
  const install = useInstallIntegration({ orgId: activeOrgId ?? '' });

  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (plugin.data && !seeded) {
      setName(plugin.data.name ?? '');
      setConfig(defaultsFor(plugin.data.configSchema));
      setSeeded(true);
    }
  }, [plugin.data, seeded]);

  const isOauth = plugin.data?.authType === 'oauth2';

  const handleInstall = async () => {
    const fieldErrors = validate(plugin.data?.configSchema, config);
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some(Boolean)) return;
    if (!name.trim()) {
      setErrors({ ...fieldErrors, __name: 'Required' });
      return;
    }
    try {
      const integration = await install.mutateAsync({
        type: type as string,
        name: name.trim(),
        config,
      });
      router.replace(`/plugins/${integration._id}` as never);
    } catch {
      // toast handled
    }
  };

  return (
    <Screen avoidKeyboard>
      <AppHeader title="Install plugin" showBack showOrgPill={false} showNotifications={false} />
      {plugin.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : plugin.isError || !plugin.data ? (
        <ErrorState
          message={(plugin.error as Error)?.message ?? 'Plugin not found'}
          onRetry={() => plugin.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-xl bg-accent-soft dark:bg-accent-soft-dark border border-accent/30 dark:border-accent-dark/40 items-center justify-center">
              <Text
                className="text-accent dark:text-accent-dark text-lg"
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                {(plugin.data.name ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 ml-3">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-lg"
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                {plugin.data.name}
              </Text>
              {plugin.data.description ? (
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                  style={{ fontFamily: 'Inter_400Regular' }}
                  numberOfLines={3}
                >
                  {plugin.data.description}
                </Text>
              ) : null}
            </View>
          </View>

          {isOauth ? (
            <View className="bg-warning-soft border border-warning/40 rounded-xl p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text
                  className="text-warning text-sm ml-2 flex-1 leading-5"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  This integration uses OAuth and must be set up on the web app for now. We&apos;re
                  bringing mobile OAuth in a future update.
                </Text>
              </View>
              <Button
                variant="secondary"
                fullWidth
                className="mt-4"
                onPress={() => router.back()}
              >
                Close
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <Input
                label="Connection name *"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setErrors({ ...errors, __name: undefined });
                }}
                placeholder={plugin.data.name}
                error={errors.__name}
              />
              <SchemaForm
                schema={plugin.data.configSchema ?? {}}
                values={config}
                onChange={(v) => {
                  setConfig(v);
                  // Clear errors for fields that now have a value
                  const cleared = { ...errors };
                  for (const k of Object.keys(v)) {
                    if (v[k] != null && v[k] !== '') cleared[k] = undefined;
                  }
                  setErrors(cleared);
                }}
                errors={errors}
              />
              <Button
                fullWidth
                onPress={handleInstall}
                loading={install.isPending}
              >
                Install
              </Button>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
