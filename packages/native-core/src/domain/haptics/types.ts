export type ImpactStyle = "heavy" | "medium" | "light";
export type NotificationType = "success" | "warning" | "error";

export interface ImpactOptions {
  style: ImpactStyle;
}

export interface NotificationOptions {
  type: NotificationType;
}

export interface VibrateOptions {
  duration?: number;
}
