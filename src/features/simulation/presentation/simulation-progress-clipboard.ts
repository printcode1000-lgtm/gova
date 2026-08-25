import { NativeCore } from "@asol/native-core";

/**
 * Clipboard transport for the simulation progress monitor.
 *
 * Clipboard access belongs to Native Core, which picks the native or web
 * implementation per runtime. It returns a Result rather than throwing, so a
 * copy button on a platform without clipboard access stays silent instead of
 * breaking the monitor.
 */
export const simulationProgressClipboard = {
  write: async (text: string): Promise<void> => {
    if (!text) return;
    await NativeCore.writeClipboard({ string: text });
  },
};
