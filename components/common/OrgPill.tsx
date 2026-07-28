import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useActiveOrg } from '@/store/org';

export function OrgPill() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { active, organizations } = useActiveOrg();
  if (!organizations.length) return null;
  const label = active?.name ?? 'Select org';

  return (
    <Pressable
      onPress={() => router.push('/org-switcher')}
      className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-full pl-2 pr-2 py-1"
    >
      <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
      <Text numberOfLines={1} variant="body.xs" className="max-w-[140px]">
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={12}
        color={colors.fgSubtle}
        style={{ marginLeft: 4 }}
      />
    </Pressable>
  );
}
