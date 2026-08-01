/**
 * Share a map location, falling back to the clipboard.
 *
 * Single responsibility: one place for the "share this URL, or copy it if the
 * platform has no share sheet" pattern used by the map surfaces, so no page
 * has to reach for `navigator.share` itself.
 */

import { clipboard, isCancelledError } from "@/native-platform";
import { share } from "@/native-platform/share";

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
    if (await share.canSend()) {
      await share.send({ title, url });
      return;
    }
    await clipboard.write(url);
    onCopied?.();
  } catch (error) {
    // Dismissing the share sheet is a normal outcome, not a failure.
    if (isCancelledError(error)) return;
    try {
      await clipboard.write(url);
      onCopied?.();
    } catch {
      onFailed?.();
    }
  }
}
