/** Single responsibility: lazily bridge haptic feedback to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { HapticImpactStyle, HapticNotificationType } from "./types";
const plugin = createLazyPlugin(
  "Haptics",
  async () => await import("@capacitor/haptics"),
);
export async function nativeImpact(style: HapticImpactStyle): Promise<void> {
  try {
    const p = await plugin.required();
    await p.Haptics.impact({
      style:
        p.ImpactStyle[
          (style[0]!.toUpperCase() +
            style.slice(1)) as keyof typeof p.ImpactStyle
        ],
    });
  } catch (error) {
    throw toNativeError("Haptics", error);
  }
}
export async function nativeNotification(
  type: HapticNotificationType,
): Promise<void> {
  try {
    const p = await plugin.required();
    await p.Haptics.notification({
      type: p.NotificationType[
        (type[0]!.toUpperCase() +
          type.slice(1)) as keyof typeof p.NotificationType
      ],
    });
  } catch (error) {
    throw toNativeError("Haptics", error);
  }
}
