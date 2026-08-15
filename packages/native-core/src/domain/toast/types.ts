export type ToastDuration = "short" | "long";
export type ToastPosition = "top" | "center" | "bottom";

export interface ShowToastOptions {
  text: string;
  duration?: ToastDuration;
  position?: ToastPosition;
}
