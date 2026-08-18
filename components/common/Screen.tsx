import { ReactNode } from 'react';
import { View, ViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import { useWebKeyboardInset } from '@/hooks/useWebKeyboardInset';
import { RadialBackground } from '@/components/executive/RadialBackground';

interface ScreenProps extends ViewProps {
  children: ReactNode;
  className?: string;
  avoidKeyboard?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  /** 'solid' (default) paints the flat canvas; 'nebula' renders the executive radial backdrop. */
  background?: 'solid' | 'nebula';
}

export function Screen({
  children,
  className,
  avoidKeyboard,
  edges = { top: true, bottom: true },
  background = 'solid',
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Web-only: how far the on-screen keyboard overlaps the viewport (0 on native
  // and when no keyboard is up). Only listens on screens that avoid the keyboard.
  const kbInset = useWebKeyboardInset(!!avoidKeyboard);
  const nebula = background === 'nebula';
  const style = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? insets.bottom : 0,
  };
  // Nebula paints its own canvas floor on top of this base; base stays the canvas color.
  const baseBg = 'bg-bg dark:bg-bg-dark';

  const content = (
    <View {...rest} style={[style, rest.style]} className={cn('flex-1', baseBg, className)}>
      {nebula ? <RadialBackground /> : null}
      {children}
    </View>
  );

  if (avoidKeyboard) {
    // On web the RN KeyboardAvoidingView is inert (behavior is only set on
    // native iOS) and the static shell is pinned to the layout viewport, so the
    // iOS soft keyboard overlaps the composer. Pad by the measured keyboard
    // inset to lift the flex column above it; native keeps KeyboardAvoidingView.
    if (Platform.OS === 'web') {
      return (
        <View className={cn('flex-1', baseBg)} style={{ paddingBottom: kbInset }}>
          {content}
        </View>
      );
    }
    return (
      <KeyboardAvoidingView
        className={cn('flex-1', baseBg)}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
