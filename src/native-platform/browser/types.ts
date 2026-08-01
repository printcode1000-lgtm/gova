/** Single responsibility: describe external-browser inputs. */
export interface BrowserOpenOptions {
  url: string;
  presentationStyle?: "fullscreen" | "popover";
}
