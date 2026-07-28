import { Platform, Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeMode } from '@/hooks/useThemeMode';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useEscalationCounts } from '@/api/hooks/escalationHooks';
import { useActiveOrg } from '@/store/org';

/**
 * The CEO command app exposes five calm destinations. Admin surfaces
 * (dashboard, analytics, agents, settings) stay registered so every deep link
 * keeps working, but are hidden from the bar and reached via the More tab.
 *
 * The bar renders from this static list (not `state.routes`) so the tabs
 * always appear and navigate by name, regardless of navigator state timing.
 */
const TABS: {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Renders the live count of items waiting on a decision. */
  badge?: boolean;
}[] = [
  { name: 'brief', title: 'Brief', icon: 'today-outline' },
  { name: 'workforce', title: 'Workforce', icon: 'people-outline' },
  { name: 'prime', title: 'Prime', icon: 'sparkles-outline' },
  { name: 'approvals', title: 'Approvals', icon: 'checkmark-circle-outline', badge: true },
  { name: 'more', title: 'More', icon: 'apps-outline' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const { activeOrgId } = useActiveOrg();
  // Cached ~20s server-side and client-side, so this is cheap despite living on
  // every screen. It is the one number the app is always showing you.
  const { data: counts } = useEscalationCounts(activeOrgId);

  return (
    <GlassSurface border="top" radius={0} elevation="lg" intensity={40}>
      <View
        className="flex-row px-1.5 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {TABS.map((tab) => {
          const focused = tab.name === activeName;
          const onPress = () => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            const target = state.routes.find((r) => r.name === tab.name);
            if (target) {
              const event = navigation.emit({
                type: 'tabPress',
                target: target.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(tab.name as never);
              }
            } else {
              navigation.navigate(tab.name as never);
            }
          };
          return (
            <Pressable
              key={tab.name}
              onPress={onPress}
              className="flex-1 items-center pt-1"
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={tab.title}
            >
              <View
                className={cn(
                  'items-center justify-center px-3.5 py-1.5 rounded-full',
                  focused ? 'bg-accent-2-soft dark:bg-accent-2-soft-dark' : null,
                )}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={focused ? colors.accent2 : colors.fgMuted}
                />
                {tab.badge && counts && counts.total > 0 ? (
                  <View
                    className="absolute -right-0.5 -top-0.5 min-w-[16px] items-center justify-center rounded-full px-1"
                    style={{ backgroundColor: colors.danger, height: 16 }}
                  >
                    <Text variant="mono.label" tone="onAccent">
                      {counts.total > 9 ? '9+' : String(counts.total)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                variant="mono.label"
                tone={focused ? 'accent' : 'muted'}
                className="mt-1"
                numberOfLines={1}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {/* Primary CEO destinations */}
      <Tabs.Screen name="brief" options={{ title: 'Brief' }} />
      <Tabs.Screen name="workforce" options={{ title: 'Workforce' }} />
      <Tabs.Screen name="prime" options={{ title: 'Prime' }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      {/* Registered but hidden — reachable from More, deep links preserved */}
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
