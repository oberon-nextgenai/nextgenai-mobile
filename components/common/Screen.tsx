import { ReactNode } from 'react';
import { View, ViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

interface ScreenProps extends ViewProps {
  children: ReactNode;
  className?: string;
  avoidKeyboard?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
}

export function Screen({
  children,
  className,
  avoidKeyboard,
  edges = { top: true, bottom: true },
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const style = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? insets.bottom : 0,
  };

  const content = (
    <View
      {...rest}
      style={[style, rest.style]}
      className={cn('flex-1 bg-bg dark:bg-bg-dark', className)}
    >
      {children}
    </View>
  );

  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-bg dark:bg-bg-dark"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
