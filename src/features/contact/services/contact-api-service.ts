import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type { ContactMessageInput, ContactMessageResult } from "../types";

export const contactApiService = {
  send: (input: ContactMessageInput): Promise<ContactMessageResult> =>
    asolApi.post(ASOL_API_ROUTES.contact, input, { suppressErrorLog: true }),
};
