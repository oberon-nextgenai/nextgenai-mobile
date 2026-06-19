import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type {
  LoginRequest,
  LoginResponse,
  PublicUser,
  Permissions,
  TwoFactorLoginRequest,
  Organization,
} from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>(PATHS.auth.mobileLogin, payload);
  return res.data;
}

export async function twoFactorLogin(payload: TwoFactorLoginRequest): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>(PATHS.auth.mobileTwoFactorLogin, payload);
  return res.data;
}

export async function fetchMe(): Promise<PublicUser> {
  const res = await http.get<PublicUser>(PATHS.auth.me);
  return res.data;
}

export async function fetchPermissions(): Promise<Permissions> {
  const res = await http.get<Permissions>(PATHS.auth.permissions);
  return res.data;
}

export async function logout(): Promise<void> {
  await http.post(PATHS.auth.logout).catch(() => undefined);
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const res = await http.get<Organization[]>(PATHS.orgs.list);
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await http.post(PATHS.auth.forgotPassword, { email });
}

/**
 * Confirm a password reset with the token from the reset email + a new password.
 * (Backend field is `newPassword`; the token is the 43-char value from the link.)
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await http.post(PATHS.auth.resetPassword, { token, newPassword });
}

/**
 * Exchange a one-time SSO token (issued by the backend after Google/Microsoft
 * OAuth callback and returned via the `primeai://auth/sso?token=…` deep link)
 * for a full access_token + user.
 */
export async function exchangeMobileSso(token: string): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>(PATHS.auth.mobileSsoExchange, { token });
  return res.data;
}

export interface AppleSignInPayload {
  identityToken: string;
  /** Raw nonce (the server hashes it to match the token's `nonce` claim). */
  nonce?: string;
  fullName?: { givenName?: string; familyName?: string };
}

/**
 * Native iOS Sign in with Apple: the device returns an identity token directly,
 * so we POST it to the backend, which verifies it against Apple's JWKS and
 * issues a session. No browser redirect / one-time-token bridge.
 */
export async function appleSignIn(payload: AppleSignInPayload): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>(PATHS.auth.mobileSsoApple, payload);
  return res.data;
}
