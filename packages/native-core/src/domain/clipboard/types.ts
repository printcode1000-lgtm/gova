export interface ClipboardReadResult {
  value: string;
  type: string;
}

export interface ClipboardWriteOptions {
  string?: string;
  image?: string;
  url?: string;
  label?: string;
}
