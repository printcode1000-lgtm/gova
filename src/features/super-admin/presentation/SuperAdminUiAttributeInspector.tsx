"use client";

import { Check, Plus, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NativeCore } from "@asol/native-core";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { uiAttributes } from "@asol/ui-registry-core";

import {
  formatInspectorOutput,
  selectedUiUid,
} from "./ui-attribute-inspector-model";
import {
  pickInspectedElement,
  type InspectedElement,
} from "./ui-inspector-element-picker";
import { buildRegistrationProposal } from "./ui-registration-proposal";

type CopyState = "idle" | "copied" | "failed";

const INSPECTOR_CONTROL_ATTRIBUTE = "data-asol-ui-inspector-control";

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
          name === "data-ui" ||
          name.startsWith("data-ui-") ||
          name.startsWith("data-simulation-"),
      )
      .map((name) => [name, element.getAttribute(name) ?? ""]),
  );
}

function attributeTreeFor(element: InspectedElement): Record<string, string>[] {
  const tree: Record<string, string>[] = [];
  for (let current: InspectedElement | null = element; current; current = current.parentElement) {
    const attributes = attributesFor(current);
    if (Object.keys(attributes).length > 0) tree.push(attributes);
  }
  return tree;
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

      const tree = attributeTreeFor(selected);
      const ownAttributes = attributesFor(selected);
      setSelectedAttributes(ownAttributes);
      const text = formatInspectorOutput(ownAttributes, tree);
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
      : copiedText || "المس أي عنصر لنسخ Attributes"
    : "فحص Attributes";
  const missingUid = enabled && selectedAttributes !== null && selectedUiUid(selectedAttributes) === null;

  // The proposal is text only. It never mutates source code and never touches
  // the selected element or the page it belongs to.
  const copyRegistrationProposal = () => {
    if (!selectedAttributes) return;
    const proposal = buildRegistrationProposal(selectedAttributes, Math.random);
    setCopiedText(proposal);
    void NativeCore.writeClipboard({ string: proposal }).then((result) => {
      setCopyState(result.ok ? "copied" : "failed");
    });
  };

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(10rem+var(--asol-safe-area-bottom))] end-4 z-[150] flex max-w-[calc(100vw-2rem)] items-center gap-2"
      {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
    >
      {enabled ? (
        <pre className="max-h-32 max-w-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-on-surface shadow-lg" dir="ltr">
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
          <Plus className="h-5 w-5" />
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
        {enabled ? copyState === "copied" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
      </button>
    </div>
  );
}
