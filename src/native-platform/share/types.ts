/**
 * Share & Receive contract — both directions.
 */

/** Outgoing payload. At least one field must be present. */
export interface ShareSendOptions {
  title?: string;
  text?: string;
  url?: string;
  /**
   * Files to attach. Each is shared from application-private cache, so the
   * caller never deals with a platform URI.
   */
  files?: Array<Blob | File>;
  /** Android chooser dialog title. */
  dialogTitle?: string;
}

export const ReceivedItemKinds = {
  Text: "text",
  Url: "url",
  Image: "image",
  Pdf: "pdf",
  Document: "document",
} as const;

export type ReceivedItemKind =
  (typeof ReceivedItemKinds)[keyof typeof ReceivedItemKinds];

/**
 * One piece of content the OS handed to the application.
 * Binary payloads are already copied into application-private cache.
 */
export interface ReceivedItem {
  id: string;
  kind: ReceivedItemKind;
  /** Present for text and URL payloads. */
  value?: string;
  /** Present for binary payloads. */
  file?: File;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  /** Epoch milliseconds when the application received it. */
  receivedAt: number;
}

export type ShareReceiveListener = (item: ReceivedItem) => void;

/** Raw payload shape delivered by the native bridge before validation. */
export interface RawSharePayload {
  type?: string;
  mimeType?: string;
  value?: string;
  name?: string;
  /** base64 for binary payloads. */
  data?: string;
  /** Native URI the plugin already copied into the app sandbox. */
  uri?: string;
}

export const MAX_RECEIVED_BYTES = 25 * 1024 * 1024;
