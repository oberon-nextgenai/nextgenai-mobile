import { http } from '../client/http';
import { PATHS } from '../client/paths';

export interface TwoFactorSetupResponse {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const res = await http.post<TwoFactorSetupResponse>(PATHS.security.twoFactorSetup, {});
  return res.data;
}

export async function verifyTwoFactor(
  code: string,
  secret: string,
  backupCodes: string[],
): Promise<{ message?: string }> {
  const res = await http.post<{ message?: string }>(
    PATHS.security.twoFactorVerify,
    { code, secret, backupCodes },
  );
  return res.data;
}

export async function disableTwoFactor(code: string): Promise<{ message?: string }> {
  const res = await http.post<{ message?: string }>(
    PATHS.security.twoFactorDisable,
    { code },
  );
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<{ message?: string }> {
  const res = await http.post<{ message?: string }>(
    PATHS.auth.forgotPassword,
    { email },
  );
  return res.data;
}

/**
 * Change the authenticated user's password. The backend verifies the current
 * password, rotates `sessionVersion` (signing out other devices), and returns a
 * fresh `access_token` for this device.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message?: string; access_token: string }> {
  const res = await http.post<{ message?: string; access_token: string }>(
    PATHS.security.passwordChange,
    { currentPassword, newPassword },
  );
  return res.data;
}
