"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { ProfilePageContentModel } from "./ProfilePageContent.model";

export function ProfileSaveDialog({
  model,
}: {
  model: ProfilePageContentModel;
}) {
  const { locale, saveDialog, setSaveDialog } = model;
  if (!saveDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface w-full max-w-sm space-y-3 rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          {saveDialog.type === "success" ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-success"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error/10">
              <AlertTriangle className="h-5 w-5 text-error" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-on-surface">
              {saveDialog.type === "success"
                ? locale === "ar"
                  ? "نجاح"
                  : "Success"
                : locale === "ar"
                  ? "خطأ"
                  : "Error"}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              {saveDialog.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() => setSaveDialog(null)}
            className="h-9 rounded-lg bg-primary px-4 py-2 font-medium text-on-primary transition-colors"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
