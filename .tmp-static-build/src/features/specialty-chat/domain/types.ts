export const SPECIALTY_CHAT_KINDS = {
  Request: "specialty_request",
  Message: "specialty_message",
  Receipt: "specialty_receipt",
} as const;

export interface SpecialtyChatIdentity {
  uid: string;
  phone: string;
  sessionToken: string;
}

export interface SendSpecialtyRequestInput {
  identity: SpecialtyChatIdentity;
  requestId: string;
  mainCategoryId: number;
  subcategoryId: number;
  mainCategoryName: string;
  subcategoryName: string;
  message: string;
}

export interface SendSpecialtyRequestResult {
  requestId: string;
  matchedUsers: number;
  acceptedUsers: number;
  unavailableUsers: number;
}

export interface SendSpecialtyMessageInput {
  identity: SpecialtyChatIdentity;
  messageId: string;
  capability: string;
  message: string;
}

export interface SpecialtyChatPreferenceResult {
  enabled: boolean;
}

export interface SendSpecialtyReceiptInput {
  identity: SpecialtyChatIdentity;
  capability: string;
  targetMessageId: string;
  status: "received" | "read";
}
