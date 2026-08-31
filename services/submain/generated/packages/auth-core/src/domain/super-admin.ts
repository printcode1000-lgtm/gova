import { samePhone } from './phone';

/**
 * The single administrator identity. It lives in the package, not in an
 * application feature, because every isolated runtime that has to recognise the
 * administrator must read the same pair without importing an application door.
 */
export const SUPER_ADMIN_UID = 'usr_1782522385927_pwpl7rr';
export const SUPER_ADMIN_PHONE = '+201026546550';

type SuperAdminIdentity = { uid: string; phone: string };

let resolveSuperAdminIdentity: () => SuperAdminIdentity = () => ({
  uid: process.env.NEXT_PUBLIC_SUPER_ADMIN_UID?.trim() ?? '',
  phone: process.env.NEXT_PUBLIC_SUPER_ADMIN_PHONE?.trim() ?? '',
});

export function registerSuperAdminIdentity(getter: () => SuperAdminIdentity): void {
  resolveSuperAdminIdentity = getter;
}

export function isSuperAdminIdentity(uid: string, phone: string): boolean {
  const admin = resolveSuperAdminIdentity();
  if (!admin.uid || !admin.phone) return false;
  return uid === admin.uid || samePhone(phone, admin.phone);
}

export function isSuperAdminSession(session: { uid: string; phone: string } | null): boolean {
  if (!session) return false;
  return isSuperAdminIdentity(session.uid, session.phone);
}
