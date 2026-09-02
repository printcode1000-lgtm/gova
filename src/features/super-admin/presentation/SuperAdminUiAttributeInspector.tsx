"use client";

import { Check, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NativeCore } from "@asol/native-core";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import {
  INSPECTOR_ACTIVE_ATTRIBUTE,
  INSPECTOR_CONTROL_ATTRIBUTE,
} from "@/shared/ui/overlay-chrome";
import { OverlayChromeBranch } from "@/shared/ui/overlay-chrome-branch";

import { formatInspectorOutput } from "./ui-attribute-inspector-model";
import {
  pickIdentifiedElement,
  pickInspectedElement,
  type InspectedElement,
} from "./ui-inspector-element-picker";

type CopyState = "idle" | "copied" | "failed";

/** True for the inspector's own controls, which are never selectable. */
function isInspectorControl(element: InspectedElement | null): boolean {
  return element !== null && element.closest(`[${INSPECTOR_CONTROL_ATTRIBUTE}]`) !== null;
}

function attributesFor(element: InspectedElement): Record<string, string> {
  return Object.fromEntries(
    element
      .getAttributeNames()
      .filter((name) => name === "id")
      .map((name) => [name, element.getAttribute(name) ?? ""]),
  );
}

/**
 * Super-admin-only touch inspector. While active, a pointer selects the DOM
 * element it lands on, or its closest identified ancestor for unowned internal
 * DOM, copies that id, and never triggers the touched element itself.
 */
export function SuperAdminUiAttributeInspector() {
  const { session, isLoading } = useSession();
  const authorized = !isLoading && isSuperAdmin(session);
  const [enabled, setEnabled] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const selectedRef = useRef<InspectedElement | null>(null);
  const selectedOutlineRef = useRef<{ outline: string; outlineOffset: string } | null>(null);
  const copySequenceRef = useRef(0);

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
      const touched = pickInspectedElement(event.target);
      if (!touched || isInspectorControl(touched)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const selected = pickIdentifiedElement(touched);
      if (!selected) {
        setCopiedText(formatInspectorOutput(undefined));
        setCopyState("idle");
        clearSelection();
        return;
      }

      clearSelection();
      selectedRef.current = selected;
      selectedOutlineRef.current = {
        outline: selected.style.outline,
        outlineOffset: selected.style.outlineOffset,
      };
      selected.style.outline = "3px solid var(--color-primary)";
      selected.style.outlineOffset = "2px";

      const ownAttributes = attributesFor(selected);
      const text = formatInspectorOutput(ownAttributes);
      setCopiedText(text);
      setCopyState("idle");
      const copySequence = ++copySequenceRef.current;
      void NativeCore.writeClipboard({ string: text }).then((result) => {
        if (copySequence !== copySequenceRef.current) return;
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
      ? `${copiedText} - تعذر النسخ`
      : copiedText || "المس أي عنصر لنسخ id"
    : "فحص Attributes";
  return (
    <OverlayChromeBranch
      className="pointer-events-auto fixed bottom-[calc(10rem+var(--asol-safe-area-bottom))] end-4 z-[150] flex max-w-[calc(100vw-2rem)] items-center gap-2"
      {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
    >
      {enabled ? (
        <pre id="features-super-admin-presentation-superadminuiattributeinspector-pre-1-9xaqvo" className="max-h-32 max-w-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-on-surface shadow-lg" dir="auto">
          {status}
        </pre>
      ) : null}
      <button id="features-super-admin-presentation-superadminuiattributeinspector-button-2-kal5qx"
        type="button"
        onClick={() => {
          setEnabled((current) => !current);
          setCopyState("idle");
          setCopiedText("");
        }}
        className="pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full border border-primary/40 bg-primary text-on-primary shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={enabled ? "إيقاف فحص Attributes" : "تشغيل فحص Attributes"}
        aria-pressed={enabled}
        {...{ [INSPECTOR_CONTROL_ATTRIBUTE]: "true" }}
      >
        {enabled ? copyState === "copied" ? <Check id='features-super-admin-presentation-superadminuiattributeinspector-check-3-ffcpeh' className="h-5 w-5" /> : <X id='features-super-admin-presentation-superadminuiattributeinspector-x-4-wqxro2' className="h-5 w-5" /> : <ScanLine id='features-super-admin-presentation-superadminuiattributeinspector-scanline-5-rhdyhy' className="h-5 w-5" />}
      </button>
    </OverlayChromeBranch>
  );
}
