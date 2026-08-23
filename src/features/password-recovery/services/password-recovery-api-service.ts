import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import type {
  RecoveryRequestInput,
  RecoveryRequestResult,
  RecoveryResetInput,
  RecoveryResetResult,
  RecoveryVerifyInput,
  RecoveryVerifyResult,
} from '../types';

export const passwordRecoveryApiService = {
  requestCode(input: RecoveryRequestInput): Promise<RecoveryRequestResult> {
    return asolApi.post(ASOL_API_ROUTES.auth.passwordRecovery.request, input, {
      suppressErrorLog: true,
    });
  },
  verifyCode(input: RecoveryVerifyInput): Promise<RecoveryVerifyResult> {
    return asolApi.post(ASOL_API_ROUTES.auth.passwordRecovery.verify, input, {
      suppressErrorLog: true,
    });
  },
  resetPassword(input: RecoveryResetInput): Promise<RecoveryResetResult> {
    return asolApi.post(ASOL_API_ROUTES.auth.passwordRecovery.reset, input, {
      suppressErrorLog: true,
    });
  },
};
