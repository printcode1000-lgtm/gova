import { samePhone } from './phone';

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
