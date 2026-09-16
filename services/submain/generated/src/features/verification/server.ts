export type {
  VerificationAdminSmsRedeemBody,
  VerificationAdminSmsRedeemResult,
  VerificationAdminSmsStatusBody,
  VerificationRequestBody,
  VerificationRequestResult,
  VerificationResendBody,
  VerificationVerifyBody,
  VerificationVerifyResult,
} from "./application/types";
export { verificationService, VerificationService } from "./server/services/verification-service.server";
export {
  verificationProofConsumer,
  VerificationProofConsumer,
} from "./server/services/verification-proof-consumer.server";
