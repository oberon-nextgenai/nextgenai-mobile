import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, BIOMETRIC_RELOCK_AFTER_MS } from '@/lib/constants';

export function useBiometricUnlock(): {
  locked: boolean;
  authenticate: () => Promise<boolean>;
} {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const lastForegroundedAt = useRef<number>(Date.now());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled)
      .then((v) => setEnabled(v === '1'))
      .catch(() => undefined);
  }, []);

  const authenticate = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Prime',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (res.success) setLocked(false);
    return res.success;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        lastForegroundedAt.current = Date.now();
      } else if (next === 'active') {
        const elapsed = Date.now() - lastForegroundedAt.current;
        if (elapsed > BIOMETRIC_RELOCK_AFTER_MS) {
          setLocked(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled]);

  return { locked: enabled && locked, authenticate };
}
