import { registerSuperAdminIdentity } from '@asol/auth-core';

import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from '../domain/super-admin';

export function registerAuthCoreBrowserPorts(): void {
  registerSuperAdminIdentity(() => ({
    uid: SUPER_ADMIN_UID,
    phone: SUPER_ADMIN_PHONE,
  }));
}
