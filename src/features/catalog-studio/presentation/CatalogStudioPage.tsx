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
import { uiAttributes } from "@asol/ui-registry-core";

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
    return <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.55-nZ0xEM", id: "catalog-studio.catalog-studio-page.div.55" })} id="catalog-studio.catalog-studio-page.div" className="flex min-h-[60vh] items-center justify-center"><Loader2 id="catalog-studio.catalog-studio-page.loader2" className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) {
    return <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.56-xG7IVk", id: "catalog-studio.catalog-studio-page.div.56" })} id="catalog-studio.catalog-studio-page.div.2" className="mx-auto mt-16 max-w-xl"><StatusBox id="catalog-studio.catalog-studio-page.status-box" kind="error">هذه الصفحة متاحة فقط لجلسة Super Admin أثناء التطوير.</StatusBox></div>;
  }
  if (!desktopWeb) {
    return (
      <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.57-TZMKc9", id: "catalog-studio.catalog-studio-page.div.57" })} id="catalog-studio.catalog-studio-page.div.3" className="mx-auto mt-16 max-w-xl">
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
    <main {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.main.2-hQsSq2", id: "catalog-studio.catalog-studio-page.main.2" })} id="catalog-studio.catalog-studio-page.main" className="mx-auto w-full max-w-[1800px] space-y-4 px-4 py-6 lg:px-6" dir="rtl">
      <header {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.header.2-zhtF25", id: "catalog-studio.catalog-studio-page.header.2" })} id="catalog-studio.catalog-studio-page.header" className="rounded-2xl border bg-card p-5 shadow-sm">
        <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.58-F9unY6", id: "catalog-studio.catalog-studio-page.div.58" })} id="catalog-studio.catalog-studio-page.div.4" className="flex flex-wrap items-start justify-between gap-4">
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.59-rH4qKa", id: "catalog-studio.catalog-studio-page.div.59" })} id="catalog-studio.catalog-studio-page.div.5">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.60-IiT1Mk", id: "catalog-studio.catalog-studio-page.div.60" })} id="catalog-studio.catalog-studio-page.div.6" className="flex flex-wrap items-center gap-2">
              <h1 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h1.2-VhT2OF", id: "catalog-studio.catalog-studio-page.h1.2" })} id="catalog-studio.catalog-studio-page.h1" className="text-2xl font-bold">استوديو الكتالوج</h1>
              <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.14-O1btP9", id: "catalog-studio.catalog-studio-page.span.14" })} id="catalog-studio.catalog-studio-page.span" className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">DEVELOPMENT ONLY</span>
              {snapshot ? <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.15-sO45hu", id: "catalog-studio.catalog-studio-page.span.15" })} id="catalog-studio.catalog-studio-page.span.2" className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">كتالوج إصدار {snapshot.stats.schemaVersion}</span> : null}
            </div>
            <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.15-SxW9IL", id: "catalog-studio.catalog-studio-page.p.15" })} id="catalog-studio.catalog-studio-page.p" className="mt-2 text-sm text-muted-foreground">تحرير ملفات Catalog والصور والعلاقات دون قراءة أو تعديل سجلات المستخدمين.</p>
          </div>
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.61-35dZz1", id: "catalog-studio.catalog-studio-page.div.61" })} id="catalog-studio.catalog-studio-page.div.7" className="flex flex-wrap items-center gap-2">
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

      <nav {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.nav.2-G1lIsv", id: "catalog-studio.catalog-studio-page.nav.2" })} id="catalog-studio.catalog-studio-page.nav" className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3">
        {(Object.keys(sectionLabels) as StudioSection[]).map((key) => (
          <SectionButton key={key} active={section === key} label={sectionLabels[key]} onClick={() => setSection(key)} />
        ))}
      </nav>

      {busy === "load" && !snapshot ? (
        <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.62-0iU0IT", id: "catalog-studio.catalog-studio-page.div.62" })} id="catalog-studio.catalog-studio-page.div.8" className="flex min-h-[55vh] items-center justify-center rounded-2xl border bg-card"><Loader2 id="catalog-studio.catalog-studio-page.loader2.2" className="h-10 w-10 animate-spin text-primary" /></div>
      ) : null}

      {snapshot && section === "overview" ? (
        <section {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.section.5-T9Q0p7", id: "catalog-studio.catalog-studio-page.section.5" })} id="catalog-studio.catalog-studio-page.section" className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.63-pv8kJe", id: "catalog-studio.catalog-studio-page.div.63" })} id="catalog-studio.catalog-studio-page.div.9" className="space-y-4">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.64-GXM9av", id: "catalog-studio.catalog-studio-page.div.64" })} id="catalog-studio.catalog-studio-page.div.10" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <div key={String(label)} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.65-9EZ1rZ", id: "catalog-studio.catalog-studio-page.div.65" })} className="rounded-2xl border bg-card p-4">
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.16-NCs8oU", id: "catalog-studio.catalog-studio-page.p.16" })} className="text-sm text-muted-foreground">{label}</p>
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.17-QZ53LL", id: "catalog-studio.catalog-studio-page.p.17" })} className="mt-2 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.66-0AseBQ", id: "catalog-studio.catalog-studio-page.div.66" })} id="catalog-studio.catalog-studio-page.div.11" className="rounded-2xl border bg-card p-5">
              <h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.7-3N9Y9X", id: "catalog-studio.catalog-studio-page.h2.7" })} id="catalog-studio.catalog-studio-page.h2" className="font-bold">ملفات JSON</h2>
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.67-RILT0i", id: "catalog-studio.catalog-studio-page.div.67" })} id="catalog-studio.catalog-studio-page.div.12" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.files.map((file) => (
                  <button
                    key={file.path} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.10-dTGpa1", id: "catalog-studio.catalog-studio-page.button.10" })}
                    type="button"
                    onClick={() => {
                      setSection(file.group === "manifest" ? "core" : (file.group as StudioSection));
                      openFile(file);
                    }}
                    className="flex items-center gap-3 rounded-xl border p-3 text-start"
                  >
                    <FileJson className="h-5 w-5 text-primary" />
                    <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.16-GK5mrO", id: "catalog-studio.catalog-studio-page.span.16" })} className="min-w-0 flex-1">
                      <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.17-CMSQ9X", id: "catalog-studio.catalog-studio-page.span.17" })} className="block truncate font-mono text-xs" dir="ltr">{file.path}</span>
                      <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.18-m7qTBM", id: "catalog-studio.catalog-studio-page.span.18" })} className="text-xs text-muted-foreground">{file.itemCount} عنصر {file.readOnly ? "• قراءة فقط" : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <aside {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.aside.6-e0XHP3", id: "catalog-studio.catalog-studio-page.aside.6" })} id="catalog-studio.catalog-studio-page.aside" className="space-y-4">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.68-bcIZ04", id: "catalog-studio.catalog-studio-page.div.68" })} id="catalog-studio.catalog-studio-page.div.13" className="rounded-2xl border bg-card p-5">
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.69-0tOOG0", id: "catalog-studio.catalog-studio-page.div.69" })} id="catalog-studio.catalog-studio-page.div.14" className="flex items-center gap-2">
                {snapshot.validation.valid ? <CheckCircle2 id="catalog-studio.catalog-studio-page.check-circle2" className="h-6 w-6 text-emerald-600" /> : <AlertTriangle id="catalog-studio.catalog-studio-page.alert-triangle" className="h-6 w-6 text-red-600" />}
                <h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.8-7yEa8G", id: "catalog-studio.catalog-studio-page.h2.8" })} id="catalog-studio.catalog-studio-page.h2.2" className="font-bold">حالة المصدر الحالي</h2>
              </div>
              <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.18-B4i9Ae", id: "catalog-studio.catalog-studio-page.p.18" })} id="catalog-studio.catalog-studio-page.p.2" className="mt-3 text-sm">{snapshot.validation.valid ? "جميع العقود والعلاقات والصور سليمة." : "توجد أخطاء يجب إصلاحها قبل أي حفظ."}</p>
              <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{snapshot.validation.output}</pre>
            </div>
            <button {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.11-8URZ88", id: "catalog-studio.catalog-studio-page.button.11" })} id="catalog-studio.catalog-studio-page.button"
              type="button"
              onClick={() => openFile(snapshot.files.find((file) => file.path === "manifest.json")!)}
              className="w-full rounded-2xl border bg-card p-5 text-start"
            >
              <Database id="catalog-studio.catalog-studio-page.database" className="mb-2 h-6 w-6 text-primary" />
              <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.19-C2H8Zi", id: "catalog-studio.catalog-studio-page.span.19" })} id="catalog-studio.catalog-studio-page.span.3" className="block font-bold">البيان الوصفي</span>
              <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.20-7eYQJi", id: "catalog-studio.catalog-studio-page.span.20" })} id="catalog-studio.catalog-studio-page.span.4" className="text-sm text-muted-foreground">الإصدار {snapshot.stats.catalogVersion}</span>
            </button>
          </aside>
        </section>
      ) : null}

      {snapshot && groupSections[section] ? (
        <section {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.section.6-WDxUe3", id: "catalog-studio.catalog-studio-page.section.6" })} id="catalog-studio.catalog-studio-page.section.2" className="grid min-h-[72vh] gap-4 lg:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.aside.7-o41YBh", id: "catalog-studio.catalog-studio-page.aside.7" })} id="catalog-studio.catalog-studio-page.aside.2" className="rounded-2xl border bg-card p-3">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.70-sHN7Qq", id: "catalog-studio.catalog-studio-page.div.70" })} id="catalog-studio.catalog-studio-page.div.15" className="mb-3 flex items-center justify-between">
              <h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.9-p6yEYY", id: "catalog-studio.catalog-studio-page.h2.9" })} id="catalog-studio.catalog-studio-page.h2.3" className="font-bold">الملفات</h2>
              <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.21-QL8tQ4", id: "catalog-studio.catalog-studio-page.span.21" })} id="catalog-studio.catalog-studio-page.span.5" className="text-xs text-muted-foreground">{groupFiles.length}</span>
            </div>
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.71-KL7f03", id: "catalog-studio.catalog-studio-page.div.71" })} id="catalog-studio.catalog-studio-page.div.16" className="space-y-1">
              {groupFiles.map((file) => (
                <button
                  key={file.path} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.12-Ozx719", id: "catalog-studio.catalog-studio-page.button.12" })}
                  type="button"
                  onClick={() => openFile(file)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start",
                    selectedPath === file.path ? "bg-primary text-primary-foreground" : "",
                  )}
                >
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.22-WVvF82", id: "catalog-studio.catalog-studio-page.span.22" })} className="min-w-0 flex-1 truncate text-xs" dir="ltr">{file.path.split("/").at(-1)}</span>
                  {drafts[file.path] ? <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.23-oVQ9Ea", id: "catalog-studio.catalog-studio-page.span.23" })} className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                </button>
              ))}
            </div>
          </aside>

          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.72-DnZEm5", id: "catalog-studio.catalog-studio-page.div.72" })} id="catalog-studio.catalog-studio-page.div.17" className="min-w-0 space-y-3">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.73-RcF9PG", id: "catalog-studio.catalog-studio-page.div.73" })} id="catalog-studio.catalog-studio-page.div.18" className="rounded-2xl border bg-card p-3">
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.74-bffU9X", id: "catalog-studio.catalog-studio-page.div.74" })} id="catalog-studio.catalog-studio-page.div.19" className="flex flex-wrap items-center justify-between gap-3">
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.75-y66uDv", id: "catalog-studio.catalog-studio-page.div.75" })} id="catalog-studio.catalog-studio-page.div.20">
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.19-L2hn6V", id: "catalog-studio.catalog-studio-page.p.19" })} id="catalog-studio.catalog-studio-page.p.3" className="font-mono text-sm" dir="ltr">{selectedFile?.path}</p>
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.20-uG83SR", id: "catalog-studio.catalog-studio-page.p.20" })} id="catalog-studio.catalog-studio-page.p.4" className="text-xs text-muted-foreground">{selectedFile?.itemCount ?? 0} عنصر {selectedFile?.readOnly ? "• مولد للقراءة فقط" : ""}</p>
                </div>
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.76-8Meuld", id: "catalog-studio.catalog-studio-page.div.76" })} id="catalog-studio.catalog-studio-page.div.21" className="flex flex-wrap gap-1">
                  {(["structured", "raw", "relations", "diff"] as EditorMode[]).map((editorMode) => (
                    <button
                      key={editorMode} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.13-5N6XHI", id: "catalog-studio.catalog-studio-page.button.13" })}
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
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.77-01SLGW", id: "catalog-studio.catalog-studio-page.div.77" })} id="catalog-studio.catalog-studio-page.div.22" className="overflow-hidden rounded-2xl border bg-card">
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.78-N5Oz1j", id: "catalog-studio.catalog-studio-page.div.78" })} id="catalog-studio.catalog-studio-page.div.23" className="flex flex-wrap items-center gap-2 border-b p-3">
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.79-YTYMV3", id: "catalog-studio.catalog-studio-page.div.79" })} id="catalog-studio.catalog-studio-page.div.24" className="relative min-w-56 flex-1">
                    <Search id="catalog-studio.catalog-studio-page.search" className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.7-0uV3mC", id: "catalog-studio.catalog-studio-page.input.7" })} id="catalog-studio.catalog-studio-page.input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو ID أو أي حقل" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3 text-sm" />
                  </div>
                  <Button id="catalog-studio.catalog-studio-page.button.5" ui={{ uid: "catalog-studio.item-add-YYP3Sn", id: "catalog-studio.item-add", kind: "action", action: "add-item", part: "items-toolbar" }} size="sm" variant="outline" onClick={addItem}><Plus id="catalog-studio.catalog-studio-page.plus" className="me-1 h-4 w-4" />إضافة</Button>
                </div>
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.80-RL14EE", id: "catalog-studio.catalog-studio-page.div.80" })} id="catalog-studio.catalog-studio-page.div.25" className="max-h-[62vh] overflow-auto">
                  <table {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.table.2-yd7C1Q", id: "catalog-studio.catalog-studio-page.table.2" })} id="catalog-studio.catalog-studio-page.table" className="w-full min-w-[850px] text-sm">
                    <thead {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.thead.2-C9bEJJ", id: "catalog-studio.catalog-studio-page.thead.2" })} id="catalog-studio.catalog-studio-page.thead" className="sticky top-0 z-10 bg-muted">
                      <tr {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.tr.2-JXyo1R", id: "catalog-studio.catalog-studio-page.tr.2" })} id="catalog-studio.catalog-studio-page.tr">
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.9-9V96t8", id: "catalog-studio.catalog-studio-page.th.9" })} id="catalog-studio.catalog-studio-page.th" className="w-10 p-2" />
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.10-rM43OL", id: "catalog-studio.catalog-studio-page.th.10" })} id="catalog-studio.catalog-studio-page.th.2" className="p-2 text-start">الترتيب</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.11-aOv7Iu", id: "catalog-studio.catalog-studio-page.th.11" })} id="catalog-studio.catalog-studio-page.th.3" className="p-2 text-start">ID</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.12-S8jNZZ", id: "catalog-studio.catalog-studio-page.th.12" })} id="catalog-studio.catalog-studio-page.th.4" className="p-2 text-start">العربي</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.13-oLX81O", id: "catalog-studio.catalog-studio-page.th.13" })} id="catalog-studio.catalog-studio-page.th.5" className="p-2 text-start">الإنجليزية</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.14-3U5W7K", id: "catalog-studio.catalog-studio-page.th.14" })} id="catalog-studio.catalog-studio-page.th.6" className="p-2 text-center">مخفي</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.15-MSPWY2", id: "catalog-studio.catalog-studio-page.th.15" })} id="catalog-studio.catalog-studio-page.th.7" className="p-2 text-start">الصورة/العلاقة</th>
                        <th {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.th.16-WUBkR8", id: "catalog-studio.catalog-studio-page.th.16" })} id="catalog-studio.catalog-studio-page.th.8" className="p-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.tbody.2-tbTn1y", id: "catalog-studio.catalog-studio-page.tbody.2" })} id="catalog-studio.catalog-studio-page.tbody">
                      {filteredRows.map(({ item, index }) => {
                        const display = displayFor(item);
                        return (
                          <tr
                            key={`${identityFor(item)}:${index}`} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.tr.3-j7L10i", id: "catalog-studio.catalog-studio-page.tr.3" })}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (dragIndex !== null) reorder(dragIndex, index);
                              setDragIndex(null);
                            }}
                            onClick={() => setSelectedIndex(index)}
                            className={cn("border-b", selectedIndex === index && "bg-primary/10")}
                          >
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td-3KaLQQ", id: "catalog-studio.catalog-studio-page.td" })} className="p-2">
                              <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.24-VXLei9", id: "catalog-studio.catalog-studio-page.span.24" })}
                                data-drag-handle
                                draggable
                                onDragStart={() => setDragIndex(index)}
                                role="button"
                                aria-label="اسحب لإعادة الترتيب"
                                className="inline-flex touch-none"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </span>
                            </td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.2-22d2bB", id: "catalog-studio.catalog-studio-page.td.2" })} className="p-2 font-mono">{String(display?.order ?? "—")}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.3-9kOGH7", id: "catalog-studio.catalog-studio-page.td.3" })} className="p-2 font-mono text-xs" dir="ltr">{identityFor(item)}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.4-cYLns1", id: "catalog-studio.catalog-studio-page.td.4" })} className="max-w-52 truncate p-2">{nameFor(item, "ar") || String(item.value ?? "—")}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.5-XG184m", id: "catalog-studio.catalog-studio-page.td.5" })} className="max-w-52 truncate p-2" dir="ltr">{nameFor(item, "en") || String(item.kind ?? "—")}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.6-S2BT8W", id: "catalog-studio.catalog-studio-page.td.6" })} className="p-2 text-center">{display?.hidden === true ? <EyeOff className="mx-auto h-4 w-4 text-red-600" /> : <Eye className="mx-auto h-4 w-4 text-emerald-600" />}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.7-LLy7jO", id: "catalog-studio.catalog-studio-page.td.7" })} className="max-w-56 truncate p-2 text-xs" dir="ltr">{String(item.imagePath ?? item.image ?? item.optionFile ?? item.column ?? "—")}</td>
                            <td {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.td.8-Qs3ft4", id: "catalog-studio.catalog-studio-page.td.8" })} className="p-2">
                              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.81-aehp2K", id: "catalog-studio.catalog-studio-page.div.81" })} className="flex justify-center gap-1">
                                <button {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.14-8U4Lb3", id: "catalog-studio.catalog-studio-page.button.14" })} type="button" aria-label="لأعلى" onClick={(event) => { event.stopPropagation(); reorder(index, Math.max(0, index - 1)); }}><ArrowUp className="h-4 w-4" /></button>
                                <button {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.15-5562RD", id: "catalog-studio.catalog-studio-page.button.15" })} type="button" aria-label="لأسفل" onClick={(event) => { event.stopPropagation(); reorder(index, Math.min(selectedItems.length - 1, index + 1)); }}><ArrowDown className="h-4 w-4" /></button>
                                <button {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.button.16-H0G4AI", id: "catalog-studio.catalog-studio-page.button.16" })} type="button" aria-label="نسخ" onClick={(event) => { event.stopPropagation(); cloneItemAt(index); }}><Copy className="h-4 w-4" /></button>
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
              <textarea {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.textarea.4-MP9S84", id: "catalog-studio.catalog-studio-page.textarea.4" })} id="catalog-studio.catalog-studio-page.textarea" value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[65vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "raw" ? (
              <textarea {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.textarea.5-GLM3ix", id: "catalog-studio.catalog-studio-page.textarea.5" })} id="catalog-studio.catalog-studio-page.textarea.2" value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[68vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "relations" ? (
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.82-42WL31", id: "catalog-studio.catalog-studio-page.div.82" })} id="catalog-studio.catalog-studio-page.div.26" className="min-h-[50vh] rounded-2xl border bg-card p-5">
                <h3 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h3.3-YAHBB4", id: "catalog-studio.catalog-studio-page.h3.3" })} id="catalog-studio.catalog-studio-page.h3" className="flex items-center gap-2 font-bold"><Link2 id="catalog-studio.catalog-studio-page.link2" className="h-5 w-5" /> علاقات العنصر المحدد</h3>
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.83-t81ujL", id: "catalog-studio.catalog-studio-page.div.83" })} id="catalog-studio.catalog-studio-page.div.27" className="mt-4 space-y-2">
                  {itemRelations.length === 0 ? <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.21-kc2EeO", id: "catalog-studio.catalog-studio-page.p.21" })} id="catalog-studio.catalog-studio-page.p.5" className="text-sm text-muted-foreground">لا توجد علاقات مسجلة لهذا العنصر.</p> : itemRelations.map((relation, index) => (
                    <div key={`${relation.from}:${relation.to}:${index}`} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.84-Od7k0X", id: "catalog-studio.catalog-studio-page.div.84" })} className="rounded-xl border p-3 text-sm">
                      <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.22-1DAGLM", id: "catalog-studio.catalog-studio-page.p.22" })} className="font-semibold">{relation.label}</p>
                      <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.23-hOX963", id: "catalog-studio.catalog-studio-page.p.23" })} className="mt-1 break-all font-mono text-xs" dir="ltr">{relation.from}</p>
                      <ChevronLeft className="my-1 h-4 w-4" />
                      <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.24-XCA5Eb", id: "catalog-studio.catalog-studio-page.p.24" })} className="break-all font-mono text-xs" dir="ltr">{relation.to}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "diff" ? (
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.85-G9GXmp", id: "catalog-studio.catalog-studio-page.div.85" })} id="catalog-studio.catalog-studio-page.div.28" className="grid gap-3 xl:grid-cols-2">
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.86-6XoQmD", id: "catalog-studio.catalog-studio-page.div.86" })} id="catalog-studio.catalog-studio-page.div.29" className="min-w-0"><p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.25-Q5GdRQ", id: "catalog-studio.catalog-studio-page.p.25" })} id="catalog-studio.catalog-studio-page.p.6" className="mb-2 text-sm font-bold">قبل</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100" dir="ltr">{selectedFile?.content}</pre></div>
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.87-B5PH20", id: "catalog-studio.catalog-studio-page.div.87" })} id="catalog-studio.catalog-studio-page.div.30" className="min-w-0"><p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.26-eAgP67", id: "catalog-studio.catalog-studio-page.p.26" })} id="catalog-studio.catalog-studio-page.p.7" className="mb-2 text-sm font-bold">المسودة</p><pre className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200" dir="ltr">{selectedContent}</pre></div>
              </div>
            ) : null}
          </div>

          <aside {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.aside.8-FSBC1O", id: "catalog-studio.catalog-studio-page.aside.8" })} id="catalog-studio.catalog-studio-page.aside.3" className="min-w-0 rounded-2xl border bg-card p-4">
            {currentItem && mode === "structured" ? (
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.88-LW2F92", id: "catalog-studio.catalog-studio-page.div.88" })} id="catalog-studio.catalog-studio-page.div.31" className="space-y-4">
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.89-Eg5zWP", id: "catalog-studio.catalog-studio-page.div.89" })} id="catalog-studio.catalog-studio-page.div.32" className="flex items-center justify-between gap-2">
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.90-DNRpw3", id: "catalog-studio.catalog-studio-page.div.90" })} id="catalog-studio.catalog-studio-page.div.33"><p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.27-E9941E", id: "catalog-studio.catalog-studio-page.p.27" })} id="catalog-studio.catalog-studio-page.p.8" className="text-xs text-muted-foreground">العنصر المحدد</p><p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.28-B1VWx6", id: "catalog-studio.catalog-studio-page.p.28" })} id="catalog-studio.catalog-studio-page.p.9" className="font-mono font-bold" dir="ltr">{identityFor(currentItem)}</p></div>
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.91-JUYz8f", id: "catalog-studio.catalog-studio-page.div.91" })} id="catalog-studio.catalog-studio-page.div.34" className="flex gap-1">
                    <Button id="catalog-studio.catalog-studio-page.button.6" ui={{ uid: "catalog-studio.item-clone-PRMqW9", id: "catalog-studio.item-clone", kind: "action", action: "clone-item", part: "item-toolbar" }} size="icon" variant="ghost" onClick={cloneItem} aria-label="نسخ"><Copy id="catalog-studio.catalog-studio-page.copy" className="h-4 w-4" /></Button>
                    <Button id="catalog-studio.catalog-studio-page.button.7" ui={{ uid: "catalog-studio.item-delete-CkDQ8f", id: "catalog-studio.item-delete", kind: "action", action: "delete-item", part: "item-toolbar" }} size="icon" variant="ghost" onClick={deleteItem} aria-label="إزالة من المسودة"><Trash2 id="catalog-studio.catalog-studio-page.trash2" className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
                {currentItem.name && typeof currentItem.name === "object" ? (
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.92-k74Aa3", id: "catalog-studio.catalog-studio-page.div.92" })} id="catalog-studio.catalog-studio-page.div.35" className="grid gap-3">
                    <label {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.6-282nUB", id: "catalog-studio.catalog-studio-page.label.6" })} id="catalog-studio.catalog-studio-page.label" className="text-sm"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.25-3CB7n5", id: "catalog-studio.catalog-studio-page.span.25" })} id="catalog-studio.catalog-studio-page.span.6" className="mb-1 block font-semibold">الاسم العربي</span><input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.8-S38Vle", id: "catalog-studio.catalog-studio-page.input.8" })} id="catalog-studio.catalog-studio-page.input.2" value={nameFor(currentItem, "ar")} onChange={(event) => updateName("ar", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <label {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.7-AR2b8R", id: "catalog-studio.catalog-studio-page.label.7" })} id="catalog-studio.catalog-studio-page.label.2" className="text-sm"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.26-9WCLgP", id: "catalog-studio.catalog-studio-page.span.26" })} id="catalog-studio.catalog-studio-page.span.7" className="mb-1 block font-semibold">الاسم بالإنجليزية</span><input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.9-C50Gfg", id: "catalog-studio.catalog-studio-page.input.9" })} id="catalog-studio.catalog-studio-page.input.3" dir="ltr" value={nameFor(currentItem, "en")} onChange={(event) => updateName("en", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                  </div>
                ) : null}
                {displayFor(currentItem) ? (
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.93-ZXE4ou", id: "catalog-studio.catalog-studio-page.div.93" })} id="catalog-studio.catalog-studio-page.div.36" className="rounded-xl border p-3">
                    <label {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.8-JOQL8i", id: "catalog-studio.catalog-studio-page.label.8" })} id="catalog-studio.catalog-studio-page.label.3" className="text-sm"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.27-Bg0ogw", id: "catalog-studio.catalog-studio-page.span.27" })} id="catalog-studio.catalog-studio-page.span.8" className="mb-1 block font-semibold">ترتيب الظهور</span><input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.10-uhuIE7", id: "catalog-studio.catalog-studio-page.input.10" })} id="catalog-studio.catalog-studio-page.input.4" type="number" min={1} value={Number(displayFor(currentItem)?.order ?? 10)} onChange={(event) => updateDisplay("order", Math.max(1, Number(event.target.value)))} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.94-sSC8wL", id: "catalog-studio.catalog-studio-page.div.94" })} id="catalog-studio.catalog-studio-page.div.37" className="mt-3 flex items-center justify-between"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.28-OTsK61", id: "catalog-studio.catalog-studio-page.span.28" })} id="catalog-studio.catalog-studio-page.span.9" className="text-sm font-semibold">إخفاء عالمي</span><Switch id="catalog-studio.catalog-studio-page.switch" ui={{ uid: "catalog-studio.item-hidden-Lu1nsK", id: "catalog-studio.item-hidden", kind: "field", action: "toggle-hidden", part: "display" }} checked={displayFor(currentItem)?.hidden === true} onCheckedChange={(checked) => updateDisplay("hidden", checked)} /></div>
                    {displayFor(currentItem)?.hidden === true ? <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.29-E4YXP6", id: "catalog-studio.catalog-studio-page.p.29" })} id="catalog-studio.catalog-studio-page.p.10" className="mt-2 text-xs text-amber-700">سيُخفى العنصر وأبناؤه من جميع أجزاء المشروع.</p> : null}
                  </div>
                ) : null}
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.95-2XBT9J", id: "catalog-studio.catalog-studio-page.div.95" })} id="catalog-studio.catalog-studio-page.div.38" className="grid gap-3">
                  {primitiveKeys.filter((key) => key in currentItem).map((key) => {
                    const value = currentItem[key];
                    if (typeof value === "boolean") {
                      return <div key={key} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.96-6IAV1B", id: "catalog-studio.catalog-studio-page.div.96" })} className="flex items-center justify-between rounded-lg border p-2"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.29-g4yZdE", id: "catalog-studio.catalog-studio-page.span.29" })} className="font-mono text-xs" dir="ltr">{key}</span><Switch ui={{ uid: "catalog-studio.catalog-studio-page.switch.4-G7R913", id: "catalog-studio.catalog-studio-page.switch.4" }} checked={value} onCheckedChange={(checked) => updatePrimitive(key, checked)} /></div>;
                    }
                    if (typeof value === "object" && value !== null) return null;
                    return <label key={key} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.9-QSHho2", id: "catalog-studio.catalog-studio-page.label.9" })} className="text-sm"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.30-R5D6Jj", id: "catalog-studio.catalog-studio-page.span.30" })} className="mb-1 block font-mono text-xs" dir="ltr">{key}</span><input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.11-PHkI89", id: "catalog-studio.catalog-studio-page.input.11" })} dir="ltr" value={value === null ? "" : String(value ?? "")} onChange={(event) => updatePrimitive(key, event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
                  })}
                </div>
                <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.97-wjEMq7", id: "catalog-studio.catalog-studio-page.div.97" })} id="catalog-studio.catalog-studio-page.div.39">
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.98-HdD25L", id: "catalog-studio.catalog-studio-page.div.98" })} id="catalog-studio.catalog-studio-page.div.40" className="mb-2 flex items-center justify-between"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.31-gQLG97", id: "catalog-studio.catalog-studio-page.span.31" })} id="catalog-studio.catalog-studio-page.span.10" className="text-sm font-bold">JSON العنصر</span><Button id="catalog-studio.catalog-studio-page.button.8" ui={{ uid: "catalog-studio.item-json-apply-Ib5jF8", id: "catalog-studio.item-json-apply", kind: "action", action: "apply-item-json", part: "json" }} size="sm" variant="outline" onClick={applyItemJson}><Braces id="catalog-studio.catalog-studio-page.braces" className="me-1 h-4 w-4" />تطبيق</Button></div>
                  <textarea {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.textarea.6-CiBN8I", id: "catalog-studio.catalog-studio-page.textarea.6" })} id="catalog-studio.catalog-studio-page.textarea.3" value={itemJson} onChange={(event) => setItemJson(event.target.value)} className="h-64 w-full rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
                  {itemJsonError ? <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.30-MorB23", id: "catalog-studio.catalog-studio-page.p.30" })} id="catalog-studio.catalog-studio-page.p.11" className="mt-1 text-xs text-red-600">{itemJsonError}</p> : null}
                </div>
              </div>
            ) : (
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.99-Uw0Bt5", id: "catalog-studio.catalog-studio-page.div.99" })} id="catalog-studio.catalog-studio-page.div.41" className="flex min-h-48 flex-col items-center justify-center text-center text-muted-foreground"><Braces id="catalog-studio.catalog-studio-page.braces.2" className="mb-3 h-10 w-10" /><p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.31-BxX1bN", id: "catalog-studio.catalog-studio-page.p.31" })} id="catalog-studio.catalog-studio-page.p.12" className="text-sm">اختر عنصرًا من العرض المنظم لفتح المحرر.</p></div>
            )}
          </aside>
        </section>
      ) : null}

      {snapshot && section === "assets" ? (
        <section {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.section.7-NO3CQc", id: "catalog-studio.catalog-studio-page.section.7" })} id="catalog-studio.catalog-studio-page.section.3" className="space-y-4">
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.100-0eUM6Y", id: "catalog-studio.catalog-studio-page.div.100" })} id="catalog-studio.catalog-studio-page.div.42" className="grid gap-4 rounded-2xl border bg-card p-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.101-TLOx5c", id: "catalog-studio.catalog-studio-page.div.101" })} id="catalog-studio.catalog-studio-page.div.43" className="relative"><Search id="catalog-studio.catalog-studio-page.search.2" className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.12-roLZ5Q", id: "catalog-studio.catalog-studio-page.input.12" })} id="catalog-studio.catalog-studio-page.input.5" value={imageSearch} onChange={(event) => setImageSearch(event.target.value)} placeholder="بحث في مسار الصورة" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3" /></div>
            <select {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.select.3-4248Lw", id: "catalog-studio.catalog-studio-page.select.3" })} id="catalog-studio.catalog-studio-page.select" value={imageRootFilter} onChange={(event) => setImageRootFilter(event.target.value as typeof imageRootFilter)} className="rounded-lg border bg-background px-3 py-2"><option {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.option-f4Q3ec", id: "catalog-studio.catalog-studio-page.option" })} value="all">كل المجلدات</option>{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.option.2-a72VWs", id: "catalog-studio.catalog-studio-page.option.2" })} value={key}>{label}</option>)}</select>
            <label {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.10-8BkWpN", id: "catalog-studio.catalog-studio-page.label.10" })} id="catalog-studio.catalog-studio-page.label.4" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Switch id="catalog-studio.catalog-studio-page.switch.2" ui={{ uid: "catalog-studio.images-only-unreferenced-A1Y1y1", id: "catalog-studio.images-only-unreferenced", kind: "field", action: "toggle-unreferenced-filter", part: "filter" }} checked={onlyUnreferenced} onCheckedChange={setOnlyUnreferenced} /> غير المستخدمة فقط</label>
            <span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.32-L9w07Q", id: "catalog-studio.catalog-studio-page.span.32" })} id="catalog-studio.catalog-studio-page.span.11" className="self-center text-sm text-muted-foreground">{filteredImages.length} صورة</span>
          </div>
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.102-RVa2N4", id: "catalog-studio.catalog-studio-page.div.102" })} id="catalog-studio.catalog-studio-page.div.44" className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <aside {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.aside.9-W500su", id: "catalog-studio.catalog-studio-page.aside.9" })} id="catalog-studio.catalog-studio-page.aside.4" className="space-y-3 rounded-2xl border bg-card p-4">
              <h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.10-KMA9C7", id: "catalog-studio.catalog-studio-page.h2.10" })} id="catalog-studio.catalog-studio-page.h2.4" className="flex items-center gap-2 font-bold"><Upload id="catalog-studio.catalog-studio-page.upload" className="h-5 w-5" /> رفع أو استبدال صورة</h2>
              <select {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.select.4-XU0U5m", id: "catalog-studio.catalog-studio-page.select.4" })} id="catalog-studio.catalog-studio-page.select.2" value={uploadRoot} onChange={(event) => setUploadRoot(event.target.value as CatalogStudioImageRoot)} className="w-full rounded-lg border bg-background px-3 py-2">{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.option.3-Spjlj1", id: "catalog-studio.catalog-studio-page.option.3" })} value={key}>{label}</option>)}</select>
              <input {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.input.13-abfO9J", id: "catalog-studio.catalog-studio-page.input.13" })} id="catalog-studio.catalog-studio-page.input.6" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-2 text-sm" />
              <label {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.label.11-kvR5SJ", id: "catalog-studio.catalog-studio-page.label.11" })} id="catalog-studio.catalog-studio-page.label.5" className="flex items-center justify-between rounded-lg border p-3 text-sm"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.33-pS0ikD", id: "catalog-studio.catalog-studio-page.span.33" })} id="catalog-studio.catalog-studio-page.span.12">استبدال إذا كان الاسم موجودًا</span><Switch id="catalog-studio.catalog-studio-page.switch.3" ui={{ uid: "catalog-studio.image-replace-IBoE28", id: "catalog-studio.image-replace", kind: "field", action: "toggle-replace-image", part: "upload" }} checked={replaceImage} onCheckedChange={setReplaceImage} /></label>
              <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.32-YPW5AA", id: "catalog-studio.catalog-studio-page.p.32" })} id="catalog-studio.catalog-studio-page.p.13" className="text-xs text-muted-foreground">حد أقصى 10 MB. يتم فحص توقيع PNG/JPG/WEBP. عند الاستبدال تُنشأ نسخة استعادة خارج public.</p>
            </aside>
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.103-7VPBw5", id: "catalog-studio.catalog-studio-page.div.103" })} id="catalog-studio.catalog-studio-page.div.45" className="grid max-h-[72vh] gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredImages.map((image) => (
                <article key={image.path} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.article-ES7OIg", id: "catalog-studio.catalog-studio-page.article" })} className="overflow-hidden rounded-2xl border bg-card">
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.104-D90ONG", id: "catalog-studio.catalog-studio-page.div.104" })} className="aspect-[4/3] bg-surface-bright bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${image.publicUrl.replaceAll('"', "%22")}")` }} />
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.105-z3FITI", id: "catalog-studio.catalog-studio-page.div.105" })} className="space-y-2 p-3">
                    <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.33-3mcAOT", id: "catalog-studio.catalog-studio-page.p.33" })} className="truncate font-mono text-xs" aria-label={image.path} dir="ltr">{image.path}</p>
                    <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.106-2C9ajV", id: "catalog-studio.catalog-studio-page.div.106" })} className="flex flex-wrap gap-1 text-[11px]"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.34-9RhYaB", id: "catalog-studio.catalog-studio-page.span.34" })} className="rounded bg-muted px-2 py-1">{humanSize(image.size)}</span><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.35-18GsX1", id: "catalog-studio.catalog-studio-page.span.35" })} className={cn("rounded px-2 py-1", image.references.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{image.references.length} مرجع</span></div>
                    <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.34-VlRh05", id: "catalog-studio.catalog-studio-page.p.34" })} className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">SHA {image.hash.slice(0, 16)}…</p>
                    {image.references.length ? <details className="text-xs"><summary {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.summary-50QeUB", id: "catalog-studio.catalog-studio-page.summary" })} className="">العلاقات</summary><div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.107-FEp81l", id: "catalog-studio.catalog-studio-page.div.107" })} className="mt-1 space-y-1">{image.references.map((reference) => <p key={reference} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.35-RnAq75", id: "catalog-studio.catalog-studio-page.p.35" })} className="break-all font-mono" dir="ltr">{reference}</p>)}</div></details> : null}
                    <Button ui={{ uid: "catalog-studio.catalog-studio-page.button.17-NWcOl4", id: "catalog-studio.catalog-studio-page.button.17" }} variant="outline" size="sm" className="w-full" disabled={image.references.length > 0 || Boolean(busy)} onClick={() => stageImageTrash(image.path)}><Trash2 className="me-1 h-4 w-4" /> نقل للسلة</Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {snapshot && section === "audit" ? (
        <section {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.section.8-4nwSGW", id: "catalog-studio.catalog-studio-page.section.8" })} id="catalog-studio.catalog-studio-page.section.4" className="grid gap-4 xl:grid-cols-[1fr_460px]">
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.108-8pV0EJ", id: "catalog-studio.catalog-studio-page.div.108" })} id="catalog-studio.catalog-studio-page.div.46" className="rounded-2xl border bg-card p-5">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.109-7cU5TH", id: "catalog-studio.catalog-studio-page.div.109" })} id="catalog-studio.catalog-studio-page.div.47" className="flex items-center gap-2"><History id="catalog-studio.catalog-studio-page.history" className="h-5 w-5" /><h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.11-X2S441", id: "catalog-studio.catalog-studio-page.h2.11" })} id="catalog-studio.catalog-studio-page.h2.5" className="font-bold">سجل عمليات الملفات والصور</h2></div>
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.110-aG5qNT", id: "catalog-studio.catalog-studio-page.div.110" })} id="catalog-studio.catalog-studio-page.div.48" className="mt-4 space-y-3">
              {snapshot.audit.length === 0 ? <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.36-1SeKH5", id: "catalog-studio.catalog-studio-page.p.36" })} id="catalog-studio.catalog-studio-page.p.14" className="text-sm text-muted-foreground">لا توجد عمليات محفوظة بعد.</p> : snapshot.audit.map((entry, index) => (
                <div key={`${entry.at}:${index}`} {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.111-4GF4R5", id: "catalog-studio.catalog-studio-page.div.111" })} className="rounded-xl border p-3">
                  <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.112-6CAyjH", id: "catalog-studio.catalog-studio-page.div.112" })} className="flex flex-wrap items-center justify-between gap-2"><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.36-1dJNrm", id: "catalog-studio.catalog-studio-page.span.36" })} className="font-mono text-xs">{entry.action}</span><time className="text-xs text-muted-foreground">{formatDateTimeDefault(entry.at)}</time></div>
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.37-5BeCO9", id: "catalog-studio.catalog-studio-page.p.37" })} className="mt-2 text-sm">{entry.details}</p>
                  <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.38-3CGSH6", id: "catalog-studio.catalog-studio-page.p.38" })} className="mt-2 break-all font-mono text-xs" dir="ltr">{entry.files.join(",")}</p>
                  {entry.recoveryPath ? <p {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.p.39-QKUj92", id: "catalog-studio.catalog-studio-page.p.39" })} className="mt-1 break-all text-xs text-amber-700" dir="ltr">مسار الاسترجاع: {entry.recoveryPath}</p> : null}
                </div>
              ))}
            </div>
          </div>
          <aside {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.aside.10-DCsV8w", id: "catalog-studio.catalog-studio-page.aside.10" })} id="catalog-studio.catalog-studio-page.aside.5" className="space-y-4">
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.113-sO8hQa", id: "catalog-studio.catalog-studio-page.div.113" })} id="catalog-studio.catalog-studio-page.div.49" className="rounded-2xl border bg-card p-5">
              <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.114-L1lOvG", id: "catalog-studio.catalog-studio-page.div.114" })} id="catalog-studio.catalog-studio-page.div.50" className="flex items-center gap-2">{snapshot.validation.valid ? <CheckCircle2 id="catalog-studio.catalog-studio-page.check-circle2.2" className="h-5 w-5 text-emerald-600" /> : <ShieldAlert id="catalog-studio.catalog-studio-page.shield-alert" className="h-5 w-5 text-red-600" />}<h2 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h2.12-FCS28h", id: "catalog-studio.catalog-studio-page.h2.12" })} id="catalog-studio.catalog-studio-page.h2.6" className="font-bold">التحقق الحالي</h2></div>
              <pre className="mt-4 max-h-[48vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{validation?.output ?? snapshot.validation.output}</pre>
            </div>
            <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.115-AM3I0p", id: "catalog-studio.catalog-studio-page.div.115" })} id="catalog-studio.catalog-studio-page.div.51" className="rounded-2xl border bg-card p-5">
              <h3 {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.h3.4-WX3iMB", id: "catalog-studio.catalog-studio-page.h3.4" })} id="catalog-studio.catalog-studio-page.h3.2" className="font-bold">حماية الكتابة</h3>
              <ul {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.ul.2-JAhbL8", id: "catalog-studio.catalog-studio-page.ul.2" })} id="catalog-studio.catalog-studio-page.ul" className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.li.6-b66OJB", id: "catalog-studio.catalog-studio-page.li.6" })} id="catalog-studio.catalog-studio-page.li">• كشف تغيير الملف خارجيًا باستخدام SHA-256.</li>
                <li {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.li.7-KyDg77", id: "catalog-studio.catalog-studio-page.li.7" })} id="catalog-studio.catalog-studio-page.li.2">• تحقق كامل على نسخة staging.</li>
                <li {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.li.8-5qAlR2", id: "catalog-studio.catalog-studio-page.li.8" })} id="catalog-studio.catalog-studio-page.li.3">• نسخة احتياطية كاملة للملفات المتغيرة.</li>
                <li {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.li.9-EBu8EI", id: "catalog-studio.catalog-studio-page.li.9" })} id="catalog-studio.catalog-studio-page.li.4">• rollback تلقائي عند فشل الكتابة أو التحقق اللاحق.</li>
                <li {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.li.10-1WghN9", id: "catalog-studio.catalog-studio-page.li.10" })} id="catalog-studio.catalog-studio-page.li.5">• استعادة transaction من journal بعد انقطاع العملية.</li>
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      {changedFiles.length > 0 ? (
        <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.116-GJXS0V", id: "catalog-studio.catalog-studio-page.div.116" })} id="catalog-studio.catalog-studio-page.div.52" className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3 shadow-xl backdrop-blur dark:border-amber-900 dark:bg-amber-950/90">
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.117-H8xEsv", id: "catalog-studio.catalog-studio-page.div.117" })} id="catalog-studio.catalog-studio-page.div.53" className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100"><AlertTriangle id="catalog-studio.catalog-studio-page.alert-triangle.2" className="h-5 w-5" /><span {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.span.37-gB5ub0", id: "catalog-studio.catalog-studio-page.span.37" })} id="catalog-studio.catalog-studio-page.span.13">{changedFiles.length} ملفًا في المسودة ولم تُكتب على المصدر بعد.</span></div>
          <div {...uiAttributes({ uid: "catalog-studio.catalog-studio-page.div.118-4TzToS", id: "catalog-studio.catalog-studio-page.div.118" })} id="catalog-studio.catalog-studio-page.div.54" className="flex gap-2"><Button id="catalog-studio.catalog-studio-page.button.9" ui={{ uid: "catalog-studio.drafts-clear-Q8l5Jq", id: "catalog-studio.drafts-clear", kind: "action", action: "clear-drafts", part: "drafts" }} variant="outline" size="sm" onClick={() => setDrafts({})}><CircleOff id="catalog-studio.catalog-studio-page.circle-off" className="me-1 h-4 w-4" />مسح المسودة</Button></div>
        </div>
      ) : null}
    </main>
  );
}
