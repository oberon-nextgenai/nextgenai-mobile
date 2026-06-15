import { View } from 'react-native';
import { Logo } from './Logo';
import { Wordmark } from './Wordmark';

interface AppMarkProps {
  size?: number;
  variant?: 'full' | 'compact';
}

/**
 * Logo + Wordmark lockup. `compact` is used in the app header; `full` is
 * used on the sign-in screen and in Settings → About.
 */
export function AppMark({ size = 32, variant = 'full' }: AppMarkProps) {
  return (
    <View className="flex-row items-center gap-3">
      <Logo size={size} />
      <Wordmark variant={variant} />
    </View>
  );
}
