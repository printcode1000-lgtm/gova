"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface SuperAdminDeleteTargetUser {
  uid: string;
  phone: string;
  email?: string;
  storeName?: string;
  productCount?: number;
}

interface SuperAdminUserDeleteDialogProps {
  user: SuperAdminDeleteTargetUser | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (targetUid: string) => Promise<void> | void;
}

export function SuperAdminUserDeleteDialog({
  user,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: SuperAdminUserDeleteDialogProps) {
  if (!user) return null;

  const displayName = user.storeName || user.email || user.phone || user.uid;

  const handleConfirm = async () => {
    if (!user.uid || isDeleting) return;
    await onConfirm(user.uid);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && !open && onClose()}>
      <DialogContent className="max-w-md bg-surface text-on-surface">
        <DialogHeader className="space-y-2 text-start">
          <div className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-lg font-bold text-error">
              حذف حساب المستخدم نهائياً
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-on-surface-variant">
            هذا الإجراء نهائي ولا يمكن التراجع عنه.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border bg-surface-variant/20 p-3 space-y-1.5">
            <div className="font-semibold text-on-surface">
              {displayName}
            </div>
            <div className="break-all font-mono text-xs text-on-surface-variant">
              UID: {user.uid}
            </div>
            {user.phone ? (
              <div className="text-xs text-on-surface-variant" dir="ltr">
                الهاتف: {user.phone}
              </div>
            ) : null}
            {typeof user.productCount === "number" && user.productCount > 0 ? (
              <div className="text-xs font-medium text-amber-700">
                يملك {user.productCount} منتج سيتم حذفها.
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs leading-relaxed text-red-800 space-y-1">
            <div className="font-semibold">سيترتب على هذا الإجراء:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>حذف البروفايل والصور والتخصصات ورموز الإشعارات.</li>
              <li>حذف جميع المنتجات المعروضة وتجاوزات الصيدليات.</li>
              <li>تجهيل سجلات الطلبات والمنازعات والمدفوعات السابقة.</li>
              <li>حذف الحساب الدائم من قاعدة البيانات.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                تأكيد الحذف النهائي
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
