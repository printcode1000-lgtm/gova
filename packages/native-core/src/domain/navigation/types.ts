export interface BackButtonEvent {
  canGoBack: boolean;
}

export type BackButtonListener = (event: BackButtonEvent) => void;
