"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  CheckCircle2,
  ChevronLeft,
  CircleOff,
  ClipboardCheck,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileJson,
  GitCompareArrows,
  GripVertical,
  History,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { isNativePlatform } from "@/native-platform/core/platform";
import { cn } from "@/lib/utils";

import {
  CATALOG_STUDIO_API,
  CATALOG_STUDIO_DRAFT_KEY,
  CATALOG_STUDIO_IMAGES_API,
  CATALOG_STUDIO_MIN_WIDTH,
} from "../config";
import type {
  CatalogStudioDraftFile,
  CatalogStudioFile,
  CatalogStudioGroup,
  CatalogStudioImageRoot,
  CatalogStudioSaveResult,
  CatalogStudioSnapshot,
  CatalogStudioValidationResult,
} from "../domain/catalog-studio.types";

type StudioSection =
  | "overview"
  | "core"
  | "pharmacy"
  | "vehicles"
  | "assets"
  | "schemas"
  | "audit";
type EditorMode = "structured" | "raw" | "relations" | "diff";
type JsonRecord = Record<string, unknown>;

interface StoredDraft {
  revision: string;
  files: Record<string, string>;
}

const sectionLabels: Record<StudioSection, string> = {
  overview: "نظرة عامة",
  core: "التصنيفات",
  pharmacy: "الصيدلية",
  vehicles: "المركبات",
  assets: "الصور",
  schemas: "Schemas",
  audit: "التحقق والسجل",
};

const groupSections: Partial<Record<StudioSection, CatalogStudioGroup>> = {
  core: "core",
  pharmacy: "pharmacy",
  vehicles: "vehicles",
  schemas: "schemas",
};

const primitiveKeys = [
  "id",
  "key",
  "categoryId",
  "subcategoryId",
  "originalId",
  "icon",
  "image",
  "imagePath",
  "prescriptionRequired",
  "optionFile",
  "supportsImage",
  "isDefault",
  "value",
  "column",
  "kind",
  "mainId",
  "childId",
] as const;

function parseObject(content: string): JsonRecord | null {
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonRecord)
      : null;
  } catch {
    return null;
  }
}

