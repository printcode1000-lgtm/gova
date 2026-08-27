"use client";

import { Check, Plus, ScanLine, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NativeCore } from "@asol/native-core";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { uiAttributes } from "@asol/ui-registry-core";
import {
  INSPECTOR_ACTIVE_ATTRIBUTE,
  INSPECTOR_CONTROL_ATTRIBUTE,
} from "@/shared/ui/overlay-chrome";
import { OverlayChromeBranch } from "@/shared/ui/overlay-chrome-branch";

import {
  formatInspectorOutput,
  selectedUiUid,
} from "./ui-attribute-inspector-model";
import {
  pickInspectedElement,
  type InspectedElement,
} from "./ui-inspector-element-picker";
import { buildRegistrationProposal } from "./ui-registration-proposal";
import { buildPendingRegistrationRequest } from "./ui-pending-registration";
import { uiRegistryPendingApiService } from "../application/services/ui-registry-pending-api-service";

type CopyState = "idle" | "copied" | "failed";

/** True for the inspector's own controls, which are never selectable. */
function isInspectorControl(element: InspectedElement | null): boolean {
  return element !== null && element.closest(`[${INSPECTOR_CONTROL_ATTRIBUTE}]`) !== null;
}

function attributesFor(element: InspectedElement): Record<string, string> {
  return Object.fromEntries(
    element
      .getAttributeNames()
      .filter(
        (name) =>
          name === "id" ||
          name === "data-ui" ||
          name.startsWith("data-ui-") ||
          name.startsWith("data-simulation-"),
      )
      .map((name) => [name, element.getAttribute(name) ?? ""]),
  );
}

/**
 * Super-admin-only touch inspector. While active, a pointer selects the exact
 * element it lands on — the way a browser element picker does — copies that
 * element's safe metadata, and never triggers the element itself.
 */
export function SuperAdminUiAttributeInspector() {
  const { session, isLoading } = useSession();
  const authorized = !isLoading && isSuperAdmin(session);
  const [enabled, setEnabled] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string> | null>(null);
  const [selectedDomId, setSelectedDomId] = useState<string | undefined>(undefined);
  const pathname = usePathname();
  const selectedRef = useRef<InspectedElement | null>(null);
  const selectedOutlineRef = useRef<{ outline: string; outlineOffset: string } | null>(null);

  const clearSelection = () => {
    if (selectedRef.current && selectedOutlineRef.current) {
      selectedRef.current.style.outline = selectedOutlineRef.current.outline;
      selectedRef.current.style.outlineOffset = selectedOutlineRef.current.outlineOffset;
    }
    selectedRef.current = null;
    selectedOutlineRef.current = null;
  };

  useEffect(() => {
    if (authorized) return;
    setEnabled(false);
    setCopiedText("");
    setSelectedAttributes(null);
    clearSelection();
  }, [authorized]);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.removeAttribute(INSPECTOR_ACTIVE_ATTRIBUTE);
      return;
    }
    document.documentElement.setAttribute(INSPECTOR_ACTIVE_ATTRIBUTE, "true");
    return () => {
      document.documentElement.removeAttribute(INSPECTOR_ACTIVE_ATTRIBUTE);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      clearSelection();
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const selected = pickInspectedElement(event.target);
      if (!selected || isInspectorControl(selected)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      clearSelection();
      selectedRef.current = selected;
      selectedOutlineRef.current = {
        outline: selected.style.outline,
        outlineOffset: selected.style.outlineOffset,
      };
      selected.style.outline = "3px solid var(--color-primary)";
      selected.style.outlineOffset = "2px";

      const ownAttributes = attributesFor(selected);
      setSelectedAttributes(ownAttributes);
      setSelectedDomId(selected.getAttribute("id") ?? undefined);
      const text = formatInspectorOutput(ownAttributes);
      setCopiedText(text);
      void NativeCore.writeClipboard({ string: text }).then((result) => {
        setCopyState(result.ok ? "copied" : "failed");
      });
    };

    // A pointer sequence can still emit a later click even after pointerdown
    // was cancelled. Block it too so inspection can never submit, navigate, or
    // mutate the selected control.
    const onClickCapture = (event: MouseEvent) => {
      const clicked = pickInspectedElement(event.target);
      if (!clicked || isInspectorControl(clicked)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClickCapture, true);
      clearSelection();
    };
  }, [enabled]);

  if (!authorized) return null;

  const status = enabled
    ? copyState === "failed"
      ? "تعذر النسخ"
      : copiedText || "المس أي عنصر لنسخ id"
    : "فحص Attributes";
  const missingUid = enabled && selectedAttributes !== null && selectedUiUid(selectedAttributes) === null;

  // The proposal is text only. It never mutates source code and never touches
  // the selected element or the page it belongs to.
  const copyRegistrationProposal = () => {
    if (!selectedAttributes) return;
    buildRegistrationProposal(selectedAttributes, Math.random);

    // The queued request is what makes the registration survive the session
    // and block the next deploy until a developer applies it. Selection
    // clipboard stays on the HTML id (or missing).
    const request = buildPendingRegistrationRequest(
      selectedAttributes,
      pathname,
      selectedDomId,
      Math.random,
    );
    const token = session?.sessionToken;
    if (!request || !token) {
      return;
    }
    void uiRegistryPendingApiService.submit(request, token).catch(() => undefined);
  };

  return (
    <OverlayChromeBranch
      className="pointer-events-auto fixed bottom-[calc(10rem+var(--asol-safe-area-bottom))] end-4 z-[150] flex max-w-[calc(100vw-2rem)] items-center gap-2"
      {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
    >
      {enabled ? (
        <pre className="max-h-32 max-w-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-on-surface shadow-lg" dir="auto">
          {status}
        </pre>
      ) : null}
      {missingUid ? (
        <button
          {...uiAttributes({
            uid: "super-admin.ui-inspector.add-uid-9Iwzm9",
            id: "super-admin.ui-inspector.add-uid",
            kind: "action",
            action: "copy-registration-proposal",
            part: "add-uid",
          })}
          type="button"
          onClick={copyRegistrationProposal}
          className="pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full border border-primary/40 bg-surface text-primary shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="إضافة العنصر المحدد إلى UiRegistry"
          {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
        >
          <Plus id="super-admin.super-admin-ui-attribute-inspector.plus" className="h-5 w-5" />
        </button>
      ) : null}
      <button
        {...uiAttributes({
          uid: "super-admin.ui-inspector.toggle-9onAQ5",
          id: "super-admin.ui-inspector.toggle",
          kind: "action",
          action: "toggle-inspector",
          part: "toggle",
        })}
        type="button"
        onClick={() => {
          setEnabled((current) => !current);
          setCopyState("idle");
          setCopiedText("");
          setSelectedAttributes(null);
        }}
        className="pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full border border-primary/40 bg-primary text-on-primary shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={enabled ? "إيقاف فحص Attributes" : "تشغيل فحص Attributes"}
        aria-pressed={enabled}
        {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
      >
        {enabled ? copyState === "copied" ? <Check id="super-admin.super-admin-ui-attribute-inspector.check" className="h-5 w-5" /> : <X id="super-admin.super-admin-ui-attribute-inspector.x" className="h-5 w-5" /> : <ScanLine id="super-admin.super-admin-ui-attribute-inspector.scan-line" className="h-5 w-5" />}
      </button>
    </OverlayChromeBranch>
  );
}
