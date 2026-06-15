import { Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeMode } from '@/hooks/useThemeMode';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { cn } from '@/lib/cn';

const ICON_BY_NAME: Record<string, keyof typeof Ionicons.glyphMap> = {
  prime: 'chatbubble-ellipses-outline',
  dashboard: 'grid-outline',
  analytics: 'bar-chart-outline',
  agents: 'people-outline',
  settings: 'settings-outline',
};

const ACCENT_BY_NAME: Record<string, 'accent' | 'accent-2'> = {
  prime: 'accent',
  dashboard: 'accent',
  analytics: 'accent',
  agents: 'accent-2',
  settings: 'accent',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();
  return (
    <GlassSurface border="top" radius={0} elevation="lg" intensity={40}>
      <View
        className="flex-row px-1.5 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const iconName = ICON_BY_NAME[route.name] ?? 'ellipse-outline';
        const accentKey = ACCENT_BY_NAME[route.name] ?? 'accent';
        const accentColor =
          accentKey === 'accent-2' ? colors.accent2 : colors.accent;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center pt-1"
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <View
              className={cn(
                'items-center justify-center px-3.5 py-1.5 rounded-full',
                focused
                  ? accentKey === 'accent-2'
                    ? 'bg-accent-2-soft dark:bg-accent-2-soft-dark'
                    : 'bg-accent-soft dark:bg-accent-soft-dark'
                  : null,
              )}
            >
              <Ionicons
                name={iconName}
                size={18}
                color={focused ? accentColor : colors.fgMuted}
              />
            </View>
            <Text
              className={cn(
                'text-[10px] uppercase tracking-widest mt-1',
                focused
                  ? accentKey === 'accent-2'
                    ? 'text-accent-2 dark:text-accent-2-dark'
                    : 'text-accent dark:text-accent-dark'
                  : 'text-fg-muted dark:text-fg-dark-muted',
              )}
              style={{ fontFamily: 'Inter_500Medium' }}
              numberOfLines={1}
            >
              {String(options.title ?? route.name)}
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
      <Tabs.Screen name="prime" options={{ title: 'Prime' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
