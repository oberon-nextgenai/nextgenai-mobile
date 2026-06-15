import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  const { colors } = useThemeMode();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      className={cn('flex-row items-center', className)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        className={cn(
          'w-[18px] h-[18px] rounded-[5px] border items-center justify-center',
          checked
            ? 'bg-accent border-accent dark:bg-accent-dark dark:border-accent-dark'
            : 'bg-surface border-border dark:bg-surface-dark dark:border-border-dark',
        )}
      >
        {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
      </View>
      {label ? (
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-sm ml-2"
          style={{ fontFamily: 'Inter_500Medium', color: colors.fg }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
