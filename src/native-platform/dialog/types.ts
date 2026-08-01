/** Single responsibility: describe normalized dialog inputs and results. */
export interface DialogOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}
export interface DialogConfirmResult {
  value: boolean;
}
export interface DialogPromptResult {
  value: string;
  cancelled: boolean;
}
