/** Single responsibility: provide optional device feedback without permissions. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { nativeImpact, nativeNotification } from "./haptics-native-adapter";
import type { HapticImpactStyle, HapticNotificationType } from "./types";
export class HapticsModule {
  async impact(style: HapticImpactStyle = "medium"): Promise<void> {
    if (!isNativePlatform()) throw NativePlatformError.unavailable("Haptics");
    await nativeImpact(style);
  }
  async notification(type: HapticNotificationType): Promise<void> {
    if (!isNativePlatform()) throw NativePlatformError.unavailable("Haptics");
    await nativeNotification(type);
  }
}
export const haptics = new HapticsModule();
