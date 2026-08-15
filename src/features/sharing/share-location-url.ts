/**
 * Share a map location, falling back to the clipboard.
 *
 * Single responsibility: one place for the "share this URL, or copy it if the
 * platform has no share sheet" pattern used by the map surfaces, so no page
 * has to reach for `navigator.share` itself.
 */

import { NativeCore, isCancelledError } from "@asol/native-core";

/**
 * @param url Absolute URL to share.
 * @param title Title shown in the share sheet.
 * @param onCopied Invoked when the URL was copied instead of shared.
 * @param onFailed Invoked when neither sharing nor copying worked.
 */
export async function shareLocationUrl(
  url: string,
  title: string,
  onCopied?: () => void,
  onFailed?: () => void,
): Promise<void> {
  try {
    const canShareRes = await NativeCore.canShare();
    if (canShareRes.ok && canShareRes.value) {
      const shareRes = await NativeCore.share({ title, url });
      if (shareRes.ok) return;
      if (isCancelledError(shareRes.error)) return;
    }
    const clipRes = await NativeCore.writeClipboard({ string: url });
    if (clipRes.ok) {
      onCopied?.();
    } else {
      onFailed?.();
    }
  } catch (error) {
    // Dismissing the share sheet is a normal outcome, not a failure.
    if (isCancelledError(error)) return;
    try {
      const clipRes = await NativeCore.writeClipboard({ string: url });
      if (clipRes.ok) {
        onCopied?.();
      } else {
        onFailed?.();
      }
    } catch {
      onFailed?.();
    }
  }
}
