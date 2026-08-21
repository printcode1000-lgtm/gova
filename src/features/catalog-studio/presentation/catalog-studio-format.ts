import type { CatalogStudioFile } from "../domain/catalog-studio.types";

export type JsonRecord = Record<string, unknown>;

export function parseObject(content: string): JsonRecord | null {
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonRecord)
      : null;
  } catch {
    return null;
  }
}

export function formatted(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function itemsFor(
  value: JsonRecord | null,
  file: CatalogStudioFile | null,
): JsonRecord[] {
  if (!value || !file?.itemKey) return [];
  const items = value[file.itemKey];
  return Array.isArray(items) ? (items as JsonRecord[]) : [];
}

export function displayFor(item: JsonRecord): JsonRecord | null {
  return item.display && typeof item.display === "object" && !Array.isArray(item.display)
    ? (item.display as JsonRecord)
    : null;
}

export function nameFor(item: JsonRecord, locale: "ar" | "en"): string {
  const name = item.name;
  return name && typeof name === "object" && !Array.isArray(name)
    ? String((name as JsonRecord)[locale] ?? "")
    : "";
}

export function identityFor(item: JsonRecord): string {
  return String(item.id ?? item.key ?? item.column ?? "—");
}

export function parentKey(item: JsonRecord, collections: JsonRecord[]): string {
  if (item.categoryId !== undefined) return `category:${String(item.categoryId)}`;
  if (item.subcategoryId !== undefined) return `subcategory:${String(item.subcategoryId)}`;
  if (item.id !== undefined) {
    const collection = collections.find((candidate) =>
      Array.isArray(candidate.memberCategoryIds)
        ? candidate.memberCategoryIds.some((id) => String(id) === String(item.id))
        : false,
    );
    if (collection) return `collection:${identityFor(collection)}`;
  }
  return "root";
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = raw.split(":")[0];
  const messages: Record<string, string> = {
    forbidden: "الجلسة الحالية لا تملك صلاحية Super Admin.",
    catalogStudioDevelopmentOnly: "استوديو الكتالوج يعمل في وضع التطوير فقط.",
    catalogStudioNoChanges: "لا توجد تعديلات للتحقق أو الحفظ.",
    catalogStudioSaveBusy: "توجد عملية حفظ أخرى قيد التنفيذ.",
    catalogStudioConcurrentChange: "تغير الملف على القرص بعد فتحه. أعد التحميل قبل الحفظ.",
    catalogStudioImageAlreadyExists: "توجد صورة بالاسم نفسه. فعّل خيار الاستبدال إذا كان مقصودًا.",
    catalogStudioImageReferenced: "لا يمكن حذف صورة مرتبطة بعناصر الكتالوج.",
    catalogStudioImageSignatureInvalid: "محتوى الصورة لا يطابق امتدادها.",
    catalogStudioImageSizeInvalid: "الصورة فارغة أو أكبر من 10 MB.",
    catalogStudioImageTypeInvalid: "الامتدادات المسموحة للرفع: PNG وJPG وWEBP.",
  };
  return messages[code] ?? raw;
}
