/** Single responsibility: describe transient toast messages. */
export interface ToastOptions {
  text: string;
  duration?: "short" | "long";
  position?: "top" | "center" | "bottom";
}
