export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: readonly string[];
}

export interface ShareResult {
  activityType?: string;
}

export interface ReceivedShare {
  action?: string;
  text?: string;
  url?: string;
  files?: readonly {
    uri: string;
    mimeType?: string;
    name?: string;
  }[];
}
