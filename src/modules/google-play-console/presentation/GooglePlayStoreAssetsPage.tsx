"use client";

import * as React from "react";
import {
  Box,
  FileArchive,
  Image as ImageIcon,
  Play,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { GOOGLE_PLAY_STORE_ASSETS_API } from "../config";
import {
  GOOGLE_PLAY_IMAGE_TYPES,
  type GooglePlayFastlaneAction,
  type GooglePlayFastlaneResult,
  type GooglePlayImageType,
  type GooglePlayStoreAssetsMutationResult,
  type GooglePlayStoreAssetsSnapshot,
  type GooglePlayStoreListing,
} from "../domain/store-assets-types";

const IMAGE_TYPE_LABELS: Record<GooglePlayImageType, string> = {
  icon: "أيقونة التطبيق",
  featureGraphic: "الصورة الترويجية",
  phoneScreenshots: "لقطات الهاتف",
  sevenInchScreenshots: "لقطات 7 بوصة",
  tenInchScreenshots: "لقطات 10 بوصة",
  tvBanner: "بانر TV",
  tvScreenshots: "لقطات TV",
  wearScreenshots: "لقطات Wear",
};

const FASTLANE_ACTIONS: Array<{
  action: GooglePlayFastlaneAction;
  label: string;
  icon: React.ReactNode;
  dangerous?: boolean;
}> = [
  { action: "aabSigned", label: "إنشاء AAB موقع", icon: <FileArchive className="h-4 w-4" /> },
  { action: "aabUnsigned", label: "إنشاء AAB غير موقع", icon: <FileArchive className="h-4 w-4" /> },
  { action: "apkSigned", label: "إنشاء APK موقع", icon: <Box className="h-4 w-4" /> },
  { action: "apkUnsigned", label: "إنشاء APK غير موقع", icon: <Box className="h-4 w-4" /> },
  { action: "publishInternal", label: "نشر على internal", icon: <Send className="h-4 w-4" /> },
  { action: "publishProduction", label: "نشر على production", icon: <Send className="h-4 w-4" />, dangerous: true },
];

function dateText(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

export function GooglePlayStoreAssetsPage() {
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const [snapshot, setSnapshot] = React.useState<GooglePlayStoreAssetsSnapshot | null>(null);
  const [details, setDetails] = React.useState<GooglePlayStoreAssetsSnapshot["details"]>({});
  const [listings, setListings] = React.useState<GooglePlayStoreListing[]>([]);
  const [language, setLanguage] = React.useState("ar");
  const [imageType, setImageType] = React.useState<GooglePlayImageType>("icon");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [fastlaneResult, setFastlaneResult] = React.useState<GooglePlayFastlaneResult | null>(null);

  const authHeaders = React.useMemo(
    () => (session?.sessionToken ? { "x-asol-session-token": session.sessionToken } : undefined),
    [session?.sessionToken],
  );

  const applySnapshot = React.useCallback((next: GooglePlayStoreAssetsSnapshot) => {
    setSnapshot(next);
    setDetails(next.details);
    setListings(next.listings.length ? next.listings : [{ language: next.defaultLanguage || "ar" }]);
    setLanguage(next.defaultLanguage || "ar");
  }, []);

  const load = React.useCallback(async () => {
    if (!authHeaders || !allowedUser) return;
    setBusy("load");
    setError("");
    try {
      applySnapshot(
        await asolApi.get<GooglePlayStoreAssetsSnapshot>(
          GOOGLE_PLAY_STORE_ASSETS_API.snapshot,
          { headers: authHeaders, cache: "no-store" },
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل بيانات المتجر");
    } finally {
      setBusy("");
    }
  }, [allowedUser, applySnapshot, authHeaders]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveText = async () => {
    if (!authHeaders) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const result = await asolApi.put<GooglePlayStoreAssetsMutationResult>(
        GOOGLE_PLAY_STORE_ASSETS_API.snapshot,
        { details, listings },
        { headers: authHeaders },
      );
      applySnapshot(result.snapshot);
      setNotice(`تم حفظ النصوص. نسخة احتياطية: ${result.backupFile ?? "-"}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ النصوص");
    } finally {
      setBusy("");
    }
  };

  const uploadImage = async () => {
    if (!authHeaders || !file) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("language", language);
      form.set("imageType", imageType);
      form.set("file", file);
      const result = await asolApi.postForm<GooglePlayStoreAssetsMutationResult>(
        GOOGLE_PLAY_STORE_ASSETS_API.uploadImage,
        form,
        { headers: authHeaders },
      );
      applySnapshot(result.snapshot);
      setFile(null);
      setNotice("تم رفع الصورة واعتمادها في Google Play.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصورة");
    } finally {
      setBusy("");
    }
  };

  const deleteImage = async (imageId: string, nextLanguage: string, nextType: GooglePlayImageType) => {
    if (!authHeaders) return;
    if (!window.confirm("سيتم حذف هذه الصورة من Google Play. هل تريد المتابعة؟")) return;
    setBusy(`delete:${imageId}`);
    setError("");
    setNotice("");
    try {
      const result = await asolApi.post<GooglePlayStoreAssetsMutationResult>(
        GOOGLE_PLAY_STORE_ASSETS_API.deleteImage,
        { imageId, language: nextLanguage, imageType: nextType },
        { headers: authHeaders },
      );
      applySnapshot(result.snapshot);
      setNotice("تم حذف الصورة من Google Play.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف الصورة");
    } finally {
      setBusy("");
    }
  };

  const runFastlane = async (action: GooglePlayFastlaneAction, dangerous?: boolean) => {
    if (!authHeaders) return;
    const confirmation = dangerous
      ? window.prompt("للنشر على production اكتب PUBLISH_PRODUCTION")
      : "";
    if (dangerous && confirmation !== "PUBLISH_PRODUCTION") return;
    setBusy(`fastlane:${action}`);
    setError("");
    setNotice("");
    setFastlaneResult(null);
    try {
      const result = await asolApi.post<GooglePlayFastlaneResult>(
        GOOGLE_PLAY_STORE_ASSETS_API.fastlane,
        { action, confirmation },
        { headers: authHeaders },
      );
      setFastlaneResult(result);
      setNotice(result.ok ? "انتهى الأمر بنجاح." : "انتهى الأمر بخطأ. راجع المخرجات.");
    } catch (fastlaneError) {
      setError(fastlaneError instanceof Error ? fastlaneError.message : "تعذر تشغيل الأمر");
    } finally {
      setBusy("");
    }
  };

  if (isLoading) return <main className="p-4 text-sm text-on-surface-variant">جاري التحميل...</main>;
  if (!allowedUser) {
    return (
      <main className="mx-auto max-w-2xl p-6" dir="rtl">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ImageIcon className="h-6 w-6 text-primary" />
            بيانات متجر Google Play
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            تعديل النصوص والصور وتشغيل بناء ونشر Android من بيئة التطوير فقط.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy === "load"}>
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </header>

      {error ? <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</section> : null}
      {notice ? <section className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</section> : null}

      {snapshot ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Info label="الحزمة" value={snapshot.packageName} />
            <Info label="اللغة الافتراضية" value={snapshot.defaultLanguage} />
            <Info label="آخر قراءة" value={dateText(snapshot.fetchedAt)} />
            <Info label="الصور المقروءة" value={String(snapshot.images.reduce((sum, group) => sum + group.images.length, 0))} />
          </section>

          <section className="rounded-md border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Save className="h-5 w-5 text-primary" />
              النصوص والروابط
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="الموقع" value={details.contactWebsite ?? ""} onChange={(value) => setDetails({ ...details, contactWebsite: value })} />
              <Field label="البريد" value={details.contactEmail ?? ""} onChange={(value) => setDetails({ ...details, contactEmail: value })} />
              <Field label="الهاتف" value={details.contactPhone ?? ""} onChange={(value) => setDetails({ ...details, contactPhone: value })} />
              <Field label="اللغة الافتراضية" value={details.defaultLanguage ?? ""} onChange={(value) => setDetails({ ...details, defaultLanguage: value })} />
            </div>
            <div className="mt-4 space-y-3">
              {listings.map((listing, index) => (
                <div key={`${listing.language}:${index}`} className="rounded-md border bg-muted p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="اللغة" value={listing.language} onChange={(value) => updateListing(index, { language: value }, listings, setListings)} />
                    <Field label="اسم التطبيق" value={listing.title ?? ""} onChange={(value) => updateListing(index, { title: value }, listings, setListings)} />
                    <Field label="الوصف المختصر" value={listing.shortDescription ?? ""} onChange={(value) => updateListing(index, { shortDescription: value }, listings, setListings)} />
                    <Field label="رابط الفيديو" value={listing.video ?? ""} onChange={(value) => updateListing(index, { video: value }, listings, setListings)} />
                  </div>
                  <label className="mt-3 block text-xs text-on-surface-variant">الوصف الكامل</label>
                  <textarea
                    value={listing.fullDescription ?? ""}
                    onChange={(event) => updateListing(index, { fullDescription: event.target.value }, listings, setListings)}
                    className="mt-1 min-h-36 w-full rounded-md border bg-background p-3 text-sm"
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setListings([...listings, { language: "en-US" }])}>
                  إضافة لغة
                </Button>
                <Button type="button" onClick={() => void saveText()} disabled={busy === "save"}>
                  <Save className="h-4 w-4" />
                  {busy === "save" ? "جاري الحفظ" : "حفظ النصوص"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-md border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Upload className="h-5 w-5 text-primary" />
              رفع الصور والأيقونة ولقطات الشاشة
            </div>
            <div className="grid gap-3 md:grid-cols-[160px_220px_1fr_auto]">
              <Input value={language} onChange={(event) => setLanguage(event.target.value)} />
              <select value={imageType} onChange={(event) => setImageType(event.target.value as GooglePlayImageType)} className="h-10 rounded-md border bg-background px-3 text-sm">
                {GOOGLE_PLAY_IMAGE_TYPES.map((type) => <option key={type} value={type}>{IMAGE_TYPE_LABELS[type]}</option>)}
              </select>
              <Input type="file" accept="image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <Button type="button" onClick={() => void uploadImage()} disabled={!file || busy === "upload"}>
                <Upload className="h-4 w-4" />
                رفع
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {snapshot.images.map((group) => (
                <div key={`${group.language}:${group.imageType}`} className="rounded-md border bg-muted p-3">
                  <div className="mb-2 text-sm font-semibold">
                    {group.language} - {IMAGE_TYPE_LABELS[group.imageType]}
                  </div>
                  {group.error ? <div className="text-xs text-amber-700">{group.error}</div> : null}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.images.map((image) => (
                      <div key={image.id} className="overflow-hidden rounded-md border bg-background">
                        <img src={image.url} alt={image.id} className="h-28 w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => void deleteImage(image.id, group.language, group.imageType)}
                          className="flex w-full items-center justify-center gap-1 border-t px-2 py-1 text-xs text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف
                        </button>
                      </div>
                    ))}
                    {!group.images.length ? <div className="text-xs text-on-surface-variant">لا توجد صور</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Play className="h-5 w-5 text-primary" />
              البناء والنشر
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {FASTLANE_ACTIONS.map((item) => (
                <Button
                  key={item.action}
                  type="button"
                  variant={item.dangerous ? "destructive" : "outline"}
                  onClick={() => void runFastlane(item.action, item.dangerous)}
                  disabled={busy === `fastlane:${item.action}`}
                >
                  {item.icon}
                  {busy === `fastlane:${item.action}` ? "جاري التنفيذ" : item.label}
                </Button>
              ))}
            </div>
            {fastlaneResult ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
                {JSON.stringify(fastlaneResult, null, 2)}
              </pre>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1" />
    </label>
  );
}

function updateListing(
  index: number,
  patch: Partial<GooglePlayStoreListing>,
  listings: GooglePlayStoreListing[],
  setListings: React.Dispatch<React.SetStateAction<GooglePlayStoreListing[]>>,
) {
  setListings(
    listings.map((listing, listingIndex) =>
      listingIndex === index ? { ...listing, ...patch } : listing,
    ),
  );
}
