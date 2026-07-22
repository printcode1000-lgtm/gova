import "server-only";

import { GoogleAuth } from "google-auth-library";
import { getFirebaseAdminServiceAccount } from "@/core/config/server-env";

export interface FcmHttpV1Message {
  message: {
    token: string;
    notification?: { title: string; body: string };
    data: Record<string, string>;
    android: {
      priority: "HIGH" | "NORMAL";
      ttl: string;
      restricted_package_name: string;
      collapse_key: string;
      notification?: {
        channel_id: string;
        icon: string;
        color: string;
        sound?: string;
        tag: string;
        visibility: "PRIVATE";
      };
    };
  };
}

export interface FcmHttpV1SendResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
}

export interface FcmHttpV1Client {
  send(payload: FcmHttpV1Message): Promise<FcmHttpV1SendResult>;
}

interface FcmErrorResponse {
  error?: {
    status?: string;
    details?: Array<{ errorCode?: string }>;
  };
}

let cachedClient: Promise<FcmHttpV1Client> | undefined;

function errorCodeFrom(error: unknown): string {
  const response = error as { response?: { data?: FcmErrorResponse } };
  const body = response.response?.data;
  return (
    body?.error?.details?.find((detail) => detail.errorCode)?.errorCode ||
    body?.error?.status ||
    "UNKNOWN"
  );
}

async function createClient(): Promise<FcmHttpV1Client> {
  const account = getFirebaseAdminServiceAccount();
  const auth = new GoogleAuth({
    credentials: {
      client_email: account.clientEmail,
      private_key: account.privateKey,
    },
    projectId: account.projectId,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const url = `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`;

  return {
    async send(payload) {
      try {
        const response = await client.request<{ name?: string }>({
          url,
          method: "POST",
          data: payload,
        });
        return { success: true, messageId: response.data.name };
      } catch (error) {
        return { success: false, errorCode: errorCodeFrom(error) };
      }
    },
  };
}

export function getFcmHttpV1Client(): Promise<FcmHttpV1Client> {
  cachedClient ??= createClient();
  return cachedClient;
}
