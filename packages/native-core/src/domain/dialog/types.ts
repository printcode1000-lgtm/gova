export interface AlertOptions {
  title?: string;
  message: string;
  buttonTitle?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export interface ConfirmResult {
  value: boolean;
}

export interface PromptOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
  inputPlaceholder?: string;
  inputText?: string;
}

export interface PromptResult {
  value: string;
  cancelled: boolean;
}
