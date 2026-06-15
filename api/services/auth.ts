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
 * Exchange a one-time SSO token (issued by the backend after Google/Microsoft
 * OAuth callback and returned via the `primeai://auth/sso?token=…` deep link)
 * for a full access_token + user.
 */
export async function exchangeMobileSso(token: string): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>(PATHS.auth.mobileSsoExchange, { token });
  return res.data;
}
