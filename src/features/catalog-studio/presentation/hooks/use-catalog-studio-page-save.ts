"use client";

import * as React from "react";

import { asolApi } from "@/core/api";
import { usePageSaveRegistration } from "@/features/page-save/ui";
import {
  usePageSaveOperations,
  type PageSaveOperations,
} from "@/features/page-save/ui";
import { buildImageUploadPageSaveItem } from "@/features/page-save";
import {
  CATALOG_STUDIO_API,
  CATALOG_STUDIO_IMAGES_API,
} from "@/features/catalog-studio/application/config/config";
import type {
  CatalogStudioDraftFile,
  CatalogStudioFile,
  CatalogStudioImageRoot,
  CatalogStudioSaveResult,
  CatalogStudioValidationResult,
} from "@/features/catalog-studio/domain/catalog-studio.types";

interface UseCatalogStudioPageSaveInput {
  enabled: boolean;
  changedFiles: string[];
  drafts: Record<string, string>;
  filesByPath: Map<string, CatalogStudioFile>;
  uploadFile: File | null;
  uploadRoot: CatalogStudioImageRoot;
  replaceImage: boolean;
  authHeaders: Record<string, string> | null;
  busy: string;
  draftPayload: () => CatalogStudioDraftFile[];
  onSaved: () => Promise<void>;
  setBusy: (value: string) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  setValidation: (value: CatalogStudioValidationResult | null) => void;
  clearUpload: () => void;
}

export function useCatalogStudioPageSave({
  enabled,
  changedFiles,
  drafts,
  filesByPath,
  uploadFile,
  uploadRoot,
  replaceImage,
  authHeaders,
  busy,
  draftPayload,
  onSaved,
  setBusy,
  setError,
  setNotice,
  setValidation,
  clearUpload,
}: UseCatalogStudioPageSaveInput): PageSaveOperations {
  const operations = usePageSaveOperations("catalog-studio");

  const saveJsonFiles = React.useCallback(
    async (selectedPaths: string[]) => {
      if (!authHeaders || selectedPaths.length === 0) return false;
      setBusy("save");
      setError("");
      try {
        const files = draftPayload().filter((file) =>
          selectedPaths.includes(file.path),
        );
        if (files.length === 0) return false;
        const result = await asolApi.put<CatalogStudioSaveResult>(
          CATALOG_STUDIO_API,
          { files },
          { headers: authHeaders },
        );
        setValidation(result);
        if (!result.saved) {
          setNotice("فشل التحقق؛ لم يتغير أي ملف أصلي.");
          return false;
        }
        await onSaved();
        return true;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : String(saveError));
        return false;
      } finally {
        setBusy("");
      }
    },
    [
      authHeaders,
      draftPayload,
      onSaved,
      setBusy,
      setError,
      setNotice,
      setValidation,
    ],
  );

  const uploadStagedImage = React.useCallback(async () => {
    if (!authHeaders || !uploadFile) return true;
    setBusy("image-upload");
    setError("");
    try {
      const form = new FormData();
      form.set("file", uploadFile);
      form.set("root", uploadRoot);
      form.set("replace", String(replaceImage));
      await asolApi.postForm(CATALOG_STUDIO_IMAGES_API, form, {
        headers: authHeaders,
      });
      clearUpload();
      await onSaved();
      return true;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      return false;
    } finally {
      setBusy("");
    }
  }, [
    authHeaders,
    clearUpload,
    onSaved,
    replaceImage,
    setBusy,
    setError,
    setNotice,
    uploadFile,
    uploadRoot,
  ]);

  const items = React.useMemo(
    () => [
      ...operations.items,
      ...changedFiles.map((filePath) => ({
        id: `file:${filePath}`,
        label: filePath,
        isDirty: true,
        canSave: Boolean(drafts[filePath] && filesByPath.get(filePath)),
      })),
      ...(uploadFile
        ? [
            buildImageUploadPageSaveItem({
              id: "catalog-studio-image",
              label: "رفع صورة الكتالوج",
              hasPending: true,
            }),
          ]
        : []),
    ],
    [changedFiles, drafts, filesByPath, operations.items, uploadFile],
  );

  usePageSaveRegistration({
    id: "catalog-studio",
    label: "استوديو الكتالوج",
    returnPath: "/super-admin/catalog",
    enabled,
    items,
    isSaving: busy === "save" || busy === "image-upload",
    canSave: items.length > 0 && !busy,
    prepareForSave: async (selectedItemIds) => {
      if (!selectedItemIds.includes("catalog-studio-image")) return true;
      return uploadStagedImage();
    },
    save: async (selectedItemIds) => {
      const operationsSaved = await operations.run(selectedItemIds);
      const filePaths = selectedItemIds
        .filter((id) => id.startsWith("file:"))
        .map((id) => id.slice("file:".length));
      if (filePaths.length === 0) return operationsSaved;
      return (await saveJsonFiles(filePaths)) && operationsSaved;
    },
  });

  return operations;
}
