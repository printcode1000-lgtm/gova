import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type { DeleteAccountInput, DeleteAccountResult } from "../types";

export const accountDeletionApiService = {
  delete: (input: DeleteAccountInput): Promise<DeleteAccountResult> => asolApi.post(ASOL_API_ROUTES.accountDeletion, input, { suppressErrorLog: true }),
};
