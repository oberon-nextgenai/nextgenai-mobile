import { Fragment, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useActiveOrg, useOrgStore } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Past this many, scanning beats scrolling — so the filter appears. */
const SEARCH_THRESHOLD = 8;

function initials(name: string): string {
  const parts = name.trim().split(/[\s./-]+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
}

function OrgRow({
  name,
  active,
  onPress,
}: {
  name: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.99 });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `${name}, current organization` : name}
      style={[press.animatedStyle, active ? { backgroundColor: colors.chipSelectedBg } : null]}
      className="flex-row items-center rounded-xl px-3 py-2.5"
    >
      {/* A tinted tile rather than a coloured disc: nine saturated circles read
          as decoration and fight the palette. The active row carries the accent. */}
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: active ? colors.accent : colors.surface2 }}
      >
        <Text variant="mono.label" tone={active ? 'onAccent' : 'accent'}>
          {initials(name)}
        </Text>
      </View>

      <Text
        variant="body.medium"
        tone={active ? 'accent' : 'default'}
        className="ml-3 flex-1"
        numberOfLines={1}
      >
        {name}
      </Text>

      {active ? <Ionicons name="checkmark" size={17} color={colors.accent2} /> : null}
    </AnimatedPressable>
  );
}

export default function OrgSwitcherScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useThemeMode();
  const { organizations, activeOrgId } = useActiveOrg();
  const switchOrg = useOrgStore(s => s.switchOrg);
  const [query, setQuery] = useState('');

  const showSearch = organizations.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(o => o.name?.toLowerCase().includes(q));
  }, [organizations, query]);

  const handleSelect = async (orgId: string) => {
    if (orgId === activeOrgId) {
      router.back();
      return;
    }
    // Evict every cached entry keyed by the outgoing org before switching, so no
    // screen can briefly render the previous tenant's data under the new one.
    if (activeOrgId) {
      const stale = activeOrgId;
      qc.removeQueries({ predicate: q => q.queryKey.some(k => k === stale) });
    }
    await switchOrg(orgId);
    router.back();
  };

  return (
    <Screen background="nebula">
      <View className="flex-row items-start justify-between px-4 pt-4 pb-3">
        <View className="flex-1 pr-3">
          <Text variant="mono.label" tone="subtle">
            Organization
          </Text>
          <Text variant="display.lg" className="mt-2">
            Switch workspace
          </Text>
        </View>
        <IconButton icon="close" size={36} onPress={() => router.back()} />
      </View>

      {showSearch ? (
        <View className="px-4 pb-3">
          <Input
            placeholder="Find an organization"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="search" size={16} color={colors.fgMuted} />}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {organizations.length === 0 ? (
          <Text variant="body.md" tone="muted" className="text-center mt-8">
            No organizations available for your account.
          </Text>
        ) : filtered.length === 0 ? (
          <Text variant="body.md" tone="muted" className="text-center mt-8">
            {`No organization matches “${query.trim()}”.`}
          </Text>
        ) : (
          // One card with hairline dividers, not one card per organization —
          // nine bordered blocks is what made this feel tall and loose.
          <Card padding="sm">
            {filtered.map((o, i) => (
              <Fragment key={o._id}>
                {i > 0 ? (
                  <View
                    className="h-px mx-3"
                    style={{ backgroundColor: colors.borderSubtle }}
                  />
                ) : null}
                <OrgRow
                  name={o.name}
                  active={o._id === activeOrgId}
                  onPress={() => handleSelect(o._id)}
                />
              </Fragment>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
