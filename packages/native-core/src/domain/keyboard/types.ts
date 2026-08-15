export type KeyboardResize = "none" | "native" | "body" | "ionic";

export interface KeyboardInfo {
  keyboardHeight: number;
}

export interface SetKeyboardResizeOptions {
  mode: KeyboardResize;
}