function formatted(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function itemsFor(value: JsonRecord | null, file: CatalogStudioFile | null): JsonRecord[] {
  if (!value || !file?.itemKey) return [];
  const items = value[file.itemKey];
  return Array.isArray(items) ? (items as JsonRecord[]) : [];
}

function displayFor(item: JsonRecord): JsonRecord | null {
  return item.display && typeof item.display === "object" && !Array.isArray(item.display)
    ? (item.display as JsonRecord)
    : null;
}

function nameFor(item: JsonRecord, locale: "ar" | "en"): string {
  const name = item.name;
  return name && typeof name === "object" && !Array.isArray(name)
    ? String((name as JsonRecord)[locale] ?? "")
    : "";
}

function identityFor(item: JsonRecord): string {
  return String(item.id ?? item.key ?? item.column ?? "—");
}

function parentKey(item: JsonRecord, collections: JsonRecord[]): string {
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

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorText(error: unknown): string {
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

function StatusBox({ kind, children }: { kind: "error" | "success" | "notice"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        kind === "error" && "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
        kind === "success" && "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
        kind === "notice" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
      )}
    >
      {children}
    </div>
  );
}

function SectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-surface-bright text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function CatalogStudioPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const authorized = !sessionLoading && isSuperAdmin(session);
  const [desktopWeb, setDesktopWeb] = React.useState<boolean | null>(null);
  const [snapshot, setSnapshot] = React.useState<CatalogStudioSnapshot | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [section, setSection] = React.useState<StudioSection>("overview");
  const [selectedPath, setSelectedPath] = React.useState("core/categories.json");
  const [mode, setMode] = React.useState<EditorMode>("structured");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [imageSearch, setImageSearch] = React.useState("");
  const [imageRootFilter, setImageRootFilter] = React.useState<"all" | CatalogStudioImageRoot>("all");
  const [onlyUnreferenced, setOnlyUnreferenced] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [validation, setValidation] = React.useState<CatalogStudioValidationResult | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [itemJson, setItemJson] = React.useState("");
  const [itemJsonError, setItemJsonError] = React.useState("");
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [uploadRoot, setUploadRoot] = React.useState<CatalogStudioImageRoot>("mainCategories");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [replaceImage, setReplaceImage] = React.useState(false);
  const draftRestored = React.useRef(false);

  React.useEffect(() => {
    const update = () =>
      setDesktopWeb(!isNativePlatform() && window.innerWidth >= CATALOG_STUDIO_MIN_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const authHeaders = React.useMemo(
    () =>
      session?.sessionToken
        ? { "x-asol-session-token": session.sessionToken }
        : undefined,
    [session?.sessionToken],
  );

  const loadSnapshot = React.useCallback(
    async (options: { clearDrafts?: boolean } = {}) => {
      if (!authorized || !authHeaders || desktopWeb !== true) return;
      setBusy("load");
      setError("");
      try {
        const next = await asolApi.get<CatalogStudioSnapshot>(CATALOG_STUDIO_API, {
          headers: authHeaders,
          cache: "no-store",
        });
        setSnapshot(next);
        if (options.clearDrafts) {
          setDrafts({});
          sessionStorage.removeItem(CATALOG_STUDIO_DRAFT_KEY);
          draftRestored.current = true;
        } else if (!draftRestored.current) {
          draftRestored.current = true;
          try {
            const stored = sessionStorage.getItem(CATALOG_STUDIO_DRAFT_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as StoredDraft;
              if (parsed.revision === next.revision) {
                const allowed = new Set(next.files.filter((file) => !file.readOnly).map((file) => file.path));
                setDrafts(
                  Object.fromEntries(Object.entries(parsed.files).filter(([filePath]) => allowed.has(filePath))),
                );
                setNotice("تمت استعادة المسودة المحلية المطابقة لنفس إصدار الملفات.");
              } else {
                sessionStorage.removeItem(CATALOG_STUDIO_DRAFT_KEY);
                setNotice("لم تُستعد مسودة قديمة لأن الملفات تغيرت على القرص.");
              }
            }
          } catch {
            sessionStorage.removeItem(CATALOG_STUDIO_DRAFT_KEY);
          }
        }
      } catch (loadError) {
        setError(errorText(loadError));
      } finally {
        setBusy("");
      }
    },
    [authorized, authHeaders, desktopWeb],
  );

  React.useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  React.useEffect(() => {
    if (!snapshot || !draftRestored.current) return;
    try {
      if (Object.keys(drafts).length === 0) {
        sessionStorage.removeItem(CATALOG_STUDIO_DRAFT_KEY);
      } else {
        sessionStorage.setItem(
          CATALOG_STUDIO_DRAFT_KEY,
          JSON.stringify({ revision: snapshot.revision, files: drafts } satisfies StoredDraft),
        );
      }
    } catch {
      setNotice("المسودة كبيرة ولا يمكن حفظها في sessionStorage؛ أبقِ الصفحة مفتوحة حتى الحفظ.");
    }
  }, [drafts, snapshot]);

  React.useEffect(() => {
    if (Object.keys(drafts).length === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [drafts]);

  const filesByPath = React.useMemo(
    () => new Map(snapshot?.files.map((file) => [file.path, file]) ?? []),
    [snapshot?.files],
  );
  const selectedFile = filesByPath.get(selectedPath) ?? null;
  const selectedContent = selectedFile
    ? (drafts[selectedFile.path] ?? selectedFile.content)
    : "";
  const selectedData = React.useMemo(() => parseObject(selectedContent), [selectedContent]);
  const selectedItems = React.useMemo(
    () => itemsFor(selectedData, selectedFile),
    [selectedData, selectedFile],
  );
  const currentItem = selectedItems[selectedIndex] ?? null;
  const changedFiles = React.useMemo(
    () =>
      Object.entries(drafts)
        .filter(([filePath, content]) => filesByPath.get(filePath)?.content !== content)
        .map(([filePath]) => filePath)
        .sort(),
    [drafts, filesByPath],
  );

  React.useEffect(() => {
    setItemJson(currentItem ? formatted(currentItem) : "");
    setItemJsonError("");
  }, [currentItem, selectedPath]);

  const setFileContent = React.useCallback(
    (filePath: string, content: string) => {
      const original = filesByPath.get(filePath);
      if (!original || original.readOnly) return;
      setDrafts((current) => {
        if (content === original.content) {
          const next = { ...current };
          delete next[filePath];
          return next;
        }
        return { ...current, [filePath]: content };
      });
      setValidation(null);
    },
    [filesByPath],
  );

  const replaceData = React.useCallback(
    (next: JsonRecord) => {
      if (!selectedFile) return;
      setFileContent(selectedFile.path, formatted(next));
    },
    [selectedFile, setFileContent],
  );

  const updateItem = React.useCallback(
    (index: number, nextItem: JsonRecord) => {
      if (!selectedData || !selectedFile?.itemKey) return;
      const nextItems = [...selectedItems];
      nextItems[index] = nextItem;
      replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
    },
    [replaceData, selectedData, selectedFile, selectedItems],
  );

  const collections = React.useMemo(() => {
    const file = filesByPath.get("core/collections.json");
    return file ? itemsFor(parseObject(drafts[file.path] ?? file.content), file) : [];
  }, [drafts, filesByPath]);

  const reorder = React.useCallback(
    (from: number, to: number) => {
      if (!selectedData || !selectedFile?.itemKey || from === to) return;
      const source = selectedItems[from];
      const target = selectedItems[to];
      if (!source || !target || parentKey(source, collections) !== parentKey(target, collections)) {
        setError("لا يمكن ترتيب عنصرين من مستويين أب مختلفين.");
        return;
      }
      const nextItems = [...selectedItems];
      const [moved] = nextItems.splice(from, 1);
      nextItems.splice(to, 0, moved!);
      const siblingKey = parentKey(moved!, collections);
      let order = 10;
      for (const item of nextItems) {
        if (parentKey(item, collections) !== siblingKey) continue;
        const display = displayFor(item);
        if (display) item.display = { ...display, order };
        order += 10;
      }
      replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
      setSelectedIndex(to);
    },
    [collections, replaceData, selectedData, selectedFile, selectedItems],
  );

  const draftPayload = React.useCallback((): CatalogStudioDraftFile[] => {
    return changedFiles.map((filePath) => ({
      path: filePath,
      content: drafts[filePath]!,
      baseHash: filesByPath.get(filePath)!.hash,
    }));
  }, [changedFiles, drafts, filesByPath]);

  const validateChanges = React.useCallback(async () => {
    if (!authHeaders || changedFiles.length === 0) return;
    setBusy("validate");
    setError("");
    setNotice("");
    try {
      const result = await asolApi.post<CatalogStudioValidationResult>(
        CATALOG_STUDIO_API,
        { files: draftPayload() },
        { headers: authHeaders },
      );
      setValidation(result);
      setNotice(result.valid ? "المسودة اجتازت التحقق الشامل ويمكن حفظها." : "المسودة تحتوي أخطاء ولم تتغير الملفات الأصلية.");
    } catch (validationError) {
      setError(errorText(validationError));
    } finally {
      setBusy("");
    }
  }, [authHeaders, changedFiles.length, draftPayload]);

  const saveChanges = React.useCallback(async () => {
    if (!authHeaders || changedFiles.length === 0) return;
    setBusy("save");
    setError("");
    try {
      const result = await asolApi.put<CatalogStudioSaveResult>(
        CATALOG_STUDIO_API,
        { files: draftPayload() },
        { headers: authHeaders },
      );
      setValidation(result);
      if (!result.saved) {
        setNotice("فشل التحقق؛ لم يتغير أي ملف أصلي.");
        setSaveDialogOpen(false);
        return;
      }
      setNotice(`تم حفظ ${result.changedFiles.length} ملفًا بعد التحقق والـ rollback guard.`);
      setSaveDialogOpen(false);
      await loadSnapshot({ clearDrafts: true });
    } catch (saveError) {
      setError(errorText(saveError));
      setSaveDialogOpen(false);
    } finally {
      setBusy("");
    }
  }, [authHeaders, changedFiles.length, draftPayload, loadSnapshot]);

  const openFile = React.useCallback((file: CatalogStudioFile) => {
    setSelectedPath(file.path);
    setSelectedIndex(0);
    setSearch("");
    setMode(file.readOnly ? "raw" : "structured");
  }, []);

  const groupFiles = React.useMemo(() => {
    const group = groupSections[section];
    if (!group) return [];
    return (
      snapshot?.files.filter(
        (file) => file.group === group || (section === "core" && file.group === "manifest"),
      ) ?? []
    );
  }, [section, snapshot?.files]);

  React.useEffect(() => {
    if (groupFiles.length > 0 && !groupFiles.some((file) => file.path === selectedPath)) {
      openFile(groupFiles[0]!);
    }
  }, [groupFiles, openFile, selectedPath]);

  const filteredRows = React.useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("en");
    return selectedItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !needle || JSON.stringify(item).toLocaleLowerCase("en").includes(needle));
  }, [search, selectedItems]);

  const selectedNode = currentItem && selectedFile ? `${selectedFile.path}#${identityFor(currentItem)}` : "";
  const itemRelations = React.useMemo(
    () => snapshot?.relations.filter((relation) => relation.from === selectedNode || relation.to === selectedNode) ?? [],
    [selectedNode, snapshot?.relations],
  );

  const updatePrimitive = React.useCallback(
    (key: string, raw: string | boolean) => {
      if (!currentItem) return;
      const currentValue = currentItem[key];
      let value: unknown = raw;
      if (typeof currentValue === "number") value = Number(raw);
      if (currentValue === null && raw === "") value = null;
      updateItem(selectedIndex, { ...currentItem, [key]: value });
    },
    [currentItem, selectedIndex, updateItem],
  );

  const updateName = React.useCallback(
    (locale: "ar" | "en", value: string) => {
      if (!currentItem) return;
      const name = currentItem.name as JsonRecord | undefined;
      updateItem(selectedIndex, { ...currentItem, name: { ...(name ?? {}), [locale]: value } });
    },
    [currentItem, selectedIndex, updateItem],
  );

  const updateDisplay = React.useCallback(
    (key: "order" | "hidden", value: number | boolean) => {
      if (!currentItem) return;
      updateItem(selectedIndex, {
        ...currentItem,
        display: { ...(displayFor(currentItem) ?? {}), [key]: value },
      });
    },
    [currentItem, selectedIndex, updateItem],
  );

  const applyItemJson = React.useCallback(() => {
    try {
      const next: unknown = JSON.parse(itemJson);
      if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error("يجب أن يكون العنصر Object.");
      updateItem(selectedIndex, next as JsonRecord);
      setItemJsonError("");
    } catch (parseError) {
      setItemJsonError(parseError instanceof Error ? parseError.message : String(parseError));
    }
  }, [itemJson, selectedIndex, updateItem]);

  const addItem = React.useCallback(() => {
    if (!selectedData || !selectedFile?.itemKey || selectedFile.readOnly) return;
    const base = structuredClone(selectedItems.at(-1) ?? selectedItems[0] ?? { display: { order: 10, hidden: true } });
    const numericIds = selectedItems.map((item) => item.id).filter((id): id is number => typeof id === "number");
    if ("id" in base) base.id = numericIds.length ? Math.max(...numericIds) + 1 : `new-item-${Date.now()}`;
    if ("key" in base) base.key = `new-key-${Date.now()}`;
    if (base.name && typeof base.name === "object") base.name = { ar: "عنصر جديد", en: "New Item" };
    const display = displayFor(base);
    if (display) {
      const maxOrder = Math.max(0, ...selectedItems.map((item) => Number(displayFor(item)?.order ?? 0)));
      base.display = { ...display, order: maxOrder + 10, hidden: true };
    }
    const nextItems = [...selectedItems, base];
    replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
    setSelectedIndex(nextItems.length - 1);
  }, [replaceData, selectedData, selectedFile, selectedItems]);

  const cloneItemAt = React.useCallback((sourceIndex: number) => {
    const sourceItem = selectedItems[sourceIndex];
    if (!sourceItem || !selectedData || !selectedFile?.itemKey) return;
    const clone = structuredClone(sourceItem);
    if (typeof clone.id === "number") {
      clone.id = Math.max(0, ...selectedItems.map((item) => Number(item.id) || 0)) + 1;
    } else if (clone.id !== undefined) clone.id = `${String(clone.id)}-copy`;
    if (clone.key !== undefined) clone.key = `${String(clone.key)}-copy`;
    const display = displayFor(clone);
    if (display) clone.display = { ...display, order: Number(display.order) + 5, hidden: true };
    const nextItems = [...selectedItems, clone];
    replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
    setSelectedIndex(nextItems.length - 1);
  }, [replaceData, selectedData, selectedFile, selectedItems]);

  const cloneItem = React.useCallback(() => cloneItemAt(selectedIndex), [cloneItemAt, selectedIndex]);

  const deleteItem = React.useCallback(() => {
    if (!currentItem || !selectedData || !selectedFile?.itemKey) return;
    const relationCount = itemRelations.length;
    const confirmed = window.confirm(
      relationCount > 0
        ? `العنصر مرتبط بـ ${relationCount} علاقة. يجب تعديل العلاقات في المسودة نفسها وإلا سيرفض التحقق الحفظ. متابعة الحذف من المسودة؟`
        : "حذف العنصر من المسودة؟ لن يتغير الملف الأصلي قبل الحفظ الآمن.",
    );
    if (!confirmed) return;
    const nextItems = selectedItems.filter((_, index) => index !== selectedIndex);
    replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  }, [currentItem, itemRelations.length, replaceData, selectedData, selectedFile, selectedIndex, selectedItems]);

  const resetFile = React.useCallback(() => {
    if (!selectedFile) return;
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedFile.path];
      return next;
    });
    setValidation(null);
  }, [selectedFile]);

  const uploadImage = React.useCallback(async () => {
    if (!authHeaders || !uploadFile) return;
    setBusy("image-upload");
    setError("");
    try {
      const form = new FormData();
      form.set("file", uploadFile);
      form.set("root", uploadRoot);
      form.set("replace", String(replaceImage));
      await asolApi.postForm(CATALOG_STUDIO_IMAGES_API, form, { headers: authHeaders });
      setUploadFile(null);
      setReplaceImage(false);
      setNotice("تم رفع الصورة ذريًا وتحديث سجل العمليات.");
      await loadSnapshot();
    } catch (uploadError) {
      setError(errorText(uploadError));
    } finally {
      setBusy("");
    }
  }, [authHeaders, loadSnapshot, replaceImage, uploadFile, uploadRoot]);

  const trashImage = React.useCallback(
    async (relativePath: string) => {
      if (!authHeaders || !window.confirm("نقل الصورة غير المستخدمة إلى سلة المطور القابلة للاستعادة؟")) return;
      setBusy(`trash:${relativePath}`);
      setError("");
      try {
        await asolApi.delete(
          `${CATALOG_STUDIO_IMAGES_API}?path=${encodeURIComponent(relativePath)}`,
          { headers: authHeaders },
        );
        setNotice("نُقلت الصورة إلى سلة المطور ولم تُحذف نهائيًا.");
        await loadSnapshot();
      } catch (trashError) {
        setError(errorText(trashError));
      } finally {
        setBusy("");
      }
    },
    [authHeaders, loadSnapshot],
  );

  if (sessionLoading || desktopWeb === null) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) {
    return <div className="mx-auto mt-16 max-w-xl"><StatusBox kind="error">هذه الصفحة متاحة فقط لجلسة Super Admin أثناء التطوير.</StatusBox></div>;
  }
  if (!desktopWeb) {
    return (
      <div className="mx-auto mt-16 max-w-xl">
        <StatusBox kind="notice">
          استوديو الكتالوج معطل على الهاتف وCapacitor. افتحه من متصفح تطوير على شاشة بعرض {CATALOG_STUDIO_MIN_WIDTH}px على الأقل.
        </StatusBox>
      </div>
    );
  }

  const imageRootLabels: Record<CatalogStudioImageRoot, string> = {
    mainCategories: "التصنيفات الرئيسية",
    subcategories: "التصنيفات الفرعية",
    pharmacy: "الصيدلية",
    vehicles: "المركبات",
  };
  const filteredImages = (snapshot?.images ?? []).filter((image) => {
    const rootMatch = imageRootFilter === "all" || image.root === imageRootFilter;
    const referenceMatch = !onlyUnreferenced || image.references.length === 0;
    const searchMatch = !imageSearch.trim() || image.path.toLocaleLowerCase("en").includes(imageSearch.trim().toLocaleLowerCase("en"));
    return rootMatch && referenceMatch && searchMatch;
  });

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-4 px-4 py-6 lg:px-6" dir="rtl">
      <header className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">استوديو الكتالوج</h1>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">DEVELOPMENT ONLY</span>
              {snapshot ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Catalog v{snapshot.stats.schemaVersion}</span> : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">تحرير ملفات Catalog والصور والعلاقات دون قراءة أو تعديل سجلات المستخدمين.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadSnapshot()} disabled={Boolean(busy)}>
              <RefreshCw className={cn("me-2 h-4 w-4", busy === "load" && "animate-spin")} /> تحديث
            </Button>
            <Button variant="outline" onClick={() => void validateChanges()} disabled={Boolean(busy) || changedFiles.length === 0}>
              <ClipboardCheck className="me-2 h-4 w-4" /> فحص شامل
            </Button>
            <Button onClick={() => setSaveDialogOpen(true)} disabled={Boolean(busy) || changedFiles.length === 0}>
              <Save className="me-2 h-4 w-4" /> حفظ آمن ({changedFiles.length})
            </Button>
          </div>
        </div>
      </header>

      {error ? <StatusBox kind="error">{error}</StatusBox> : null}
      {notice ? <StatusBox kind={validation?.valid === false ? "notice" : "success"}>{notice}</StatusBox> : null}

      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3">
        {(Object.keys(sectionLabels) as StudioSection[]).map((key) => (
          <SectionButton key={key} active={section === key} label={sectionLabels[key]} onClick={() => setSection(key)} />
        ))}
      </nav>

      {busy === "load" && !snapshot ? (
        <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border bg-card"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : null}

      {snapshot && section === "overview" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["ملفات البيانات", snapshot.stats.dataFiles],
                ["العناصر", snapshot.stats.items],
                ["العناصر المخفية", snapshot.stats.hiddenItems],
                ["الصور", snapshot.stats.images],
                ["صور غير مستخدمة", snapshot.stats.unreferencedImages],
                ["Specialty mappings", snapshot.stats.specialtyMappings],
                ["أعمدة user_specialties", snapshot.stats.specialtyColumns],
                ["ملفات Schema", snapshot.stats.schemaFiles],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-bold">ملفات JSON</h2>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      setSection(file.group === "manifest" ? "core" : (file.group as StudioSection));
                      openFile(file);
                    }}
                    className="flex items-center gap-3 rounded-xl border p-3 text-start hover:border-primary hover:bg-primary/5"
                  >
                    <FileJson className="h-5 w-5 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs" dir="ltr">{file.path}</span>
                      <span className="text-xs text-muted-foreground">{file.itemCount} عنصر {file.readOnly ? "• قراءة فقط" : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2">
                {snapshot.validation.valid ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <AlertTriangle className="h-6 w-6 text-red-600" />}
                <h2 className="font-bold">حالة المصدر الحالي</h2>
              </div>
              <p className="mt-3 text-sm">{snapshot.validation.valid ? "جميع العقود والعلاقات والصور سليمة." : "توجد أخطاء يجب إصلاحها قبل أي حفظ."}</p>
              <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{snapshot.validation.output}</pre>
            </div>
            <button
              type="button"
              onClick={() => openFile(snapshot.files.find((file) => file.path === "manifest.json")!)}
              className="w-full rounded-2xl border bg-card p-5 text-start hover:border-primary"
            >
              <Database className="mb-2 h-6 w-6 text-primary" />
              <span className="block font-bold">Manifest</span>
              <span className="text-sm text-muted-foreground">الإصدار {snapshot.stats.catalogVersion}</span>
            </button>
          </aside>
        </section>
      ) : null}

      {snapshot && groupSections[section] ? (
        <section className="grid min-h-[72vh] gap-4 lg:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside className="rounded-2xl border bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">الملفات</h2>
              <span className="text-xs text-muted-foreground">{groupFiles.length}</span>
            </div>
            <div className="space-y-1">
              {groupFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => openFile(file)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start",
                    selectedPath === file.path ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs" dir="ltr">{file.path.split("/").at(-1)}</span>
                  {drafts[file.path] ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-3">
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm" dir="ltr">{selectedFile?.path}</p>
                  <p className="text-xs text-muted-foreground">{selectedFile?.itemCount ?? 0} عنصر {selectedFile?.readOnly ? "• مولد للقراءة فقط" : ""}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["structured", "raw", "relations", "diff"] as EditorMode[]).map((editorMode) => (
                    <button
                      key={editorMode}
                      type="button"
                      disabled={selectedFile?.readOnly && editorMode === "structured"}
                      onClick={() => setMode(editorMode)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", mode === editorMode ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      {editorMode === "structured" ? "عرض منظم" : editorMode === "raw" ? "JSON خام" : editorMode === "relations" ? "العلاقات" : "Diff"}
                    </button>
                  ))}
                  {selectedFile && drafts[selectedFile.path] ? (
                    <Button size="sm" variant="ghost" onClick={resetFile}><RotateCcw className="me-1 h-4 w-4" />تراجع الملف</Button>
                  ) : null}
                </div>
              </div>
            </div>

            {mode === "structured" && selectedFile?.itemKey ? (
              <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b p-3">
                  <div className="relative min-w-56 flex-1">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو ID أو أي حقل" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3 text-sm" />
                  </div>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="me-1 h-4 w-4" />إضافة</Button>
                </div>
                <div className="max-h-[62vh] overflow-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted">
                      <tr>
                        <th className="w-10 p-2" />
                        <th className="p-2 text-start">الترتيب</th>
                        <th className="p-2 text-start">ID</th>
                        <th className="p-2 text-start">العربي</th>
                        <th className="p-2 text-start">English</th>
                        <th className="p-2 text-center">مخفي</th>
                        <th className="p-2 text-start">الصورة/العلاقة</th>
                        <th className="p-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(({ item, index }) => {
                        const display = displayFor(item);
                        return (
                          <tr
                            key={`${identityFor(item)}:${index}`}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (dragIndex !== null) reorder(dragIndex, index);
                              setDragIndex(null);
                            }}
                            onClick={() => setSelectedIndex(index)}
                            className={cn("cursor-pointer border-b hover:bg-muted/60", selectedIndex === index && "bg-primary/10")}
                          >
                            <td className="p-2"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                            <td className="p-2 font-mono">{String(display?.order ?? "—")}</td>
                            <td className="p-2 font-mono text-xs" dir="ltr">{identityFor(item)}</td>
                            <td className="max-w-52 truncate p-2">{nameFor(item, "ar") || String(item.value ?? "—")}</td>
                            <td className="max-w-52 truncate p-2" dir="ltr">{nameFor(item, "en") || String(item.kind ?? "—")}</td>
                            <td className="p-2 text-center">{display?.hidden === true ? <EyeOff className="mx-auto h-4 w-4 text-red-600" /> : <Eye className="mx-auto h-4 w-4 text-emerald-600" />}</td>
                            <td className="max-w-56 truncate p-2 text-xs" dir="ltr">{String(item.imagePath ?? item.image ?? item.optionFile ?? item.column ?? "—")}</td>
                            <td className="p-2">
                              <div className="flex justify-center gap-1">
                                <button type="button" title="لأعلى" onClick={(event) => { event.stopPropagation(); reorder(index, Math.max(0, index - 1)); }}><ArrowUp className="h-4 w-4" /></button>
                                <button type="button" title="لأسفل" onClick={(event) => { event.stopPropagation(); reorder(index, Math.min(selectedItems.length - 1, index + 1)); }}><ArrowDown className="h-4 w-4" /></button>
                                <button type="button" title="نسخ" onClick={(event) => { event.stopPropagation(); cloneItemAt(index); }}><Copy className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {mode === "structured" && !selectedFile?.itemKey ? (
              <textarea value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[65vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "raw" ? (
              <textarea value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[68vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "relations" ? (
              <div className="min-h-[50vh] rounded-2xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-bold"><Link2 className="h-5 w-5" /> علاقات العنصر المحدد</h3>
                <div className="mt-4 space-y-2">
                  {itemRelations.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد علاقات مسجلة لهذا العنصر.</p> : itemRelations.map((relation, index) => (
                    <div key={`${relation.from}:${relation.to}:${index}`} className="rounded-xl border p-3 text-sm">
                      <p className="font-semibold">{relation.label}</p>
                      <p className="mt-1 break-all font-mono text-xs" dir="ltr">{relation.from}</p>
                      <ChevronLeft className="my-1 h-4 w-4" />
                      <p className="break-all font-mono text-xs" dir="ltr">{relation.to}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "diff" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <div className="min-w-0"><p className="mb-2 text-sm font-bold">قبل</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100" dir="ltr">{selectedFile?.content}</pre></div>
                <div className="min-w-0"><p className="mb-2 text-sm font-bold">المسودة</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200" dir="ltr">{selectedContent}</pre></div>
              </div>
            ) : null}
          </div>

          <aside className="min-w-0 rounded-2xl border bg-card p-4">
            {currentItem && mode === "structured" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div><p className="text-xs text-muted-foreground">العنصر المحدد</p><p className="font-mono font-bold" dir="ltr">{identityFor(currentItem)}</p></div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={cloneItem} title="نسخ"><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={deleteItem} title="حذف من المسودة"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
                {currentItem.name && typeof currentItem.name === "object" ? (
                  <div className="grid gap-3">
                    <label className="text-sm"><span className="mb-1 block font-semibold">الاسم العربي</span><input value={nameFor(currentItem, "ar")} onChange={(event) => updateName("ar", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <label className="text-sm"><span className="mb-1 block font-semibold">English name</span><input dir="ltr" value={nameFor(currentItem, "en")} onChange={(event) => updateName("en", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                  </div>
                ) : null}
                {displayFor(currentItem) ? (
                  <div className="rounded-xl border p-3">
                    <label className="text-sm"><span className="mb-1 block font-semibold">ترتيب الظهور</span><input type="number" min={1} value={Number(displayFor(currentItem)?.order ?? 10)} onChange={(event) => updateDisplay("order", Math.max(1, Number(event.target.value)))} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <div className="mt-3 flex items-center justify-between"><span className="text-sm font-semibold">إخفاء عالمي</span><Switch checked={displayFor(currentItem)?.hidden === true} onCheckedChange={(checked) => updateDisplay("hidden", checked)} /></div>
                    {displayFor(currentItem)?.hidden === true ? <p className="mt-2 text-xs text-amber-700">سيُخفى العنصر وأبناؤه من جميع أجزاء المشروع.</p> : null}
                  </div>
                ) : null}
                <div className="grid gap-3">
                  {primitiveKeys.filter((key) => key in currentItem).map((key) => {
                    const value = currentItem[key];
                    if (typeof value === "boolean") {
                      return <div key={key} className="flex items-center justify-between rounded-lg border p-2"><span className="font-mono text-xs" dir="ltr">{key}</span><Switch checked={value} onCheckedChange={(checked) => updatePrimitive(key, checked)} /></div>;
                    }
                    if (typeof value === "object" && value !== null) return null;
                    return <label key={key} className="text-sm"><span className="mb-1 block font-mono text-xs" dir="ltr">{key}</span><input dir="ltr" value={value === null ? "" : String(value ?? "")} onChange={(event) => updatePrimitive(key, event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
                  })}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold">JSON العنصر</span><Button size="sm" variant="outline" onClick={applyItemJson}><Braces className="me-1 h-4 w-4" />تطبيق</Button></div>
                  <textarea value={itemJson} onChange={(event) => setItemJson(event.target.value)} className="h-64 w-full rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
                  {itemJsonError ? <p className="mt-1 text-xs text-red-600">{itemJsonError}</p> : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center text-muted-foreground"><Braces className="mb-3 h-10 w-10" /><p className="text-sm">اختر عنصرًا من العرض المنظم لفتح المحرر.</p></div>
            )}
          </aside>
        </section>
      ) : null}

      {snapshot && section === "assets" ? (
        <section className="space-y-4">
          <div className="grid gap-4 rounded-2xl border bg-card p-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={imageSearch} onChange={(event) => setImageSearch(event.target.value)} placeholder="بحث في مسار الصورة" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3" /></div>
            <select value={imageRootFilter} onChange={(event) => setImageRootFilter(event.target.value as typeof imageRootFilter)} className="rounded-lg border bg-background px-3 py-2"><option value="all">كل المجلدات</option>{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Switch checked={onlyUnreferenced} onCheckedChange={setOnlyUnreferenced} /> غير المستخدمة فقط</label>
            <span className="self-center text-sm text-muted-foreground">{filteredImages.length} صورة</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <aside className="space-y-3 rounded-2xl border bg-card p-4">
              <h2 className="flex items-center gap-2 font-bold"><Upload className="h-5 w-5" /> رفع أو استبدال صورة</h2>
              <select value={uploadRoot} onChange={(event) => setUploadRoot(event.target.value as CatalogStudioImageRoot)} className="w-full rounded-lg border bg-background px-3 py-2">{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-2 text-sm" />
              <label className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>استبدال إذا كان الاسم موجودًا</span><Switch checked={replaceImage} onCheckedChange={setReplaceImage} /></label>
              <p className="text-xs text-muted-foreground">حد أقصى 10 MB. يتم فحص توقيع PNG/JPG/WEBP. عند الاستبدال تُحفظ نسخة استعادة خارج public.</p>
              <Button className="w-full" onClick={() => void uploadImage()} disabled={!uploadFile || Boolean(busy)}>{busy === "image-upload" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />} رفع آمن</Button>
            </aside>
            <div className="grid max-h-[72vh] gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredImages.map((image) => (
                <article key={image.path} className="overflow-hidden rounded-2xl border bg-card">
                  <div className="aspect-[4/3] bg-surface-bright bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${image.publicUrl.replaceAll('"', "%22")}")` }} />
                  <div className="space-y-2 p-3">
                    <p className="truncate font-mono text-xs" title={image.path} dir="ltr">{image.path}</p>
                    <div className="flex flex-wrap gap-1 text-[11px]"><span className="rounded bg-muted px-2 py-1">{humanSize(image.size)}</span><span className={cn("rounded px-2 py-1", image.references.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{image.references.length} مرجع</span></div>
                    <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">SHA {image.hash.slice(0, 16)}…</p>
                    {image.references.length ? <details className="text-xs"><summary className="cursor-pointer">العلاقات</summary><div className="mt-1 space-y-1">{image.references.map((reference) => <p key={reference} className="break-all font-mono" dir="ltr">{reference}</p>)}</div></details> : null}
                    <Button variant="outline" size="sm" className="w-full" disabled={image.references.length > 0 || Boolean(busy)} onClick={() => void trashImage(image.path)}><Trash2 className="me-1 h-4 w-4" /> نقل للسلة</Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {snapshot && section === "audit" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_460px]">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2"><History className="h-5 w-5" /><h2 className="font-bold">سجل عمليات الملفات والصور</h2></div>
            <div className="mt-4 space-y-3">
              {snapshot.audit.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد عمليات محفوظة بعد.</p> : snapshot.audit.map((entry, index) => (
                <div key={`${entry.at}:${index}`} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{entry.action}</span><time className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString("ar-EG")}</time></div>
                  <p className="mt-2 text-sm">{entry.details}</p>
                  <p className="mt-2 break-all font-mono text-xs" dir="ltr">{entry.files.join(", ")}</p>
                  {entry.recoveryPath ? <p className="mt-1 break-all text-xs text-amber-700" dir="ltr">Recovery: {entry.recoveryPath}</p> : null}
                </div>
              ))}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2">{snapshot.validation.valid ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}<h2 className="font-bold">التحقق الحالي</h2></div>
              <pre className="mt-4 max-h-[48vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{validation?.output ?? snapshot.validation.output}</pre>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-bold">حماية الكتابة</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• كشف تغيير الملف خارجيًا باستخدام SHA-256.</li>
                <li>• تحقق كامل على نسخة staging.</li>
                <li>• نسخة احتياطية كاملة للملفات المتغيرة.</li>
                <li>• rollback تلقائي عند فشل الكتابة أو التحقق اللاحق.</li>
                <li>• استعادة transaction من journal بعد انقطاع العملية.</li>
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      {changedFiles.length > 0 ? (
        <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3 shadow-xl backdrop-blur dark:border-amber-900 dark:bg-amber-950/90">
          <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100"><AlertTriangle className="h-5 w-5" /><span>{changedFiles.length} ملفًا في المسودة ولم تُكتب على المصدر بعد.</span></div>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { if (window.confirm("مسح كل تعديلات المسودة؟")) setDrafts({}); }}><CircleOff className="me-1 h-4 w-4" />مسح المسودة</Button><Button size="sm" onClick={() => setSaveDialogOpen(true)}><Save className="me-1 h-4 w-4" />مراجعة وحفظ</Button></div>
        </div>
      ) : null}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>مراجعة الحفظ الآمن</DialogTitle><DialogDescription>سيتم التحقق من نسخة كاملة ثم حفظ الملفات كوحدة واحدة مع نسخة rollback.</DialogDescription></DialogHeader>
          <div className="max-h-72 overflow-auto rounded-xl border p-3">
            {changedFiles.map((filePath) => <div key={filePath} className="flex items-center gap-2 border-b py-2 last:border-0"><GitCompareArrows className="h-4 w-4 text-amber-600" /><span className="font-mono text-xs" dir="ltr">{filePath}</span></div>)}
          </div>
          {validation ? <StatusBox kind={validation.valid ? "success" : "error"}>{validation.valid ? "آخر فحص للمسودة ناجح." : "آخر فحص فشل. سيعيد الخادم الفحص ولن يكتب الملفات عند وجود خطأ."}</StatusBox> : <StatusBox kind="notice">سيجري الخادم الفحص الكامل قبل أي كتابة حتى لو لم تضغط «فحص شامل».</StatusBox>}
          <DialogFooter><Button variant="outline" onClick={() => setSaveDialogOpen(false)}>إلغاء</Button><Button onClick={() => void saveChanges()} disabled={busy === "save"}>{busy === "save" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}تحقق واحفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
