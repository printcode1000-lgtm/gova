import type { SimulationExecutionPort } from "@asol/simulation-core";
import { asolApi } from "@/core/api/asol-api-client";

const LOAD_TIMEOUT_MS = 20_000;

function editableValue(element: Element, value: string): void {
  const view = element.ownerDocument.defaultView;
  if (!view || (!(element instanceof view.HTMLInputElement) && !(element instanceof view.HTMLTextAreaElement))) {
    throw new Error("simulationTargetIsNotEditable");
  }
  const prototype = element instanceof view.HTMLInputElement
    ? view.HTMLInputElement.prototype
    : view.HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new view.Event("input", { bubbles: true }));
  element.dispatchEvent(new view.Event("change", { bubbles: true }));
}

export class IframeSimulationExecutionPort implements SimulationExecutionPort {
  private iframe: HTMLIFrameElement | null = null;

  async loadPage(path: string): Promise<void> {
    this.dispose();
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.className = "fixed bottom-0 start-0 h-px w-px opacity-0 pointer-events-none";
    this.iframe = iframe;
    document.body.append(iframe);
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("simulationPageLoadTimeout")), LOAD_TIMEOUT_MS);
      iframe.addEventListener("load", () => {
        window.clearTimeout(timer);
        window.setTimeout(resolve, 250);
      }, { once: true });
      iframe.addEventListener("error", () => {
        window.clearTimeout(timer);
        reject(new Error("simulationPageLoadFailed"));
      }, { once: true });
      iframe.src = path;
    });
  }

  private documentNode(): Document {
    const documentNode = this.iframe?.contentDocument;
    if (!documentNode) throw new Error("simulationPageDocumentUnavailable");
    return documentNode;
  }

  private target(selector: string): Element {
    const target = this.documentNode().querySelector(selector);
    if (!target) throw new Error(`simulationInteractionTargetMissing:${selector}`);
    return target;
  }

  async setValue(selector: string, value: string): Promise<void> {
    editableValue(this.target(selector), value);
  }

  async click(selector: string, _accessibleLabel?: string): Promise<void> {
    const target = this.target(selector);
    const view = target.ownerDocument.defaultView;
    if (!view || !(target instanceof view.HTMLElement)) {
      throw new Error(`simulationInteractionTargetNotClickable:${selector}`);
    }
    target.click();
    await this.wait(250);
  }

  async setInternalImage(selector: string, sourcePath: string): Promise<void> {
    const target = this.target(selector);
    const view = target.ownerDocument.defaultView;
    if (!view || !(target instanceof view.HTMLInputElement) || target.type !== "file") {
      throw new Error("simulationTargetIsNotFileInput");
    }
    const bytes = await asolApi.getPublicBinary(sourcePath);
    const extension = sourcePath.split(".").pop()?.toLowerCase() ?? "webp";
    const mime = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/webp";
    const file = new view.File([bytes], `simulation-${Date.now()}.${extension}`, { type: mime });
    const transfer = new view.DataTransfer();
    transfer.items.add(file);
    target.files = transfer.files;
    target.dispatchEvent(new view.Event("change", { bubbles: true }));
    await this.wait(250);
  }

  async submit(selector: string): Promise<void> {
    const target = this.target(selector);
    const view = target.ownerDocument.defaultView;
    if (!view) throw new Error("simulationPageDocumentUnavailable");

    if (target instanceof view.HTMLFormElement) {
      target.requestSubmit();
    } else if (target instanceof view.HTMLButtonElement && target.type === "submit") {
      target.click();
    } else if (
      target instanceof view.HTMLInputElement &&
      (target.type === "submit" || target.type === "image")
    ) {
      target.click();
    } else {
      throw new Error(`simulationTargetNotSubmittable:${selector}`);
    }
    await this.wait(250);
  }

  wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  dispose(): void {
    this.iframe?.remove();
    this.iframe = null;
  }
}
