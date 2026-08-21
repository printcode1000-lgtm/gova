"use client";

import { Package } from "lucide-react";

export function ProductDeleteDialog({
  locale,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  locale: "ar" | "en";
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5" />
          {locale === "ar" ? "حذف المنتج" : "Delete product"}
        </h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          {locale === "ar"
            ? "سيتم حذف المنتج وصوره نهائيًا من التخزين. هل تريد المتابعة؟"
            : "The product and its stored images will be permanently deleted. Continue?"}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-60"
          >
            {isDeleting
              ? locale === "ar"
                ? "جار الحذف..."
                : "Deleting..."
              : locale === "ar"
                ? "تأكيد الحذف"
                : "Confirm delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
