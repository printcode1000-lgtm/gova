import { NativeCore } from "@asol/native-core";

export const productPageClipboard = {
  write: async (text: string): Promise<void> => {
    if (!text) return;
    await NativeCore.writeClipboard({ string: text });
  },
};
