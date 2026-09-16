import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  VerificationRequestBody,
  VerificationRequestResult,
  VerificationResendBody,
  VerificationVerifyBody,
  VerificationVerifyResult,
} from "../types";

export const verificationApiService = {
  request(input: VerificationRequestBody): Promise<VerificationRequestResult> {
    return asolApi.post(ASOL_API_ROUTES.verification.request, input, {
      suppressErrorLog: true,
    });
  },
  resend(input: VerificationResendBody): Promise<VerificationRequestResult> {
    return asolApi.post(ASOL_API_ROUTES.verification.resend, input, {
      suppressErrorLog: true,
    });
  },
  verify(input: VerificationVerifyBody): Promise<VerificationVerifyResult> {
    return asolApi.post(ASOL_API_ROUTES.verification.verify, input, {
      suppressErrorLog: true,
    });
  },
};
