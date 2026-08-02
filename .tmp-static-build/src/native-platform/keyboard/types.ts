/** Single responsibility: describe keyboard events and resize modes. */
import type { Unsubscribe } from "../core/listener";
export interface KeyboardInfo {
  keyboardHeight: number;
}
export type KeyboardListener = (info: KeyboardInfo) => void;
export type KeyboardUnsubscribe = Unsubscribe;
