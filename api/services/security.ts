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
