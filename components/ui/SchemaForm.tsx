import { Pressable, Switch, Text, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Input } from './Input';
import { TextArea } from './TextArea';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { PluginConfigField } from '@/api/services/types';

interface SchemaFormProps {
  schema: Record<string, PluginConfigField>;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Field keys to highlight as errored (e.g. missing required). */
  errors?: Record<string, string | undefined>;
}

interface SelectSheetState {
  fieldKey: string;
  options: { value: string; label: string }[];
  selected: string;
}

/**
 * Renders a plugin `configSchema` as a vertical form. Each field's `type`
 * dispatches: string/number → Input; textarea → TextArea; boolean → Switch
 * row; select → tappable row that opens a lightweight option sheet.
 *
 * The form is fully controlled; the parent owns `values`. Returned values
 * are JSON-friendly primitives (string, number, boolean).
 */
export function SchemaForm({ schema, values, onChange, errors }: SchemaFormProps) {
  const { colors } = useThemeMode();
  const [sheet, setSheet] = useState<SelectSheetState | null>(null);

  const setField = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  const entries = Object.entries(schema);
  if (entries.length === 0) {
    return (
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-sm"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        This integration has no configurable fields.
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {entries.map(([key, field]) => {
        const raw = values[key];
        const error = errors?.[key];
        const required = !!field.required;

        if (field.type === 'boolean') {
          return (
            <View
              key={key}
              className="flex-row items-center justify-between bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark rounded-lg px-3 py-3"
            >
              <View className="flex-1 pr-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {field.label}
                  {required ? (
                    <Text className="text-danger"> *</Text>
                  ) : null}
                </Text>
                {field.description ? (
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {field.description}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={Boolean(raw ?? field.default ?? false)}
                onValueChange={(v) => setField(key, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
          );
        }

        if (field.type === 'select') {
          const selected = String(raw ?? field.default ?? '');
          const opt = field.options?.find((o) => o.value === selected);
          return (
            <View key={key} className="gap-1.5">
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs tracking-wide"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {field.label}
                {required ? <Text className="text-danger"> *</Text> : null}
              </Text>
              {field.description ? (
                <Text
                  className="text-fg-subtle dark:text-fg-dark-subtle text-xs"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {field.description}
                </Text>
              ) : null}
              <Pressable
                onPress={() =>
                  setSheet({
                    fieldKey: key,
                    options: field.options ?? [],
                    selected,
                  })
                }
                className={cn(
                  'flex-row items-center justify-between bg-surface dark:bg-surface-dark border rounded-lg px-3.5 py-3',
                  error
                    ? 'border-danger'
                    : 'border-border dark:border-border-dark',
                )}
              >
                <Text
                  className={cn(
                    'text-[15px]',
                    selected
                      ? 'text-fg dark:text-fg-dark-DEFAULT'
                      : 'text-fg-subtle dark:text-fg-dark-subtle',
                  )}
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {opt?.label ?? (selected || 'Select…')}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.fgMuted} />
              </Pressable>
              {error ? <Text className="text-danger text-xs">{error}</Text> : null}
            </View>
          );
        }

        if (field.type === 'textarea') {
          return (
            <TextArea
              key={key}
              label={field.label + (required ? ' *' : '')}
              description={field.description}
              value={typeof raw === 'string' ? raw : String(raw ?? field.default ?? '')}
              onChangeText={(v) => setField(key, v)}
              error={error}
              minLines={4}
            />
          );
        }

        // Default: string / number
        const isNumber = field.type === 'number';
        return (
          <Input
            key={key}
            label={field.label + (required ? ' *' : '')}
            value={
              raw == null ? String(field.default ?? '') : String(raw)
            }
            onChangeText={(v) => setField(key, isNumber ? (v === '' ? '' : Number(v)) : v)}
            keyboardType={isNumber ? 'numeric' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
          />
        );
      })}

      {sheet ? (
        <Pressable
          onPress={() => setSheet(null)}
          className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
        >
          <Pressable className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark rounded-t-3xl p-5">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-base mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {schema[sheet.fieldKey]?.label ?? 'Select'}
            </Text>
            {sheet.options.map((o) => {
              const selected = o.value === sheet.selected;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    setField(sheet.fieldKey, o.value);
                    setSheet(null);
                  }}
                  className={cn(
                    'flex-row items-center justify-between rounded-lg px-3 py-3 mb-2',
                    selected
                      ? 'bg-accent-soft dark:bg-accent-soft-dark'
                      : 'bg-surface-2 dark:bg-surface-2-dark',
                  )}
                >
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {o.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}
