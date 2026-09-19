import type { ShareContent } from "./share-content";

const PUBLIC_SHARE_FILE_PREFIX = "pbook";

export function buildShareQrCodeFileName(
  content: Pick<ShareContent, "kind" | "title">,
): string {
  return `${PUBLIC_SHARE_FILE_PREFIX}-${content.kind}-${content.title}`;
}
