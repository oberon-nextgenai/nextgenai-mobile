import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActiveOrg } from '@/store/org';

export function OrgPill() {
  const router = useRouter();
  const { active, organizations } = useActiveOrg();
  if (!organizations.length) return null;
  const label = active?.name ?? 'Select org';

  return (
    <Pressable
      onPress={() => router.push('/org-switcher')}
      className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-full pl-2 pr-2 py-1"
    >
      <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
      <Text
        numberOfLines={1}
        className="text-fg dark:text-fg-dark-DEFAULT text-xs max-w-[140px]"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={12}
        color="#64748B"
        style={{ marginLeft: 4 }}
      />
    </Pressable>
  );
}
