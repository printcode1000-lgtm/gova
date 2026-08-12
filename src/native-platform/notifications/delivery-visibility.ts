/**
 * Whether a native push arrived while the WebView can present UI.
 *
 * Android can invoke the JavaScript push listener while the activity is in the
 * background. Treating every listener callback as foreground duplicates the
 * system notification with a second local notification. The Page Visibility
 * API reflects the activity transition and is also available in Capacitor's
 * WebView, so hidden and unavailable documents fail closed.
 */
export function isNotificationWebViewForeground(
  documentState: Pick<Document, "visibilityState"> | undefined =
    typeof document === "undefined" ? undefined : document,
): boolean {
  return documentState?.visibilityState === "visible";
}
