export const ACCOUNT_DELETION_PHRASE = "DELETE ASOL ACCOUNT";

export interface DeleteAccountInput { uid: string; currentPassword: string; confirmation: string }
export interface DeleteAccountResult { deleted: true; anonymizedOrderRecords: boolean }
