import { formatCount } from "@asol/format-core";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export type SpecialtyDeleteDialogState = {
  type: "main" | "sub";
  categoryId: string;
  subcategoryId?: string;
};

export type SpecialtyDeleteProductWarning = {
  isLoading: boolean;
  count: number;
  names: string[];
};

export function SpecialtiesDeleteDialog({
  dialog,
  warning,
  locale,
  getCategoryName,
  getSubcategoryName,
  onCancel,
  onDelete,
}: {
  dialog: SpecialtyDeleteDialogState;
  warning: SpecialtyDeleteProductWarning;
  locale: "ar" | "en";
  getCategoryName: (categoryId: string) => string;
  getSubcategoryName: (categoryId: string, subcategoryId: string) => string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-error" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-on-surface">
              {locale === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {dialog.type === "main"
                ? locale === "ar"
                  ? `هل أنت متأكد من حذف "${getCategoryName(dialog.categoryId)}"؟ سيتم حذف جميع التخصصات الفرعية التابعة له.`
                  : `Are you sure you want to delete "${getCategoryName(dialog.categoryId)}"? All its subcategories will also be removed.`
                : locale === "ar"
                  ? `هل أنت متأكد من حذف "${getSubcategoryName(dialog.categoryId, dialog.subcategoryId!)}"؟`
                  : `Are you sure you want to delete "${getSubcategoryName(dialog.categoryId, dialog.subcategoryId!)}"?`}
            </p>
            <div className="mt-2 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-on-surface">
              {warning.isLoading ? (
                <span>
                  {locale === "ar"
                    ? "جاري فحص المنتجات المرتبطة بهذا التخصص..."
                    : "Checking products linked to this specialty..."}
                </span>
              ) : warning.count > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium text-warning">
                    {locale === "ar"
                      ? `تنبيه: لديك ${formatCount(warning.count, "ar")} منتج/منتجات داخل هذا التخصص.`
                      : `Warning: you have ${formatCount(warning.count, "en")} product(s) in this specialty.`}
                  </p>
                  {warning.names.length > 0 && (
                    <p className="text-on-surface-variant">
                      {warning.names.join("، ")}
                    </p>
                  )}
                  <p className="text-on-surface-variant">
                    {locale === "ar"
                      ? "إلغاء الاشتراك لا يحذف المنتجات، لكنه قد يجعلها خارج تخصصات ملفك المختارة."
                      : "Unsubscribing will not delete products, but they may no longer match your selected profile specialties."}
                  </p>
                </div>
              ) : (
                <span className="text-on-surface-variant">
                  {locale === "ar"
                    ? "لا توجد منتجات مرتبطة بهذا التخصص حاليًا."
                    : "No products are currently linked to this specialty."}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs"
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onDelete}
            disabled={warning.isLoading}
            className="text-xs bg-error text-on-error"
          >
            {locale === "ar" ? "حذف" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
