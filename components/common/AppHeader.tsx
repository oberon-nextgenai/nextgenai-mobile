import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/brand/Logo';
import { Wordmark } from '@/components/brand/Wordmark';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { OrgPill } from './OrgPill';
import { NotificationBell } from './NotificationBell';
import { useThemeMode } from '@/hooks/useThemeMode';

interface AppHeaderProps {
  /** Show the Prime brand lockup instead of a screen title. */
  brand?: boolean;
  title?: string;
  showBack?: boolean;
  showOrgPill?: boolean;
  showNotifications?: boolean;
  right?: ReactNode;
}

export function AppHeader({
  brand,
  title,
  showBack,
  showOrgPill = true,
  showNotifications = true,
  right,
}: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useThemeMode();

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
            onPress={() => router.back()}
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
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-lg"
            style={{ fontFamily: 'Inter_600SemiBold' }}
            numberOfLines={1}
          >
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
