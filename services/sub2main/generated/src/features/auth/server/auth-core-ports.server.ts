import 'server-only';

import {
  registerSessionSigningSecret,
  registerSuperAdminIdentity,
} from '@asol/auth-core/server';
import { getAsolSessionSigningSecret } from '@/core/config/server-env';
import {
  SUPER_ADMIN_PHONE,
  SUPER_ADMIN_UID,
} from '@/features/auth';

registerSessionSigningSecret(getAsolSessionSigningSecret);
registerSuperAdminIdentity(() => ({
  uid: SUPER_ADMIN_UID,
  phone: SUPER_ADMIN_PHONE,
}));
