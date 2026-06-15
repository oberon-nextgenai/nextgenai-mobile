import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive confirmation.
 *
 * `Alert.alert` from React Native does not render an interactive multi-button
 * dialog on React Native Web — the confirm callback never fires. On web we
 * fall back to the browser's native `window.confirm`; on iOS/Android we keep
 * the native `Alert.alert`.
 */
export function confirmAction(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}): void {
  const { title, message, confirmLabel, onConfirm, destructive = true } = opts;

  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
