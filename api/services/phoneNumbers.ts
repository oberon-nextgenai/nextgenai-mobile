import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { PhoneNumber } from './types';

export async function fetchAvailablePhoneNumbers(): Promise<PhoneNumber[]> {
  const res = await http.get<PhoneNumber[] | { data?: PhoneNumber[]; phoneNumbers?: PhoneNumber[] }>(
    PATHS.phoneNumbers.available,
  );
  const body = res.data as unknown;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const b = body as { data?: PhoneNumber[]; phoneNumbers?: PhoneNumber[] };
    if (Array.isArray(b.data)) return b.data;
    if (Array.isArray(b.phoneNumbers)) return b.phoneNumbers;
  }
  return [];
}
