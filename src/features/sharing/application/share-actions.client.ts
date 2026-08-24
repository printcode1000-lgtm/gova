"use client";

import { NativeCore, isCancelledError } from "@asol/native-core";
import type { ShareContent } from "./share-content";
import {
  buildFacebookShareUrl,
  buildShareMessage,
  buildWhatsAppShareUrl,
  INSTAGRAM_HOME_URL,
} from "./share-links";

export type ShareActionResult = "shared" | "copied" | "cancelled";

function openExternal(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.click();
}

export function shareToWhatsApp(content: ShareContent): void {
  openExternal(buildWhatsAppShareUrl(content));
}

export function shareToFacebook(content: ShareContent): void {
  openExternal(buildFacebookShareUrl(content));
}

/**
 * Instagram has no supported web endpoint for publishing an arbitrary URL.
 * Preserve the user's content by copying it, then open Instagram so it can be
 * pasted into a story, message, or bio without pretending a link post exists.
 */
export async function shareToInstagram(
  content: ShareContent,
): Promise<ShareActionResult> {
  openExternal(INSTAGRAM_HOME_URL);
  await NativeCore.writeClipboard({ string: buildShareMessage(content) });
  return "copied";
}

export async function copyShareLink(
  content: ShareContent,
): Promise<ShareActionResult> {
  await NativeCore.writeClipboard({ string: content.url });
  return "copied";
}

export async function shareThroughSystem(
  content: ShareContent,
): Promise<ShareActionResult> {
  try {
    const canShareRes = await NativeCore.canShare();
    if (canShareRes.ok && canShareRes.value) {
      const shareRes = await NativeCore.share({
        title: content.title,
        text: content.text,
        url: content.url,
      });
      if (shareRes.ok) {
        return "shared";
      }
      if (isCancelledError(shareRes.error)) return "cancelled";
    }
    return copyShareLink(content);
  } catch (error) {
    if (isCancelledError(error)) return "cancelled";
    return copyShareLink(content);
  }
}
