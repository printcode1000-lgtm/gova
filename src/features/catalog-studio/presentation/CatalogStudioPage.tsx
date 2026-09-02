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
    return <div id='features-catalog-studio-presentation-catalogstudiopage-div-1-hwxai7' className="flex min-h-[60vh] items-center justify-center"><Loader2 id='features-catalog-studio-presentation-catalogstudiopage-loader2-2-bbhzfk' className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) {
    return <div id='features-catalog-studio-presentation-catalogstudiopage-div-3-r9fman' className="mx-auto mt-16 max-w-xl"><StatusBox id='features-catalog-studio-presentation-catalogstudiopage-statusbox-4-spsvum' kind="error">هذه الصفحة متاحة فقط لجلسة Super Admin أثناء التطوير.</StatusBox></div>;
  }
  if (!desktopWeb) {
    return (
      <div id='features-catalog-studio-presentation-catalogstudiopage-div-5-y3eqou' className="mx-auto mt-16 max-w-xl">
        <StatusBox id='features-catalog-studio-presentation-catalogstudiopage-statusbox-6-minpjf' kind="notice">
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
    <main id='features-catalog-studio-presentation-catalogstudiopage-main-7-dbwbgx' className="mx-auto w-full max-w-[1800px] space-y-4 px-4 py-6 lg:px-6" dir="rtl">
      <header id='features-catalog-studio-presentation-catalogstudiopage-header-8-7zozy6' className="rounded-2xl border bg-card p-5 shadow-sm">
        <div id='features-catalog-studio-presentation-catalogstudiopage-div-9-k36zrj' className="flex flex-wrap items-start justify-between gap-4">
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-10-4adh3m'>
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-11-qoldeu' className="flex flex-wrap items-center gap-2">
              <h1 id='features-catalog-studio-presentation-catalogstudiopage-heading-12-zhra5i' className="text-2xl font-bold">استوديو الكتالوج</h1>
              <span id='features-catalog-studio-presentation-catalogstudiopage-text-13-q5pwcm' className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">DEVELOPMENT ONLY</span>
              {snapshot ? <span id='features-catalog-studio-presentation-catalogstudiopage-text-14-wfgk85' className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">كتالوج إصدار {snapshot.stats.schemaVersion}</span> : null}
            </div>
            <p id='features-catalog-studio-presentation-catalogstudiopage-text-15-r2mfba' className="mt-2 text-sm text-muted-foreground">تحرير ملفات Catalog والصور والعلاقات دون قراءة أو تعديل سجلات المستخدمين.</p>
          </div>
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-16-wky7ec' className="flex flex-wrap items-center gap-2">
            <Button id='features-catalog-studio-presentation-catalogstudiopage-button-17-lpyumj' variant="outline" onClick={() => void loadSnapshot()} disabled={Boolean(busy)}>
              <RefreshCw id='features-catalog-studio-presentation-catalogstudiopage-refreshcw-18-ejunyx' className={cn("me-2 h-4 w-4", busy === "load" && "animate-spin")} /> تحديث
            </Button>
            <Button id='features-catalog-studio-presentation-catalogstudiopage-button-19-ajh8vy' variant="outline" onClick={() => void validateChanges()} disabled={Boolean(busy) || changedFiles.length === 0}>
              <ClipboardCheck id='features-catalog-studio-presentation-catalogstudiopage-clipboardcheck-20-9synks' className="me-2 h-4 w-4" /> فحص شامل
            </Button>
          </div>
        </div>
      </header>

      {error ? <StatusBox id='features-catalog-studio-presentation-catalogstudiopage-statusbox-21-h0ewxb' kind="error">{error}</StatusBox> : null}
      {notice ? <StatusBox id='features-catalog-studio-presentation-catalogstudiopage-statusbox-22-uq0oj2' kind={validation?.valid === false ? "notice" : "success"}>{notice}</StatusBox> : null}

      <nav id='features-catalog-studio-presentation-catalogstudiopage-nav-23-mrhjb3' className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3">
        {(Object.keys(sectionLabels) as StudioSection[]).map((key) => (
          <SectionButton key={key} active={section === key} label={sectionLabels[key]} onClick={() => setSection(key)} />
        ))}
      </nav>

      {busy === "load" && !snapshot ? (
        <div id='features-catalog-studio-presentation-catalogstudiopage-div-24-2yntq3' className="flex min-h-[55vh] items-center justify-center rounded-2xl border bg-card"><Loader2 id='features-catalog-studio-presentation-catalogstudiopage-loader2-25-qmqxrn' className="h-10 w-10 animate-spin text-primary" /></div>
      ) : null}

      {snapshot && section === "overview" ? (
        <section id='features-catalog-studio-presentation-catalogstudiopage-section-26-iozqay' className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-27-xnpu4s' className="space-y-4">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-28-wurmd1' className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-29-kqhzix' className="rounded-2xl border bg-card p-5">
              <h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-30-oojc94' className="font-bold">ملفات JSON</h2>
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-31-snxkix' className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
          <aside id='features-catalog-studio-presentation-catalogstudiopage-aside-32-l7zwln' className="space-y-4">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-33-388feg' className="rounded-2xl border bg-card p-5">
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-34-guo96j' className="flex items-center gap-2">
                {snapshot.validation.valid ? <CheckCircle2 id='features-catalog-studio-presentation-catalogstudiopage-checkcircle2-35-s0wyxq' className="h-6 w-6 text-emerald-600" /> : <AlertTriangle id='features-catalog-studio-presentation-catalogstudiopage-alerttriangle-36-4phliv' className="h-6 w-6 text-red-600" />}
                <h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-37-vsx9ad' className="font-bold">حالة المصدر الحالي</h2>
              </div>
              <p id='features-catalog-studio-presentation-catalogstudiopage-text-38-n7qod2' className="mt-3 text-sm">{snapshot.validation.valid ? "جميع العقود والعلاقات والصور سليمة." : "توجد أخطاء يجب إصلاحها قبل أي حفظ."}</p>
              <pre id="features-catalog-studio-presentation-catalogstudiopage-pre-39-hh3zk7" className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{snapshot.validation.output}</pre>
            </div>
            <button id='features-catalog-studio-presentation-catalogstudiopage-button-40-fchfz5'
              type="button"
              onClick={() => openFile(snapshot.files.find((file) => file.path === "manifest.json")!)}
              className="w-full rounded-2xl border bg-card p-5 text-start"
            >
              <Database id='features-catalog-studio-presentation-catalogstudiopage-database-41-iwavxd' className="mb-2 h-6 w-6 text-primary" />
              <span id='features-catalog-studio-presentation-catalogstudiopage-text-42-nyd86b' className="block font-bold">البيان الوصفي</span>
              <span id='features-catalog-studio-presentation-catalogstudiopage-text-43-hyqrjm' className="text-sm text-muted-foreground">الإصدار {snapshot.stats.catalogVersion}</span>
            </button>
          </aside>
        </section>
      ) : null}

      {snapshot && groupSections[section] ? (
        <section id='features-catalog-studio-presentation-catalogstudiopage-section-44-zggjw3' className="grid min-h-[72vh] gap-4 lg:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside id='features-catalog-studio-presentation-catalogstudiopage-aside-45-lhghkv' className="rounded-2xl border bg-card p-3">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-46-yhpize' className="mb-3 flex items-center justify-between">
              <h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-47-3xpajs' className="font-bold">الملفات</h2>
              <span id='features-catalog-studio-presentation-catalogstudiopage-text-48-5vcawk' className="text-xs text-muted-foreground">{groupFiles.length}</span>
            </div>
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-49-dhywla' className="space-y-1">
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

          <div id='features-catalog-studio-presentation-catalogstudiopage-div-50-wfb7n9' className="min-w-0 space-y-3">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-51-ns0fuc' className="rounded-2xl border bg-card p-3">
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-52-pi5dwq' className="flex flex-wrap items-center justify-between gap-3">
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-53-sylkn8'>
                  <p id='features-catalog-studio-presentation-catalogstudiopage-text-54-w9ynun' className="font-mono text-sm" dir="ltr">{selectedFile?.path}</p>
                  <p id='features-catalog-studio-presentation-catalogstudiopage-text-55-bnxk71' className="text-xs text-muted-foreground">{selectedFile?.itemCount ?? 0} عنصر {selectedFile?.readOnly ? "• مولد للقراءة فقط" : ""}</p>
                </div>
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-56-gouf7g' className="flex flex-wrap gap-1">
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
                    <Button id='features-catalog-studio-presentation-catalogstudiopage-button-57-oxh1px' size="sm" variant="ghost" onClick={resetFile}><RotateCcw id='features-catalog-studio-presentation-catalogstudiopage-rotateccw-58-grdpui' className="me-1 h-4 w-4" />تراجع الملف</Button>
                  ) : null}
                </div>
              </div>
            </div>

            {mode === "structured" && selectedFile?.itemKey ? (
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-59-5ixeci' className="overflow-hidden rounded-2xl border bg-card">
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-60-dn1ib1' className="flex flex-wrap items-center gap-2 border-b p-3">
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-61-irawd7' className="relative min-w-56 flex-1">
                    <Search id='features-catalog-studio-presentation-catalogstudiopage-search-62-uqr6lr' className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input id='features-catalog-studio-presentation-catalogstudiopage-input-63-yzngcc' value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو ID أو أي حقل" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3 text-sm" />
                  </div>
                  <Button id='features-catalog-studio-presentation-catalogstudiopage-button-64-plp7pe' size="sm" variant="outline" onClick={addItem}><Plus id='features-catalog-studio-presentation-catalogstudiopage-plus-65-iszdo0' className="me-1 h-4 w-4" />إضافة</Button>
                </div>
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-66-ywqmt0' className="max-h-[62vh] overflow-auto">
                  <table id='features-catalog-studio-presentation-catalogstudiopage-table-67-dhpqyx' className="w-full min-w-[850px] text-sm">
                    <thead id='features-catalog-studio-presentation-catalogstudiopage-thead-68-8ognfp' className="sticky top-0 z-10 bg-muted">
                      <tr id='features-catalog-studio-presentation-catalogstudiopage-tr-69-cbx70a'>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-70-8myclg' className="w-10 p-2" />
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-71-063wal' className="p-2 text-start">الترتيب</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-72-ourqiq' className="p-2 text-start">ID</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-73-suiwst' className="p-2 text-start">العربي</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-74-2yqdmv' className="p-2 text-start">الإنجليزية</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-75-akd6ch' className="p-2 text-center">مخفي</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-76-rial10' className="p-2 text-start">الصورة/العلاقة</th>
                        <th id='features-catalog-studio-presentation-catalogstudiopage-th-77-zbziv6' className="p-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody id='features-catalog-studio-presentation-catalogstudiopage-tbody-78-mewxfd'>
                      {filteredRows.map(({ item, index }) => {
                        const display = displayFor(item);
                        return (
                          <tr
                            key={`${identityFor(item)}:${index}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (dragIndex !== null) reorder(dragIndex, index);
                              setDragIndex(null);
                            }}
                            onClick={() => setSelectedIndex(index)}
                            className={cn("border-b", selectedIndex === index && "bg-primary/10")}
                          >
                            <td className="p-2">
                              <span
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
              <textarea id='features-catalog-studio-presentation-catalogstudiopage-textarea-79-ybbjxa' value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[65vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "raw" ? (
              <textarea id='features-catalog-studio-presentation-catalogstudiopage-textarea-80-9oc4ay' value={selectedContent} onChange={(event) => selectedFile && setFileContent(selectedFile.path, event.target.value)} readOnly={selectedFile?.readOnly} className="h-[68vh] w-full rounded-2xl border bg-slate-950 p-4 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
            ) : null}

            {mode === "relations" ? (
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-81-b35jcb' className="min-h-[50vh] rounded-2xl border bg-card p-5">
                <h3 id='features-catalog-studio-presentation-catalogstudiopage-heading-82-7bwueb' className="flex items-center gap-2 font-bold"><Link2 id='features-catalog-studio-presentation-catalogstudiopage-link2-83-szkux3' className="h-5 w-5" /> علاقات العنصر المحدد</h3>
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-84-mpd3zq' className="mt-4 space-y-2">
                  {itemRelations.length === 0 ? <p id='features-catalog-studio-presentation-catalogstudiopage-text-85-8zoszv' className="text-sm text-muted-foreground">لا توجد علاقات مسجلة لهذا العنصر.</p> : itemRelations.map((relation, index) => {
                    return (
                      <div key={`${relation.from}:${relation.to}:${index}`} className="rounded-xl border p-3 text-sm">
                        <p className="font-semibold">{relation.label}</p>
                        <p className="mt-1 break-all font-mono text-xs" dir="ltr">{relation.from}</p>
                        <ChevronLeft className="my-1 h-4 w-4" />
                        <p className="break-all font-mono text-xs" dir="ltr">{relation.to}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "diff" ? (
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-86-zchjtl' className="grid gap-3 xl:grid-cols-2">
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-87-ckxgmk' className="min-w-0"><p id='features-catalog-studio-presentation-catalogstudiopage-text-88-nqcefn' className="mb-2 text-sm font-bold">قبل</p><pre id="features-catalog-studio-presentation-catalogstudiopage-pre-89-qeo1jr" className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100" dir="ltr">{selectedFile?.content}</pre></div>
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-90-cqjkm8' className="min-w-0"><p id='features-catalog-studio-presentation-catalogstudiopage-text-91-4qxvto' className="mb-2 text-sm font-bold">المسودة</p><pre id="features-catalog-studio-presentation-catalogstudiopage-pre-92-fov4ph" className="h-[64vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200" dir="ltr">{selectedContent}</pre></div>
              </div>
            ) : null}
          </div>

          <aside id='features-catalog-studio-presentation-catalogstudiopage-aside-93-eklgvz' className="min-w-0 rounded-2xl border bg-card p-4">
            {currentItem && mode === "structured" ? (
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-94-kivkrk' className="space-y-4">
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-95-wtdy7f' className="flex items-center justify-between gap-2">
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-96-szeeh1'><p id='features-catalog-studio-presentation-catalogstudiopage-text-97-7unvfi' className="text-xs text-muted-foreground">العنصر المحدد</p><p id='features-catalog-studio-presentation-catalogstudiopage-text-98-z6t1am' className="font-mono font-bold" dir="ltr">{identityFor(currentItem)}</p></div>
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-99-dltfgm' className="flex gap-1">
                    <Button id='features-catalog-studio-presentation-catalogstudiopage-button-100-kwcbxz' size="icon" variant="ghost" onClick={cloneItem} aria-label="نسخ"><Copy id='features-catalog-studio-presentation-catalogstudiopage-copy-101-li2nkj' className="h-4 w-4" /></Button>
                    <Button id='features-catalog-studio-presentation-catalogstudiopage-button-102-g9qljk' size="icon" variant="ghost" onClick={deleteItem} aria-label="إزالة من المسودة"><Trash2 id='features-catalog-studio-presentation-catalogstudiopage-trash2-103-1kaggp' className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
                {currentItem.name && typeof currentItem.name === "object" ? (
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-104-vziztn' className="grid gap-3">
                    <label id='features-catalog-studio-presentation-catalogstudiopage-label-105-q6hscx' className="text-sm"><span id='features-catalog-studio-presentation-catalogstudiopage-text-106-9wnvm6' className="mb-1 block font-semibold">الاسم العربي</span><input id='features-catalog-studio-presentation-catalogstudiopage-input-107-64nshx' value={nameFor(currentItem, "ar")} onChange={(event) => updateName("ar", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <label id='features-catalog-studio-presentation-catalogstudiopage-label-108-z2lmfv' className="text-sm"><span id='features-catalog-studio-presentation-catalogstudiopage-text-109-vg8vw2' className="mb-1 block font-semibold">الاسم بالإنجليزية</span><input id='features-catalog-studio-presentation-catalogstudiopage-input-110-nnf1hh' dir="ltr" value={nameFor(currentItem, "en")} onChange={(event) => updateName("en", event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                  </div>
                ) : null}
                {displayFor(currentItem) ? (
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-111-kvqjm0' className="rounded-xl border p-3">
                    <label id='features-catalog-studio-presentation-catalogstudiopage-label-112-mmihtr' className="text-sm"><span id='features-catalog-studio-presentation-catalogstudiopage-text-113-ooc32b' className="mb-1 block font-semibold">ترتيب الظهور</span><input id='features-catalog-studio-presentation-catalogstudiopage-input-114-uhnfsp' type="number" min={1} value={Number(displayFor(currentItem)?.order ?? 10)} onChange={(event) => updateDisplay("order", Math.max(1, Number(event.target.value)))} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                    <div id='features-catalog-studio-presentation-catalogstudiopage-div-115-26vfze' className="mt-3 flex items-center justify-between"><span id='features-catalog-studio-presentation-catalogstudiopage-text-116-m7jax4' className="text-sm font-semibold">إخفاء عالمي</span><Switch id='features-catalog-studio-presentation-catalogstudiopage-switch-117-sp0ntc' checked={displayFor(currentItem)?.hidden === true} onCheckedChange={(checked) => updateDisplay("hidden", checked)} /></div>
                    {displayFor(currentItem)?.hidden === true ? <p id='features-catalog-studio-presentation-catalogstudiopage-text-118-obzhvu' className="mt-2 text-xs text-amber-700">سيُخفى العنصر وأبناؤه من جميع أجزاء المشروع.</p> : null}
                  </div>
                ) : null}
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-119-jh0a5n' className="grid gap-3">
                  {primitiveKeys.filter((key) => key in currentItem).map((key) => {
                    const value = currentItem[key];
                    if (typeof value === "boolean") {
                      return <div key={key} className="flex items-center justify-between rounded-lg border p-2"><span className="font-mono text-xs" dir="ltr">{key}</span><Switch checked={value} onCheckedChange={(checked) => updatePrimitive(key, checked)} /></div>;
                    }
                    if (typeof value === "object" && value !== null) return null;
                    return <label key={key} className="text-sm"><span className="mb-1 block font-mono text-xs" dir="ltr">{key}</span><input dir="ltr" value={value === null ? "" : String(value ?? "")} onChange={(event) => updatePrimitive(key, event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
                  })}
                </div>
                <div id='features-catalog-studio-presentation-catalogstudiopage-div-120-d4dyym'>
                  <div id='features-catalog-studio-presentation-catalogstudiopage-div-121-151lya' className="mb-2 flex items-center justify-between"><span id='features-catalog-studio-presentation-catalogstudiopage-text-122-uvd4ke' className="text-sm font-bold">JSON العنصر</span><Button id='features-catalog-studio-presentation-catalogstudiopage-button-123-hruioy' size="sm" variant="outline" onClick={applyItemJson}><Braces id='features-catalog-studio-presentation-catalogstudiopage-braces-124-rbpmlz' className="me-1 h-4 w-4" />تطبيق</Button></div>
                  <textarea id='features-catalog-studio-presentation-catalogstudiopage-textarea-125-crqacv' value={itemJson} onChange={(event) => setItemJson(event.target.value)} className="h-64 w-full rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-100" dir="ltr" spellCheck={false} />
                  {itemJsonError ? <p id='features-catalog-studio-presentation-catalogstudiopage-text-126-inds45' className="mt-1 text-xs text-red-600">{itemJsonError}</p> : null}
                </div>
              </div>
            ) : (
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-127-d9zaff' className="flex min-h-48 flex-col items-center justify-center text-center text-muted-foreground"><Braces id='features-catalog-studio-presentation-catalogstudiopage-braces-128-vhj2jy' className="mb-3 h-10 w-10" /><p id='features-catalog-studio-presentation-catalogstudiopage-text-129-muaqle' className="text-sm">اختر عنصرًا من العرض المنظم لفتح المحرر.</p></div>
            )}
          </aside>
        </section>
      ) : null}

      {snapshot && section === "assets" ? (
        <section id='features-catalog-studio-presentation-catalogstudiopage-section-130-ba5pf1' className="space-y-4">
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-131-q98hm3' className="grid gap-4 rounded-2xl border bg-card p-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-132-hljbfl' className="relative"><Search id='features-catalog-studio-presentation-catalogstudiopage-search-133-donnru' className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><input id='features-catalog-studio-presentation-catalogstudiopage-input-134-9xrftr' value={imageSearch} onChange={(event) => setImageSearch(event.target.value)} placeholder="بحث في مسار الصورة" className="asol-input-decorated-start w-full rounded-lg border bg-background py-2 pe-3" /></div>
            <select id='features-catalog-studio-presentation-catalogstudiopage-select-135-abnf2n' value={imageRootFilter} onChange={(event) => setImageRootFilter(event.target.value as typeof imageRootFilter)} className="rounded-lg border bg-background px-3 py-2"><option id="features-catalog-studio-presentation-catalogstudiopage-option-136-gheome" value="all">كل المجلدات</option>{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label id='features-catalog-studio-presentation-catalogstudiopage-label-137-8knteb' className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Switch id='features-catalog-studio-presentation-catalogstudiopage-switch-138-emqxzi' checked={onlyUnreferenced} onCheckedChange={setOnlyUnreferenced} /> غير المستخدمة فقط</label>
            <span id='features-catalog-studio-presentation-catalogstudiopage-text-139-18u6yo' className="self-center text-sm text-muted-foreground">{filteredImages.length} صورة</span>
          </div>
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-140-ya8jub' className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <aside id='features-catalog-studio-presentation-catalogstudiopage-aside-141-hpuckx' className="space-y-3 rounded-2xl border bg-card p-4">
              <h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-142-kawklo' className="flex items-center gap-2 font-bold"><Upload id='features-catalog-studio-presentation-catalogstudiopage-upload-143-xgfc5b' className="h-5 w-5" /> رفع أو استبدال صورة</h2>
              <select id='features-catalog-studio-presentation-catalogstudiopage-select-144-endgt5' value={uploadRoot} onChange={(event) => setUploadRoot(event.target.value as CatalogStudioImageRoot)} className="w-full rounded-lg border bg-background px-3 py-2">{Object.entries(imageRootLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <input id='features-catalog-studio-presentation-catalogstudiopage-input-145-k4h0ow' type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-2 text-sm" />
              <label id='features-catalog-studio-presentation-catalogstudiopage-label-146-l0fmtr' className="flex items-center justify-between rounded-lg border p-3 text-sm"><span id='features-catalog-studio-presentation-catalogstudiopage-text-147-dc5wfh'>استبدال إذا كان الاسم موجودًا</span><Switch id='features-catalog-studio-presentation-catalogstudiopage-switch-148-2lzy6y' checked={replaceImage} onCheckedChange={setReplaceImage} /></label>
              <p id='features-catalog-studio-presentation-catalogstudiopage-text-149-mmfiig' className="text-xs text-muted-foreground">حد أقصى 10 MB. يتم فحص توقيع PNG/JPG/WEBP. عند الاستبدال تُنشأ نسخة استعادة خارج public.</p>
            </aside>
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-150-3fpufe' className="grid max-h-[72vh] gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
        <section id='features-catalog-studio-presentation-catalogstudiopage-section-151-tq2azs' className="grid gap-4 xl:grid-cols-[1fr_460px]">
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-152-bqiytp' className="rounded-2xl border bg-card p-5">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-153-hetcgg' className="flex items-center gap-2"><History id='features-catalog-studio-presentation-catalogstudiopage-history-154-drdf2t' className="h-5 w-5" /><h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-155-ovrd9u' className="font-bold">سجل عمليات الملفات والصور</h2></div>
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-156-ylzwmx' className="mt-4 space-y-3">
              {snapshot.audit.length === 0 ? <p id='features-catalog-studio-presentation-catalogstudiopage-text-157-ttdhb6' className="text-sm text-muted-foreground">لا توجد عمليات محفوظة بعد.</p> : snapshot.audit.map((entry, index) => {
                return (
                  <div key={`${entry.at}:${index}`} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{entry.action}</span><time className="text-xs text-muted-foreground">{formatDateTimeDefault(entry.at)}</time></div>
                    <p className="mt-2 text-sm">{entry.details}</p>
                    <p className="mt-2 break-all font-mono text-xs" dir="ltr">{entry.files.join(",")}</p>
                    {entry.recoveryPath ? <p className="mt-1 break-all text-xs text-amber-700" dir="ltr">مسار الاسترجاع: {entry.recoveryPath}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
          <aside id='features-catalog-studio-presentation-catalogstudiopage-aside-158-d9brni' className="space-y-4">
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-159-dztmun' className="rounded-2xl border bg-card p-5">
              <div id='features-catalog-studio-presentation-catalogstudiopage-div-160-xxvhf9' className="flex items-center gap-2">{snapshot.validation.valid ? <CheckCircle2 id='features-catalog-studio-presentation-catalogstudiopage-checkcircle2-161-wraghv' className="h-5 w-5 text-emerald-600" /> : <ShieldAlert id='features-catalog-studio-presentation-catalogstudiopage-shieldalert-162-u7bqhd' className="h-5 w-5 text-red-600" />}<h2 id='features-catalog-studio-presentation-catalogstudiopage-heading-163-haodll' className="font-bold">التحقق الحالي</h2></div>
              <pre id="features-catalog-studio-presentation-catalogstudiopage-pre-164-jxksij" className="mt-4 max-h-[48vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100" dir="ltr">{validation?.output ?? snapshot.validation.output}</pre>
            </div>
            <div id='features-catalog-studio-presentation-catalogstudiopage-div-165-m5dkbr' className="rounded-2xl border bg-card p-5">
              <h3 id='features-catalog-studio-presentation-catalogstudiopage-heading-166-ozrpni' className="font-bold">حماية الكتابة</h3>
              <ul id='features-catalog-studio-presentation-catalogstudiopage-ul-167-mftw2w' className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li id='features-catalog-studio-presentation-catalogstudiopage-li-168-mruu8p'>• كشف تغيير الملف خارجيًا باستخدام SHA-256.</li>
                <li id='features-catalog-studio-presentation-catalogstudiopage-li-169-tp2vrx'>• تحقق كامل على نسخة staging.</li>
                <li id='features-catalog-studio-presentation-catalogstudiopage-li-170-cccpkf'>• نسخة احتياطية كاملة للملفات المتغيرة.</li>
                <li id='features-catalog-studio-presentation-catalogstudiopage-li-171-4xexjp'>• rollback تلقائي عند فشل الكتابة أو التحقق اللاحق.</li>
                <li id='features-catalog-studio-presentation-catalogstudiopage-li-172-ogv5vz'>• استعادة transaction من journal بعد انقطاع العملية.</li>
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      {changedFiles.length > 0 ? (
        <div id='features-catalog-studio-presentation-catalogstudiopage-div-173-wb59ho' className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3 shadow-xl backdrop-blur dark:border-amber-900 dark:bg-amber-950/90">
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-174-a8whwb' className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100"><AlertTriangle id='features-catalog-studio-presentation-catalogstudiopage-alerttriangle-175-fxfhfy' className="h-5 w-5" /><span id='features-catalog-studio-presentation-catalogstudiopage-text-176-myai8m'>{changedFiles.length} ملفًا في المسودة ولم تُكتب على المصدر بعد.</span></div>
          <div id='features-catalog-studio-presentation-catalogstudiopage-div-177-jxmmm0' className="flex gap-2"><Button id='features-catalog-studio-presentation-catalogstudiopage-button-178-uehvb9' variant="outline" size="sm" onClick={() => setDrafts({})}><CircleOff id='features-catalog-studio-presentation-catalogstudiopage-circleoff-179-kvoza0' className="me-1 h-4 w-4" />مسح المسودة</Button></div>
        </div>
      ) : null}
    </main>
  );
}
