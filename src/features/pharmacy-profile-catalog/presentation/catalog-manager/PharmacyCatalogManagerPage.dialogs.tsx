"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, PackagePlus, Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { pharmacyProfileCatalogApi } from "../../application/services/pharmacy-profile-catalog-api";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_SUBCATEGORY_ID,
  type PharmacyProfileCatalogCategoryView,
  type PharmacyProfileCatalogProductView,
  type PharmacyProfileCatalogSubcategoryView,
  type PharmacyProfileCatalogView,
} from "../../domain/pharmacy-profile-catalog.types";
import { PharmacyCategoryIcon } from "../PharmacyCategoryIcon";
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";

export const text = {
  title: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629",
  subtitle:
    "\u0623\u062f\u0631 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0648\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0635\u064a\u062f\u0644\u064a\u062a\u0643.",
  back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0628\u0631\u0648\u0641\u0627\u064a\u0644",
  mainCategories: "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
  subcategories: "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0641\u0631\u0639\u064a\u0629",
  products: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
  addMain: "\u0625\u0636\u0627\u0641\u0629 \u0631\u0626\u064a\u0633\u064a",
  addSub: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639\u064a",
  addProduct: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c \u062c\u062f\u064a\u062f",
  addMainTitle:
    "\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641 \u0631\u0626\u064a\u0633\u064a",
  addSubTitle:
    "\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641 \u0641\u0631\u0639\u064a",
  editMainTitle:
    "\u062a\u0639\u062f\u064a\u0644 \u062a\u0635\u0646\u064a\u0641 \u0631\u0626\u064a\u0633\u064a",
  editSubTitle:
    "\u062a\u0639\u062f\u064a\u0644 \u062a\u0635\u0646\u064a\u0641 \u0641\u0631\u0639\u064a",
  nameLabel: "\u0627\u0644\u0627\u0633\u0645",
  mainNamePlaceholder:
    "\u0627\u0633\u0645 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
  subNamePlaceholder:
    "\u0627\u0633\u0645 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0641\u0631\u0639\u064a",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
  stageForSave: "\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u062d\u0641\u0638",
  edit: "\u062a\u0639\u062f\u064a\u0644",
  emptyProducts:
    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0641\u0631\u0639\u064a.",
  hidden: "\u0645\u062e\u0641\u064a",
  visible: "\u0638\u0627\u0647\u0631",
  restore: "\u0627\u0633\u062a\u0639\u0627\u062f\u0629",
  hide: "\u0625\u062e\u0641\u0627\u0621",
  noAccess: "\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u0625\u062f\u0627\u0631\u0629 \u0635\u064a\u062f\u0644\u064a\u0629 \u0645\u0633\u062a\u062e\u062f\u0645 \u0622\u062e\u0631.",
  loginRequired:
    "\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629.",
};

export function CreateCategoryDialog({ id,
  dialog,
  value,
  disabled,
  onChange,
  onClose,
  onSubmit,
}: {
  dialog:
    | { mode: "create"; kind: "category" | "subcategory" }
    | { mode: "edit"; kind: "category"; item: PharmacyProfileCatalogCategoryView }
    | { mode: "edit"; kind: "subcategory"; item: PharmacyProfileCatalogSubcategoryView };
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
} & { id?: string }) {
  const title =
    dialog.mode === "create"
      ? dialog.kind === "category"
        ? text.addMainTitle
        : text.addSubTitle
      : dialog.kind === "category"
        ? text.editMainTitle
        : text.editSubTitle;
  const placeholder = dialog.kind === "category" ? text.mainNamePlaceholder : text.subNamePlaceholder;
  return (
    <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div-13Y6FW", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div" })} id={id} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.form-9lePWQ", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.form" })}
        className="w-full max-w-md rounded-lg border border-outline-variant bg-surface p-4 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h2 {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.h2-8c5Tq7", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.h2" })} className="text-base font-bold text-on-surface">{title}</h2>
        <label {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.label-3Rx8MI", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.label" })} className="mt-4 block space-y-1.5 text-sm font-semibold text-on-surface">
          <span {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span-5b9gFM", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span" })}>{text.nameLabel}</span>
          <input {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.input-7aQH7j", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.input" })}
            autoFocus
            value={value}
            maxLength={120}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.2-5mOvnp", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.2" })} className="mt-5 flex justify-end gap-2">
          <button {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button-wKZ9SN", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button" })}
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="h-9 rounded-lg border border-outline-variant px-4 text-xs font-semibold text-on-surface disabled:opacity-60"
          >
            {text.cancel}
          </button>
          <button {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.2-zuq8Hz", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.2" })}
            type="submit"
            disabled={disabled || !value.trim()}
            className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
          >
            {text.stageForSave}
          </button>
        </div>
      </form>
    </div>
  );
}

