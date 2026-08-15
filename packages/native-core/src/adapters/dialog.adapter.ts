import { Dialog } from "@capacitor/dialog";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { AlertOptions, ConfirmOptions, ConfirmResult, PromptOptions, PromptResult } from "../domain/dialog/types";

const MODULE = "Dialog";

const dialogPlugin = createLazyPlugin(MODULE, async () => {
  return Dialog;
});

export const dialogAdapter = {
  async alert(options: AlertOptions): Promise<void> {
    try {
      const plugin = await dialogPlugin.required();
      await plugin.alert({
        title: options.title,
        message: options.message,
        buttonTitle: options.buttonTitle,
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async confirm(options: ConfirmOptions): Promise<ConfirmResult> {
    try {
      const plugin = await dialogPlugin.required();
      const result = await plugin.confirm({
        title: options.title,
        message: options.message,
        okButtonTitle: options.okButtonTitle,
        cancelButtonTitle: options.cancelButtonTitle,
      });
      return { value: result.value };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async prompt(options: PromptOptions): Promise<PromptResult> {
    try {
      const plugin = await dialogPlugin.required();
      const result = await plugin.prompt({
        title: options.title,
        message: options.message,
        okButtonTitle: options.okButtonTitle,
        cancelButtonTitle: options.cancelButtonTitle,
        inputPlaceholder: options.inputPlaceholder,
        inputText: options.inputText,
      });
      return {
        value: result.value,
        cancelled: result.cancelled,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
