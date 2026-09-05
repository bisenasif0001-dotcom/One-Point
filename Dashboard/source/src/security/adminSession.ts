export const ADMIN_TOKEN_STORAGE_KEY = 'opds_admin_token';
export const CUSTOMER_SESSION_STORAGE_KEY = 'opds_customer_session';
export const CUSTOMER_PHONE_STORAGE_KEY = 'opds_customer_phone';
export const CUSTOMER_PROFILE_STORAGE_KEY = 'opds_customer_profile';

function readStorageValue(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeStorageValue(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

function decodeAdminJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length < 2) return null;
  try {
    const raw = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw.padEnd(raw.length + ((4 - raw.length % 4) % 4), '=');
    const parsed = JSON.parse(atob(padded));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function isExpiredUnixTimestamp(exp: unknown) {
  const value = typeof exp === 'string' ? Number(exp) : exp;
  return typeof value === 'number' && Number.isFinite(value) && value <= Math.floor(Date.now() / 1000);
}

export function getStoredAdminToken() {
  const token = readStorageValue(ADMIN_TOKEN_STORAGE_KEY);
  if (!token) return '';
  if (isExpiredUnixTimestamp(decodeAdminJwtPayload(token)?.exp)) {
    clearStoredAdminToken();
    return '';
  }
  return token;
}

export function setStoredAdminToken(token: string) {
  writeStorageValue(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAdminToken() {
  setStoredAdminToken('');
}

export function isAdminTokenExpired(token = readStorageValue(ADMIN_TOKEN_STORAGE_KEY)) {
  return isExpiredUnixTimestamp(decodeAdminJwtPayload(token)?.exp);
}

export function hasAdminSession() {
  return Boolean(getStoredAdminToken());
}

export function adminTokenHeader() {
  return { 'X-Admin-Token': getStoredAdminToken() };
}

export function getStoredCustomerSession() {
  return readStorageValue(CUSTOMER_SESSION_STORAGE_KEY);
}

export function getStoredCustomerPhone() {
  return readStorageValue(CUSTOMER_PHONE_STORAGE_KEY);
}

export function setStoredCustomerPhone(phone: string) {
  writeStorageValue(CUSTOMER_PHONE_STORAGE_KEY, phone);
}

export function clearStoredCustomerSession() {
  writeStorageValue(CUSTOMER_SESSION_STORAGE_KEY, '');
  writeStorageValue(CUSTOMER_PHONE_STORAGE_KEY, '');
  writeStorageValue(CUSTOMER_PROFILE_STORAGE_KEY, '');
}

export async function getCsrfToken() {
  const response = await fetch('/api/csrf');
  const data = await response.json().catch(() => ({}));
  return data.csrfToken || '';
}
