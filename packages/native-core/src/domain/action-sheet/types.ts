export type ActionSheetButtonStyle = "default" | "destructive" | "cancel";

export interface ActionSheetButton {
  title: string;
  style?: ActionSheetButtonStyle;
  icon?: string;
}

export interface ShowActionSheetOptions {
  title: string;
  message?: string;
  options: readonly ActionSheetButton[];
}

export interface ShowActionSheetResult {
  index: number;
}