export function IconButton({ id,
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <button {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.3-7TSxKV", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.3" })} id={id}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant disabled:opacity-50"
      aria-label={title}
    >
      {children}
    </button>
  );
}

export function ManagerColumn({ id,
  title,
  actionLabel,
  disabled,
  onAdd,
  children,
}: {
  title: string;
  actionLabel?: string;
  disabled?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.3-DCa65D", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.3" })} id={id} className="flex min-h-0 flex-col gap-3 border-b border-outline-variant p-3 lg:border-b-0 lg:border-e">
      <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.4-PSE88o", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.4" })} className="flex items-center justify-between gap-2">
        <h2 {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.h2.2-lB041q", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.h2.2" })} className="text-sm font-bold text-on-surface">{title}</h2>
        {actionLabel && onAdd ? (
          <button {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.4-8U8ZKu", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.button.4" })}
            type="button"
            disabled={disabled}
            onClick={onAdd}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-semibold text-on-primary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.5-605GgQ", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.5" })} className="min-h-0 flex-1 space-y-2 overflow-y-auto pe-1">{children}</div>
    </div>
  );
}

export function ProductManagerCard({ id,
  product,
  disabled,
  onToggle,
  toggleUi,
}: {
  product: PharmacyProfileCatalogProductView;
  disabled?: boolean;
  onToggle: () => void;
  /** Registered descriptor for this row's visibility toggle, from the caller. */
  toggleUi?: UiDescriptor;
} & { id?: string }) {
  return (
    <article {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.article-PZ3ewD", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.article" })} id={id} className={`rounded-lg border border-outline-variant bg-surface-container-low p-2 ${product.status === "hidden" ? "opacity-55" : ""}`}>
      <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.6-ZQpA7s", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.6" })} className="flex gap-3">
        <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.7-FV7hIH", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.7" })} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-bright">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.nameAr} fill className="object-cover" />
          ) : null}
        </div>
        <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.8-XI8hd1", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.8" })} className="min-w-0 flex-1">
          <p {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p-w22O8Q", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p" })} className="line-clamp-2 text-xs font-semibold text-on-surface">{product.nameAr}</p>
          <p {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p.2-rpc5PP", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p.2" })} className="mt-1 truncate text-[10px] text-on-surface-variant">{product.nameEn}</p>
          <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.9-ee8ehY", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.9" })} className="mt-2 flex items-center justify-between gap-2">
            <StatusBadge hidden={product.status === "hidden"} />
            <VisibilityButton ui={{ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.visibility-button-Xsep4k", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.visibility-button" }}
              hidden={product.status === "hidden"}
              disabled={disabled}
              onClick={onToggle}
              ui={toggleUi}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function StatusBadge({ id, hidden }: { hidden: boolean } & { id?: string }) {
  return (
    <span {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2-AC8Xho", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2" })} id={id} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hidden ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
      {hidden ? text.hidden : text.visible}
    </span>
  );
}

export function VisibilityButton({
  hidden,
  disabled,
  onClick,
  ui,
}: {
  hidden: boolean;
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  /** Registered UiRegistry descriptor for this instance, from the caller. */
  ui?: UiDescriptor;
} & { id?: string }) {
  return (
    <button
      {...(ui ? uiAttributes(ui) : {})}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant disabled:opacity-50"
      aria-label={hidden ? text.restore : text.hide}
    >
      {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}

export function LoadingFrame({ id, compact = false }: { compact?: boolean } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.10-SFYg3W", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.div.10" })} id={id} className={`flex items-center justify-center ${compact ? "min-h-[360px]" : "min-h-screen"}`}>
      <LoadingSpinner ui={{ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.loading-spinner-aj6oX7", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.loading-spinner" }} size="lg" />
    </div>
  );
}

export function MessageFrame({ id, message }: { message: string } & { id?: string }) {
  return (
    <main {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.main-3Z15JB", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.main" })} id={id} className="grid min-h-screen place-items-center bg-background p-4">
      <p {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p.3-2V5lkr", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.p.3" })} className="rounded-lg border border-outline-variant bg-surface p-5 text-center text-sm text-on-surface">
        {message}
      </p>
    </main>
  );
}
