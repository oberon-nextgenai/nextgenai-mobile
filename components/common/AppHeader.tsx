import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/brand/Logo';
import { Wordmark } from '@/components/brand/Wordmark';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Text } from '@/components/ui/Text';
import { OrgPill } from './OrgPill';
import { NotificationBell } from './NotificationBell';
import { useThemeMode } from '@/hooks/useThemeMode';

interface AppHeaderProps {
  /** Show the Prime brand lockup instead of a screen title. */
  brand?: boolean;
  title?: string;
  showBack?: boolean;
  /**
   * Where back lands when there is no history behind this screen — a cold
   * deep link, or a modal reached via `replace` (the web build hits this
   * constantly). Without it the back button is silently dead.
   */
  backFallback?: string;
  showOrgPill?: boolean;
  showNotifications?: boolean;
  right?: ReactNode;
}

export function AppHeader({
  brand,
  title,
  showBack,
  backFallback = '/(root)/(tabs)/brief',
  showOrgPill = true,
  showNotifications = true,
  right,
}: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useThemeMode();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(backFallback as never);
  };

  return (
    <GlassSurface
      border="bottom"
      radius={0}
      elevation="sm"
      className="flex-row items-center justify-between px-4 py-3"
    >
      <View className="flex-row items-center flex-1">
        {showBack ? (
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-9 h-9 items-center justify-center rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark mr-3"
          >
            <Ionicons name="chevron-back" size={18} color={colors.fg} />
          </Pressable>
        ) : null}
        {brand ? (
          <View className="flex-row items-center gap-2.5">
            <Logo size={30} />
            <Wordmark variant="compact" />
          </View>
        ) : title ? (
          <Text variant="mono.labelLg" tone="muted" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        {showOrgPill ? <OrgPill /> : null}
        {right}
        {showNotifications ? <NotificationBell /> : null}
      </View>
    </GlassSurface>
  );
}
