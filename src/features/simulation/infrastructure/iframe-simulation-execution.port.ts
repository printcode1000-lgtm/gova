import type { SimulationExecutionPort, SimulationTarget } from "@asol/simulation-core";
import { uiSimulationSelector, uiSimulationTarget } from "@asol/ui-registry-core";
import { asolApi } from "@/core/api/asol-api-client";

const LOAD_TIMEOUT_MS = 20_000;
const TARGET_TIMEOUT_MS = 5_000;
const TARGET_POLL_MS = 50;
const SETTLE_GRACE_MS = 800;
const SETTLE_QUIET_MS = 400;
const SETTLE_TIMEOUT_MS = 5_000;

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

/**
 * The one query this adapter may make.
 *
 * Not a CSS class, not a semantic id, not a label, not an nth-child: a
 * registered uid and nothing else. Every other locator describes how the page
 * happens to look today, and simulation that depends on appearance breaks on a
 * restyle while claiming the feature broke.
 */
function targetSelector(target: SimulationTarget): string {
  return uiSimulationSelector(target.targetUid);
}

function targetLabel(target: SimulationTarget): string {
  return `${target.simulationId}(${target.targetUid})`;
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

  private target(target: SimulationTarget): Element {
    const selector = targetSelector(target);
    const matches = this.documentNode().querySelectorAll(selector);
    if (matches.length === 0) throw new Error(`simulationInteractionTargetMissing:${targetLabel(target)}`);
    // Multiplicity is a registry fact, not a guess: a descriptor rendered once
    // per row of a real list resolves to the first row by contract, and
    // anything else that matches twice is an ambiguity the run must not paper
    // over by picking one.
    const registered = uiSimulationTarget(target.targetUid);
    if (matches.length > 1 && !registered?.repeated) {
      throw new Error(
        `simulationInteractionTargetAmbiguous:${targetLabel(target)} matched ${matches.length} elements`,
      );
    }
    return matches[0]!;
  }

  async setValue(target: SimulationTarget, value: string): Promise<void> {
    editableValue(this.target(target), value);
  }

  async selectFirstOption(target: SimulationTarget): Promise<void> {
    const element = this.target(target);
    const view = element.ownerDocument.defaultView;
    if (!view || !(element instanceof view.HTMLSelectElement)) {
      throw new Error(`simulationTargetIsNotSelect:${targetLabel(target)}`);
    }
    const option = Array.from(element.options).find((candidate) => !candidate.disabled && candidate.value !== "");
    if (!option) throw new Error(`simulationSelectOptionMissing:${targetLabel(target)}`);
    element.value = option.value;
    element.dispatchEvent(new view.Event("input", { bubbles: true }));
    element.dispatchEvent(new view.Event("change", { bubbles: true }));
    await this.wait(250);
  }

  async pressKey(target: SimulationTarget, key: string): Promise<void> {
    const element = this.target(target);
    const view = element.ownerDocument.defaultView;
    if (!view || !(element instanceof view.HTMLElement)) {
      throw new Error(`simulationInteractionTargetNotKeyboardAccessible:${targetLabel(target)}`);
    }
    element.focus();
    element.dispatchEvent(new view.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    element.dispatchEvent(new view.KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
    await this.wait(250);
  }

  async click(target: SimulationTarget, _accessibleLabel?: string): Promise<void> {
    const element = this.target(target);
    const view = element.ownerDocument.defaultView;
    if (!view || !(element instanceof view.HTMLElement)) {
      throw new Error(`simulationInteractionTargetNotClickable:${targetLabel(target)}`);
    }
    element.click();
    await this.wait(250);
  }

  async setInternalImage(target: SimulationTarget, sourcePath: string): Promise<void> {
    const element = this.target(target);
    const view = element.ownerDocument.defaultView;
    if (!view || !(element instanceof view.HTMLInputElement) || element.type !== "file") {
      throw new Error("simulationTargetIsNotFileInput");
    }
    const bytes = await asolApi.getPublicBinary(sourcePath);
    const extension = sourcePath.split(".").pop()?.toLowerCase() ?? "webp";
    const mime = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/webp";
    const file = new view.File([bytes], `simulation-${Date.now()}.${extension}`, { type: mime });
    const transfer = new view.DataTransfer();
    transfer.items.add(file);
    element.files = transfer.files;
    element.dispatchEvent(new view.Event("change", { bubbles: true }));
    await this.wait(250);
  }

  async submit(target: SimulationTarget): Promise<void> {
    const element = this.target(target);
    const view = element.ownerDocument.defaultView;
    if (!view) throw new Error("simulationPageDocumentUnavailable");

    if (element instanceof view.HTMLFormElement) {
      element.requestSubmit();
    } else if (element instanceof view.HTMLButtonElement && element.type === "submit") {
      element.click();
    } else if (
      element instanceof view.HTMLInputElement &&
      (element.type === "submit" || element.type === "image")
    ) {
      element.click();
    } else {
      throw new Error(`simulationTargetNotSubmittable:${targetLabel(target)}`);
    }
    await this.wait(250);
  }

  async waitForTarget(target: SimulationTarget, timeoutMs = TARGET_TIMEOUT_MS): Promise<void> {
    const startedAt = Date.now();
    const selector = targetSelector(target);
    while (Date.now() - startedAt <= timeoutMs) {
      if (this.documentNode().querySelector(selector)) return;
      await this.wait(TARGET_POLL_MS);
    }
    throw new Error(`simulationInteractionTargetTimeout:${targetLabel(target)}`);
  }

  async hasTarget(target: SimulationTarget): Promise<boolean> {
    try {
      return Boolean(this.documentNode().querySelector(targetSelector(target)));
    } catch {
      return false;
    }
  }

  /**
   * Waits for the frame to stop completing network work before it is removed.
   *
   * A click that submits an order returns as soon as the handler fires, so
   * disposing immediately aborts the real request in flight and the server sees
   * an empty body. A fixed grace covers the common fast request, then the
   * resource timeline is polled until nothing new has completed for a quiet
   * window, bounded so a permanently busy page cannot stall the run.
   */
  async settle(): Promise<void> {
    const view = this.iframe?.contentWindow;
    if (!view) return;
    await this.wait(SETTLE_GRACE_MS);
    const startedAt = Date.now();
    let completed = -1;
    let quietSince = Date.now();
    while (Date.now() - startedAt < SETTLE_TIMEOUT_MS) {
      let current: number;
      try {
        current = view.performance.getEntriesByType("resource").length;
      } catch {
        return;
      }
      if (current !== completed) {
        completed = current;
        quietSince = Date.now();
      } else if (Date.now() - quietSince >= SETTLE_QUIET_MS) {
        return;
      }
      await this.wait(TARGET_POLL_MS * 2);
    }
  }

  wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  dispose(): void {
    this.iframe?.remove();
    this.iframe = null;
  }
}
