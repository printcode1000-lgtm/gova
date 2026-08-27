"use client";

import { formatDateTimeDefault } from "@asol/format-core";

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
  Search,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { isNativePlatform } from '@asol/native-core';
import { cn } from "@/shared/utils";

import {
  CATALOG_STUDIO_API,
  CATALOG_STUDIO_IMAGES_API,
  CATALOG_STUDIO_MIN_WIDTH,
} from "../application/config/config";
import type {
  CatalogStudioDraftFile,
  CatalogStudioFile,
  CatalogStudioImageRoot,
  CatalogStudioSaveResult,
  CatalogStudioSnapshot,
  CatalogStudioValidationResult,
} from "../domain/catalog-studio.types";
import {
  displayFor,
  errorText,
  formatted,
  humanSize,
  identityFor,
  itemsFor,
  nameFor,
  parentKey,
  parseObject,
  type JsonRecord,
} from "./catalog-studio-format";
import {
  groupSections,
  primitiveKeys,
  sectionLabels,
  type EditorMode,
  type StudioSection,
} from "./catalog-studio-sections";
import {
  clearCatalogStudioDraft,
  readCatalogStudioDraft,
  writeCatalogStudioDraft,
} from "./catalog-studio-drafts";
import { SectionButton } from "./SectionButton";
import { StatusBox } from "./StatusBox";
import { useCatalogStudioPageSave } from "./hooks/use-catalog-studio-page-save";

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
          clearCatalogStudioDraft();
          draftRestored.current = true;
        } else if (!draftRestored.current) {
          draftRestored.current = true;
          try {
            const parsed = readCatalogStudioDraft();
            if (parsed) {
              if (parsed.revision === next.revision) {
                const allowed = new Set(next.files.filter((file) => !file.readOnly).map((file) => file.path));
                setDrafts(
                  Object.fromEntries(Object.entries(parsed.files).filter(([filePath]) => allowed.has(filePath))),
                );
                setNotice("تمت استعادة المسودة المحلية المطابقة لنفس إصدار الملفات.");
              } else {
                clearCatalogStudioDraft();
                setNotice("لم تُستعد مسودة قديمة لأن الملفات تغيرت على القرص.");
              }
            }
          } catch {
            clearCatalogStudioDraft();
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
        clearCatalogStudioDraft();
      } else {
        writeCatalogStudioDraft({ revision: snapshot.revision, files: drafts });
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

  const studioOperations = useCatalogStudioPageSave({
    enabled: authorized && desktopWeb === true,
    changedFiles,
    drafts,
    filesByPath,
    uploadFile,
    uploadRoot,
    replaceImage,
    authHeaders: authHeaders ?? null,
    busy,
    draftPayload,
    onSaved: () => loadSnapshot({ clearDrafts: true }),
    setBusy,
    setError,
    setNotice,
    setValidation,
    clearUpload: () => {
      setUploadFile(null);
      setReplaceImage(false);
    },
  });

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
    const nextItems = selectedItems.filter((_, index) => index !== selectedIndex);
    replaceData({ ...selectedData, [selectedFile.itemKey]: nextItems });
    setSelectedIndex(Math.max(0, selectedIndex - 1));
    setNotice(
      relationCount > 0
        ? `أُزيل العنصر من المسودة وهو مرتبط بـ ${relationCount} علاقة؛ عدّل العلاقات وإلا سيرفض التحقق الكتابة.`
        : "أُزيل العنصر من المسودة ولم يتغير الملف الأصلي.",
    );
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

  const stageImageTrash = React.useCallback(
    (relativePath: string) => {
      if (!authHeaders) return;
      studioOperations.stage({
        itemId: `catalog-image-trash:${relativePath}`,
        kind: "delete",
        label: `نقل صورة إلى سلة المطور: ${relativePath}`,
        execute: async () => {
          setError("");
          try {
            await asolApi.delete(
              `${CATALOG_STUDIO_IMAGES_API}?path=${encodeURIComponent(relativePath)}`,
              { headers: authHeaders },
            );
            await loadSnapshot();
            return true;
          } catch (trashError) {
            setError(errorText(trashError));
            return false;
          }
        },
      });
    },
    [authHeaders, loadSnapshot, studioOperations],
  );

  if (sessionLoading || desktopWeb === null) {
    return <div id="catalog-studio.catalog-studio-page.div" className="flex min-h-[60vh] items-center justify-center"><Loader2 id="catalog-studio.catalog-studio-page.loader2" className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) {
    return <div id="catalog-studio.catalog-studio-page.div.2" className="mx-auto mt-16 max-w-xl"><StatusBox id="catalog-studio.catalog-studio-page.status-box" kind="error">هذه الصفحة متاحة فقط لجلسة Super Admin أثناء التطوير.</StatusBox></div>;
  }
  if (!desktopWeb) {
    return (
      <div id="catalog-studio.catalog-studio-page.div.3" className="mx-auto mt-16 max-w-xl">
        <StatusBox id="catalog-studio.catalog-studio-page.status-box.2" kind="notice">
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
    <main id="catalog-studio.catalog-studio-page.main" className="mx-auto w-full max-w-[1800px] space-y-4 px-4 py-6 lg:px-6" dir="rtl">
      <header id="catalog-studio.catalog-studio-page.header" className="rounded-2xl border bg-card p-5 shadow-sm">
        <div id="catalog-studio.catalog-studio-page.div.4" className="flex flex-wrap items-start justify-between gap-4">
          <div id="catalog-studio.catalog-studio-page.div.5">
            <div id="catalog-studio.catalog-studio-page.div.6" className="flex flex-wrap items-center gap-2">
              <h1 id="catalog-studio.catalog-studio-page.h1" className="text-2xl font-bold">استوديو الكتالوج</h1>
              <span id="catalog-studio.catalog-studio-page.span" className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">DEVELOPMENT ONLY</span>
              {snapshot ? <span id="catalog-studio.catalog-studio-page.span.2" className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">كتالوج إصدار {snapshot.stats.schemaVersion}</span> : null}
            </div>
            <p id="catalog-studio.catalog-studio-page.p" className="mt-2 text-sm text-muted-foreground">تحرير ملفات Catalog والصور والعلاقات دون قراءة أو تعديل سجلات المستخدمين.</p>
          </div>
          <div id="catalog-studio.catalog-studio-page.div.7" className="flex flex-wrap items-center gap-2">
            <Button id="catalog-studio.catalog-studio-page.button.2" ui={{ uid: "catalog-studio.refresh-UVazI4", id: "catalog-studio.refresh", kind: "action", action: "reload-snapshot", part: "toolbar" }} variant="outline" onClick={() => void loadSnapshot()} disabled={Boolean(busy)}>
              <RefreshCw id="catalog-studio.catalog-studio-page.refresh-cw" className={cn("me-2 h-4 w-4", busy === "load" && "animate-spin")} /> تحديث
            </Button>
            <Button id="catalog-studio.catalog-studio-page.button.3" ui={{ uid: "catalog-studio.validate-2K5oMt", id: "catalog-studio.validate", kind: "action", action: "validate-changes", part: "toolbar" }} variant="outline" onClick={() => void validateChanges()} disabled={Boolean(busy) || changedFiles.length === 0}>
              <ClipboardCheck id="catalog-studio.catalog-studio-page.clipboard-check" className="me-2 h-4 w-4" /> فحص شامل
            </Button>
          </div>
        </div>
      </header>

      {error ? <StatusBox id="catalog-studio.catalog-studio-page.status-box.3" kind="error">{error}</StatusBox> : null}
      {notice ? <StatusBox id="catalog-studio.catalog-studio-page.status-box.4" kind={validation?.valid === false ? "notice" : "success"}>{notice}</StatusBox> : null}

      <nav id="catalog-studio.catalog-studio-page.nav" className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3">
        {(Object.keys(sectionLabels) as StudioSection[]).map((key) => (
          <SectionButton key={key} active={section === key} label={sectionLabels[key]} onClick={() => setSection(key)} />
        ))}
      </nav>

      {busy === "load" && !snapshot ? (
        <div id="catalog-studio.catalog-studio-page.div.8" className="flex min-h-[55vh] items-center justify-center rounded-2xl border bg-card"><Loader2 id="catalog-studio.catalog-studio-page.loader2.2" className="h-10 w-10 animate-spin text-primary" /></div>
      ) : null}

      {snapshot && section === "overview" ? (
        <section id="catalog-studio.catalog-studio-page.section" className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div id="catalog-studio.catalog-studio-page.div.9" className="space-y-4">
            <div id="catalog-studio.catalog-studio-page.div.10" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["ملفات البيانات", snapshot.stats.dataFiles],
                ["العناصر", snapshot.stats.items],
                ["العناصر المخفية", snapshot.stats.hiddenItems],
                ["الصور", snapshot.stats.images],
                ["صور غير مستخدمة", snapshot.stats.unreferencedImages],
                ["ربط التخصصات", snapshot.stats.specialtyMappings],
                ["أعمدة user_specialties", snapshot.stats.specialtyColumns],
                ["ملفات Schema", snapshot.stats.schemaFiles],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div id="catalog-studio.catalog-studio-page.div.11" className="rounded-2xl border bg-card p-5">
              <h2 id="catalog-studio.catalog-studio-page.h2" className="font-bold">ملفات JSON</h2>
              <div id="catalog-studio.catalog-studio-page.div.12" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      setSection(file.group === "manifest" ? "core" : (file.group as StudioSection));
                      openFile(file);
                    }}
                    className="flex items-center gap-3 rounded-xl border p-3 text-start"
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
          <aside id="catalog-studio.catalog-studio-page.aside" className="space-y-4">
            <div id="catalog-studio.catalog-studio-page.div.13" className="rounded-2xl border bg-card p-5">
              <div id="catalog-studio.catalog-studio-page.div.14" className="flex items-center gap-2">
                {snapshot.validation.valid ? <CheckCircle2 id="catalog-studio.catalog-studio-page.check-circle2" className="h-6 w-6 text-emerald-600" /> : <AlertTriangle id="catalog-studio.catalog-studio-page.alert-triangle" className="h-6 w-6 text-red-600" />}
                <h2 id="catalog-studio.catalog-studio-page.h2.2" className="font-bold">حالة المصدر الحالي</h2>
              </div>
              <p id="catalog-studio.catalog-studio-page.p.2" className="mt-3 text-sm">{snapshot.validation.valid ? "جميع العقود والعلاقات والصور سليمة." : "توجد أخطاء يجب إصلاحها قبل أي حفظ."}</p>
              <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{snapshot.validation.output}</pre>
            </div>
            <button id="catalog-studio.catalog-studio-page.button"
              type="button"
              onClick={() => openFile(snapshot.files.find((file) => file.path === "manifest.json")!)}
              className="w-full rounded-2xl border bg-card p-5 text-start"
            >
              <Database id="catalog-studio.catalog-studio-page.database" className="mb-2 h-6 w-6 text-primary" />
              <span id="catalog-studio.catalog-studio-page.span.3" className="block font-bold">البيان الوصفي</span>
              <span id="catalog-studio.catalog-studio-page.span.4" className="text-sm text-muted-foreground">الإصدار {snapshot.stats.catalogVersion}</span>
            </button>
          </aside>
        </section>
      ) : null}

      {snapshot && groupSections[section] ? (
        <section id="catalog-studio.catalog-studio-page.section.2" className="grid min-h-[72vh] gap-4 lg:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside id="catalog-studio.catalog-studio-page.aside.2" className="rounded-2xl border bg-card p-3">
            <div id="catalog-studio.catalog-studio-page.div.15" className="mb-3 flex items-center justify-between">
              <h2 id="catalog-studio.catalog-studio-page.h2.3" className="font-bold">الملفات</h2>
              <span id="catalog-studio.catalog-studio-page.span.5" className="text-xs text-muted-foreground">{groupFiles.length}</span>
            </div>
            <div id="catalog-studio.catalog-studio-page.div.16" className="space-y-1">
              {groupFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => openFile(file)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start",
                    selectedPath === file.path ? "bg-primary text-primary-foreground" : "",
                  )}
                >
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs" dir="ltr">{file.path.split("/").at(-1)}</span>
                  {drafts[file.path] ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                </button>
              ))}
            </div>
          </aside>

          <div id="catalog-studio.catalog-studio-page.div.17" className="min-w-0 space-y-3">
            <div id="catalog-studio.catalog-studio-page.div.18" className="rounded-2xl border bg-card p-3">
              <div id="catalog-studio.catalog-studio-page.div.19" className="flex flex-wrap items-center justify-between gap-3">
                <div id="catalog-studio.catalog-studio-page.div.20">
                  <p id="catalog-studio.catalog-studio-page.p.3" className="font-mono text-sm" dir="ltr">{selectedFile?.path}</p>
                  <p id="catalog-studio.catalog-studio-page.p.4" className="text-xs text-muted-foreground">{selectedFile?.itemCount ?? 0} عنصر {selectedFile?.readOnly ? "• مولد للقراءة فقط" : ""}</p>
                </div>
                <div id="catalog-studio.catalog-studio-page.div.21" className="flex flex-wrap gap-1">
                  {(["structured", "raw", "relations", "diff"] as EditorMode[]).map((editorMode) => (
                    <button
                      key={editorMode}
                      type="button"
                      disabled={selectedFile?.readOnly && editorMode === "structured"}
                      onClick={() => setMode(editorMode)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", mode === editorMode ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      {editorMode === "structured" ? "عرض منظم" : editorMode === "raw" ? "JSON خام" : editorMode === "relations" ? "العلاقات" : "الفرق"}
                    </button>
                  ))}
                  {selectedFile && drafts[selectedFile.path] ? (
                    <Button id="catalog-studio.catalog-studio-page.button.4" ui={{ uid: "catalog-studio.file-reset-9PaoUl", id: "catalog-studio.file-reset", kind: "action", action: "reset-file", part: "file-toolbar" }} size="sm" variant="ghost" onClick={resetFile}><RotateCcw id="catalog-studio.catalog-studio-page.rotate-ccw" className="me-1 h-4 w-4" />تراجع الملف</Button>
                  ) : null}
                </div>
              </div>
            </div>

            {mode === "structured" && selectedFile?.itemKey ? (
              <div id="catalog-studio.catalog-studio-page.div.22" className="overflow-hidden rounded-2xl border bg-card">
                <div id="catalog-studio.catalog-studio-page.div.23" className="flex flex-wrap items-center gap-2 border-b p-3">
                  <div id="catalog-studio.catalog-studio-page.div.24" className="relative min-w-56 flex-1">
                    <Search id="catalog-studio.catalog-studio-page.search" className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input id="catalog-studio.catalog-studio-page.input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو ID أو أي حقل" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3 text-sm" />
                  </div>
                  <Button id="catalog-studio.catalog-studio-page.button.5" ui={{ uid: "catalog-studio.item-add-YYP3Sn", id: "catalog-studio.item-add", kind: "action", action: "add-item", part: "items-toolbar" }} size="sm" variant="outline" onClick={addItem}><Plus id="catalog-studio.catalog-studio-page.plus" className="me-1 h-4 w-4" />إضافة</Button>
                </div>
                <div id="catalog-studio.catalog-studio-page.div.25" className="max-h-[62vh] overflow-auto">
                  <table id="catalog-studio.catalog-studio-page.table" className="w-full min-w-[850px] text-sm">
                    <thead id="catalog-studio.catalog-studio-page.thead" className="sticky top-0 z-10 bg-muted">
                      <tr id="catalog-studio.catalog-studio-page.tr">
                        <th id="catalog-studio.catalog-studio-page.th" className="w-10 p-2" />
                        <th id="catalog-studio.catalog-studio-page.th.2" className="p-2 text-start">الترتيب</th>
                        <th id="catalog-studio.catalog-studio-page.th.3" className="p-2 text-start">ID</th>
                        <th id="catalog-studio.catalog-studio-page.th.4" className="p-2 text-start">العربي</th>
                        <th id="catalog-studio.catalog-studio-page.th.5" className="p-2 text-start">الإنجليزية</th>
                        <th id="catalog-studio.catalog-studio-page.th.6" className="p-2 text-center">مخفي</th>
                        <th id="catalog-studio.catalog-studio-page.th.7" className="p-2 text-start">الصورة/العلاقة</th>
                        <th id="catalog-studio.catalog-studio-page.th.8" className="p-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody id="catalog-studio.catalog-studio-page.tbody">
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
                            className={cn("border-b", selectedIndex === index && "bg-primary/10")}
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
                                <button type="button" aria-label="لأعلى" onClick={(event) => { event.stopPropagation(); reorder(index, Math.max(0, index - 1)); }}><ArrowUp className="h-4 w-4" /></button>
                                <button type="button" aria-label="لأسفل" onClick={(event) => { event.stopPropagation(); reorder(index, Math.min(selectedItems.length - 1, index + 1)); }}><ArrowDown className="h-4 w-4" /></button>
                                <button type="button" aria-label="نسخ" onClick={(event) => { event.stopPropagation(); cloneItemAt(index); }}><Copy className="h-4 w-4" /></button>
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
              <textarea id="catalog-studio.catalog-studio-page.textarea" value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[65vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "raw" ? (
              <textarea id="catalog-studio.catalog-studio-page.textarea.2" value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[68vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "relations" ? (
              <div id="catalog-studio.catalog-studio-page.div.26" className="min-h-[50vh] rounded-2xl border bg-card p-5">
                <h3 id="catalog-studio.catalog-studio-page.h3" className="flex items-center gap-2 font-bold"><Link2 id="catalog-studio.catalog-studio-page.link2" className="h-5 w-5" /> علاقات العنصر المحدد</h3>
                <div id="catalog-studio.catalog-studio-page.div.27" className="mt-4 space-y-2">
                  {itemRelations.length === 0 ? <p id="catalog-studio.catalog-studio-page.p.5" className="text-sm text-muted-foreground">لا توجد علاقات مسجلة لهذا العنصر.</p> : itemRelations.map((relation, index) => (
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
              <div id="catalog-studio.catalog-studio-page.div.28" className="grid gap-3 xl:grid-cols-2">
                <div id="catalog-studio.catalog-studio-page.div.29" className="min-w-0"><p id="catalog-studio.catalog-studio-page.p.6" className="mb-2 text-sm font-bold">قبل</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100" dir="ltr">{selectedFile?.content}</pre></div>
                <div id="catalog-studio.catalog-studio-page.div.30" className="min-w-0"><p id="catalog-studio.catalog-studio-page.p.7" className="mb-2 text-sm font-bold">المسودة</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200" dir="ltr">{selectedContent}</pre></div>
              </div>
            ) : null}
          </div>

          <aside id="catalog-studio.catalog-studio-page.aside.3" className="min-w-0 rounded-2xl border bg-card p-4">
            {currentItem && mode === "structured" ? (
              <div id="catalog-studio.catalog-studio-page.div.31" className="space-y-4">
                <div id="catalog-studio.catalog-studio-page.div.32" className="flex items-center justify-between gap-2">
                  <div id="catalog-studio.catalog-studio-page.div.33"><p id="catalog-studio.catalog-studio-page.p.8" className="text-xs text-muted-foreground">العنصر المحدد</p><p id="catalog-studio.catalog-studio-page.p.9" className="font-mono font-bold" dir="ltr">{identityFor(currentItem)}</p></div>
                  <div id="catalog-studio.catalog-studio-page.div.34" className="flex gap-1">
                    <Button id="catalog-studio.catalog-studio-page.button.6" ui={{ uid: "catalog-studio.item-clone-PRMqW9", id: "catalog-studio.item-clone", kind: "action", action: "clone-item", part: "item-toolbar" }} size="icon" variant="ghost" onClick={cloneItem} aria-label="نسخ"><Copy id="catalog-studio.catalog-studio-page.copy" className="h-4 w-4" /></Button>
                    <Button id="catalog-studio.catalog-studio-page.button.7" ui={{ uid: "catalog-studio.item-delete-CkDQ8f", id: "catalog-studio.item-delete", kind: "action", action: "delete-item", part: "item-toolbar" }} size="icon" variant="ghost" onClick={deleteItem} aria-label="إزالة من المسودة"><Trash2 id="catalog-studio.catalog-studio-page.trash2" className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
                {currentItem.name && typeof currentItem.name === "object" ? (
                  <div id="catalog-studio.catalog-studio-page.div.35" className="grid gap-3">
                    <label id="catalog-studio.catalog-studio-page.label" className="text-sm"><span id="catalog-studio.catalog-studio-page.span.6" className="mb-1 block font-semibold">الاسم العربي</span><input id="catalog-studio.catalog-studio-page.input.2" value={nameFor(currentItem, "ar")} onChange={(event) => updateName("ar", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <label id="catalog-studio.catalog-studio-page.label.2" className="text-sm"><span id="catalog-studio.catalog-studio-page.span.7" className="mb-1 block font-semibold">الاسم بالإنجليزية</span><input id="catalog-studio.catalog-studio-page.input.3" dir="ltr" value={nameFor(currentItem, "en")} onChange={(event) => updateName("en", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                  </div>
                ) : null}
                {displayFor(currentItem) ? (
                  <div id="catalog-studio.catalog-studio-page.div.36" className="rounded-xl border p-3">
                    <label id="catalog-studio.catalog-studio-page.label.3" className="text-sm"><span id="catalog-studio.catalog-studio-page.span.8" className="mb-1 block font-semibold">ترتيب الظهور</span><input id="catalog-studio.catalog-studio-page.input.4" type="number" min={1} value={Number(displayFor(currentItem)?.order ?? 10)} onChange={(event) => updateDisplay("order", Math.max(1, Number(event.target.value)))} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <div id="catalog-studio.catalog-studio-page.div.37" className="mt-3 flex items-center justify-between"><span id="catalog-studio.catalog-studio-page.span.9" className="text-sm font-semibold">إخفاء عالمي</span><Switch id="catalog-studio.catalog-studio-page.switch" ui={{ uid: "catalog-studio.item-hidden-Lu1nsK", id: "catalog-studio.item-hidden", kind: "field", action: "toggle-hidden", part: "display" }} checked={displayFor(currentItem)?.hidden === true} onCheckedChange={(checked) => updateDisplay("hidden", checked)} /></div>
                    {displayFor(currentItem)?.hidden === true ? <p id="catalog-studio.catalog-studio-page.p.10" className="mt-2 text-xs text-amber-700">سيُخفى العنصر وأبناؤه من جميع أجزاء المشروع.</p> : null}
                  </div>
                ) : null}
                <div id="catalog-studio.catalog-studio-page.div.38" className="grid gap-3">
                  {primitiveKeys.filter((key) => key in currentItem).map((key) => {
                    const value = currentItem[key];
                    if (typeof value === "boolean") {
                      return <div key={key} className="flex items-center justify-between rounded-lg border p-2"><span className="font-mono text-xs" dir="ltr">{key}</span><Switch checked={value} onCheckedChange={(checked) => updatePrimitive(key, checked)} /></div>;
                    }
                    if (typeof value === "object" && value !== null) return null;
                    return <label key={key} className="text-sm"><span className="mb-1 block font-mono text-xs" dir="ltr">{key}</span><input dir="ltr" value={value === null ? "" : String(value ?? "")} onChange={(event) => updatePrimitive(key, event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
                  })}
                </div>
                <div id="catalog-studio.catalog-studio-page.div.39">
                  <div id="catalog-studio.catalog-studio-page.div.40" className="mb-2 flex items-center justify-between"><span id="catalog-studio.catalog-studio-page.span.10" className="text-sm font-bold">JSON العنصر</span><Button id="catalog-studio.catalog-studio-page.button.8" ui={{ uid: "catalog-studio.item-json-apply-Ib5jF8", id: "catalog-studio.item-json-apply", kind: "action", action: "apply-item-json", part: "json" }} size="sm" variant="outline" onClick={applyItemJson}><Braces id="catalog-studio.catalog-studio-page.braces" className="me-1 h-4 w-4" />تطبيق</Button></div>
                  <textarea id="catalog-studio.catalog-studio-page.textarea.3" value={itemJson} onChange={(event) => setItemJson(event.target.value)} className="h-64 w-full rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
                  {itemJsonError ? <p id="catalog-studio.catalog-studio-page.p.11" className="mt-1 text-xs text-red-600">{itemJsonError}</p> : null}
                </div>
              </div>
            ) : (
              <div id="catalog-studio.catalog-studio-page.div.41" className="flex min-h-48 flex-col items-center justify-center text-center text-muted-foreground"><Braces id="catalog-studio.catalog-studio-page.braces.2" className="mb-3 h-10 w-10" /><p id="catalog-studio.catalog-studio-page.p.12" className="text-sm">اختر عنصرًا من العرض المنظم لفتح المحرر.</p></div>
            )}
          </aside>
        </section>
      ) : null}

      {snapshot && section === "assets" ? (
        <section id="catalog-studio.catalog-studio-page.section.3" className="space-y-4">
          <div id="catalog-studio.catalog-studio-page.div.42" className="grid gap-4 rounded-2xl border bg-card p-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div id="catalog-studio.catalog-studio-page.div.43" className="relative"><Search id="catalog-studio.catalog-studio-page.search.2" className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><input id="catalog-studio.catalog-studio-page.input.5" value={imageSearch} onChange={(event) => setImageSearch(event.target.value)} placeholder="بحث في مسار الصورة" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3" /></div>
            <select id="catalog-studio.catalog-studio-page.select" value={imageRootFilter} onChange={(event) => setImageRootFilter(event.target.value as typeof imageRootFilter)} className="rounded-lg border bg-background px-3 py-2"><option value="all">كل المجلدات</option>{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label id="catalog-studio.catalog-studio-page.label.4" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Switch id="catalog-studio.catalog-studio-page.switch.2" ui={{ uid: "catalog-studio.images-only-unreferenced-A1Y1y1", id: "catalog-studio.images-only-unreferenced", kind: "field", action: "toggle-unreferenced-filter", part: "filter" }} checked={onlyUnreferenced} onCheckedChange={setOnlyUnreferenced} /> غير المستخدمة فقط</label>
            <span id="catalog-studio.catalog-studio-page.span.11" className="self-center text-sm text-muted-foreground">{filteredImages.length} صورة</span>
          </div>
          <div id="catalog-studio.catalog-studio-page.div.44" className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <aside id="catalog-studio.catalog-studio-page.aside.4" className="space-y-3 rounded-2xl border bg-card p-4">
              <h2 id="catalog-studio.catalog-studio-page.h2.4" className="flex items-center gap-2 font-bold"><Upload id="catalog-studio.catalog-studio-page.upload" className="h-5 w-5" /> رفع أو استبدال صورة</h2>
              <select id="catalog-studio.catalog-studio-page.select.2" value={uploadRoot} onChange={(event) => setUploadRoot(event.target.value as CatalogStudioImageRoot)} className="w-full rounded-lg border bg-background px-3 py-2">{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <input id="catalog-studio.catalog-studio-page.input.6" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-2 text-sm" />
              <label id="catalog-studio.catalog-studio-page.label.5" className="flex items-center justify-between rounded-lg border p-3 text-sm"><span id="catalog-studio.catalog-studio-page.span.12">استبدال إذا كان الاسم موجودًا</span><Switch id="catalog-studio.catalog-studio-page.switch.3" ui={{ uid: "catalog-studio.image-replace-IBoE28", id: "catalog-studio.image-replace", kind: "field", action: "toggle-replace-image", part: "upload" }} checked={replaceImage} onCheckedChange={setReplaceImage} /></label>
              <p id="catalog-studio.catalog-studio-page.p.13" className="text-xs text-muted-foreground">حد أقصى 10 MB. يتم فحص توقيع PNG/JPG/WEBP. عند الاستبدال تُنشأ نسخة استعادة خارج public.</p>
            </aside>
            <div id="catalog-studio.catalog-studio-page.div.45" className="grid max-h-[72vh] gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredImages.map((image) => (
                <article key={image.path} className="overflow-hidden rounded-2xl border bg-card">
                  <div className="aspect-[4/3] bg-surface-bright bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${image.publicUrl.replaceAll('"', "%22")}")` }} />
                  <div className="space-y-2 p-3">
                    <p className="truncate font-mono text-xs" aria-label={image.path} dir="ltr">{image.path}</p>
                    <div className="flex flex-wrap gap-1 text-[11px]"><span className="rounded bg-muted px-2 py-1">{humanSize(image.size)}</span><span className={cn("rounded px-2 py-1", image.references.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{image.references.length} مرجع</span></div>
                    <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">SHA {image.hash.slice(0, 16)}…</p>
                    {image.references.length ? <details className="text-xs"><summary className="">العلاقات</summary><div className="mt-1 space-y-1">{image.references.map((reference) => <p key={reference} className="break-all font-mono" dir="ltr">{reference}</p>)}</div></details> : null}
                    <Button variant="outline" size="sm" className="w-full" disabled={image.references.length > 0 || Boolean(busy)} onClick={() => stageImageTrash(image.path)}><Trash2 className="me-1 h-4 w-4" /> نقل للسلة</Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {snapshot && section === "audit" ? (
        <section id="catalog-studio.catalog-studio-page.section.4" className="grid gap-4 xl:grid-cols-[1fr_460px]">
          <div id="catalog-studio.catalog-studio-page.div.46" className="rounded-2xl border bg-card p-5">
            <div id="catalog-studio.catalog-studio-page.div.47" className="flex items-center gap-2"><History id="catalog-studio.catalog-studio-page.history" className="h-5 w-5" /><h2 id="catalog-studio.catalog-studio-page.h2.5" className="font-bold">سجل عمليات الملفات والصور</h2></div>
            <div id="catalog-studio.catalog-studio-page.div.48" className="mt-4 space-y-3">
              {snapshot.audit.length === 0 ? <p id="catalog-studio.catalog-studio-page.p.14" className="text-sm text-muted-foreground">لا توجد عمليات محفوظة بعد.</p> : snapshot.audit.map((entry, index) => (
                <div key={`${entry.at}:${index}`} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{entry.action}</span><time className="text-xs text-muted-foreground">{formatDateTimeDefault(entry.at)}</time></div>
                  <p className="mt-2 text-sm">{entry.details}</p>
                  <p className="mt-2 break-all font-mono text-xs" dir="ltr">{entry.files.join(",")}</p>
                  {entry.recoveryPath ? <p className="mt-1 break-all text-xs text-amber-700" dir="ltr">مسار الاسترجاع: {entry.recoveryPath}</p> : null}
                </div>
              ))}
            </div>
          </div>
          <aside id="catalog-studio.catalog-studio-page.aside.5" className="space-y-4">
            <div id="catalog-studio.catalog-studio-page.div.49" className="rounded-2xl border bg-card p-5">
              <div id="catalog-studio.catalog-studio-page.div.50" className="flex items-center gap-2">{snapshot.validation.valid ? <CheckCircle2 id="catalog-studio.catalog-studio-page.check-circle2.2" className="h-5 w-5 text-emerald-600" /> : <ShieldAlert id="catalog-studio.catalog-studio-page.shield-alert" className="h-5 w-5 text-red-600" />}<h2 id="catalog-studio.catalog-studio-page.h2.6" className="font-bold">التحقق الحالي</h2></div>
              <pre className="mt-4 max-h-[48vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{validation?.output ?? snapshot.validation.output}</pre>
            </div>
            <div id="catalog-studio.catalog-studio-page.div.51" className="rounded-2xl border bg-card p-5">
              <h3 id="catalog-studio.catalog-studio-page.h3.2" className="font-bold">حماية الكتابة</h3>
              <ul id="catalog-studio.catalog-studio-page.ul" className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li id="catalog-studio.catalog-studio-page.li">• كشف تغيير الملف خارجيًا باستخدام SHA-256.</li>
                <li id="catalog-studio.catalog-studio-page.li.2">• تحقق كامل على نسخة staging.</li>
                <li id="catalog-studio.catalog-studio-page.li.3">• نسخة احتياطية كاملة للملفات المتغيرة.</li>
                <li id="catalog-studio.catalog-studio-page.li.4">• rollback تلقائي عند فشل الكتابة أو التحقق اللاحق.</li>
                <li id="catalog-studio.catalog-studio-page.li.5">• استعادة transaction من journal بعد انقطاع العملية.</li>
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      {changedFiles.length > 0 ? (
        <div id="catalog-studio.catalog-studio-page.div.52" className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3 shadow-xl backdrop-blur dark:border-amber-900 dark:bg-amber-950/90">
          <div id="catalog-studio.catalog-studio-page.div.53" className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100"><AlertTriangle id="catalog-studio.catalog-studio-page.alert-triangle.2" className="h-5 w-5" /><span id="catalog-studio.catalog-studio-page.span.13">{changedFiles.length} ملفًا في المسودة ولم تُكتب على المصدر بعد.</span></div>
          <div id="catalog-studio.catalog-studio-page.div.54" className="flex gap-2"><Button id="catalog-studio.catalog-studio-page.button.9" ui={{ uid: "catalog-studio.drafts-clear-Q8l5Jq", id: "catalog-studio.drafts-clear", kind: "action", action: "clear-drafts", part: "drafts" }} variant="outline" size="sm" onClick={() => setDrafts({})}><CircleOff id="catalog-studio.catalog-studio-page.circle-off" className="me-1 h-4 w-4" />مسح المسودة</Button></div>
        </div>
      ) : null}
    </main>
  );
}
