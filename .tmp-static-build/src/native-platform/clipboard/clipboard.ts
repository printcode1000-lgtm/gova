/** Single responsibility: read and write text through one clipboard contract. */
import { isNativePlatform } from "../core/platform";
import {
  readNativeClipboard,
  writeNativeClipboard,
} from "./clipboard-native-adapter";
import type { ClipboardValue } from "./types";
export class ClipboardModule {
  async read(): Promise<ClipboardValue> {
    return isNativePlatform()
      ? readNativeClipboard()
      : { value: await navigator.clipboard.readText(), type: "text/plain" };
  }
  async write(value: string): Promise<void> {
    if (isNativePlatform()) await writeNativeClipboard(value);
    else await navigator.clipboard.writeText(value);
  }
}
export const clipboard = new ClipboardModule();
