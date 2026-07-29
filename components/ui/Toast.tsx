import { Pressable } from 'react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';

type PrimeToastTone = 'success' | 'danger';

interface PrimeToastProps extends ToastConfigParams<unknown> {
  tone: PrimeToastTone;
}

/**
 * The app's only toast surface.
 *
 * Stock `react-native-toast-message` renders its own `BaseToast`, which pulls in
 * its own `Text` and the platform system font — none of the three-family type
 * system (see `constants/Typography.ts`) reaches it. This is a `Card` instead:
 * Prime-tinted and glossed, same surface a tool result or an approval lives on,
 * with a mono eyebrow (the tool/source) over a sans message line.
 *
 * Wired up once, at the root: `<Toast config={toastConfig} />` in `app/_layout.tsx`.
 * Callers never touch this file — they just call `Toast.show({ type: 'success' | 'error', ... })`
 * and the right tone comes along for free.
 */
function PrimeToast({ text1, text2, onPress, tone }: PrimeToastProps) {
  const { colors } = useThemeMode();
  const rail = tone === 'danger' ? colors.danger : colors.success;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ width: '90%', maxWidth: 360 }}>
      <Card variant="prime" padding="sm" gloss rail={rail}>
        {text1 ? (
          <Text variant="mono.label" tone={tone}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text variant="body.sm" tone="muted" style={{ marginTop: 2 }}>
            {text2}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

/**
 * Only `success` and `error` are configured — those are the only two types
 * Prime's stream handling shows (`api/hooks/chatHooks.ts`). Falls back to the
 * library defaults for anything else rather than throwing.
 */
export const toastConfig: ToastConfig = {
  success: (params) => <PrimeToast {...params} tone="success" />,
  error: (params) => <PrimeToast {...params} tone="danger" />,
};
