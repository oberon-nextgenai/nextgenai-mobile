import { ReactNode } from 'react';
import { View, ViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
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
    return (
      <KeyboardAvoidingView
        className={cn('flex-1', baseBg)}
        // Android needs an explicit behavior too. `undefined` makes
        // KeyboardAvoidingView an inert passthrough, which left Android relying
        // on the OS resizing the window under the keyboard — it does not here,
        // so the focused field simply sat behind the keyboard (reset-password:
        // the email input and the submit button were both covered). iOS was
        // unaffected because it had 'padding' all along. 'height' is the
        // Android counterpart: it shrinks the container so the ScrollView can
        // bring the focused field into view.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
