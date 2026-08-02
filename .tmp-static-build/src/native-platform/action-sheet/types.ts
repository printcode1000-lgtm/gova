/** Single responsibility: describe action-sheet choices and results. */
export interface ActionSheetOption {
  title: string;
  style?: "default" | "destructive" | "cancel";
}
export interface ActionSheetOptions {
  title: string;
  message?: string;
  options: ActionSheetOption[];
}
export interface ActionSheetResult {
  index: number;
}
