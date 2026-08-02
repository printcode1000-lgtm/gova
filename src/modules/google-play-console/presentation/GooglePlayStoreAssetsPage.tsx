"use client";

import * as React from "react";
import { Image as ImageIcon, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { useBuildJobs } from "@/modules/release-commands/hooks/use-build-jobs";
import type { BuildCommandCatalogEntry } from "@/modules/release-commands/domain/build-command-catalog";

import { GOOGLE_PLAY_STORE_ASSETS_API } from "../config";
import { validateGooglePlayImage } from "../domain/image-validation";
import type {
  GooglePlayImageType,
  GooglePlayStoreAssetsMutationResult,
  GooglePlayStoreAssetsSnapshot,
  GooglePlayStoreListing,
} from "../domain/store-assets-types";
import { BuildPublishTab } from "./BuildPublishTab";
import { ImagesTab } from "./ImagesTab";
import { JobsLogTab } from "./JobsLogTab";
import { OverviewTab } from "./OverviewTab";
import { TextListingsTab } from "./TextListingsTab";

export function GooglePlayStoreAssetsPage() {
  const { t, isRTL } = useTranslation();
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const authHeaders = React.useMemo(
    () => (session?.sessionToken ? { "x-asol-session-token": session.sessionToken } : undefined),
    [session?.sessionToken],
  );
  const jobs = useBuildJobs(authHeaders);
  const [snapshot, setSnapshot] = React.useState<GooglePlayStoreAssetsSnapshot | null>(null);
  const [details, setDetails] = React.useState<GooglePlayStoreAssetsSnapshot["details"]>({});
  const [listings, setListings] = React.useState<GooglePlayStoreListing[]>([]);
  const [language, setLanguage] = React.useState("ar");
  const [imageType, setImageType] = React.useState<GooglePlayImageType>("icon");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");

  const applySnapshot = React.useCallback((next: GooglePlayStoreAssetsSnapshot) => {
    setSnapshot(next);
    setDetails(next.details);
    setListings(next.listings.length ? next.listings : [{ language: next.defaultLanguage || "ar" }]);
    setLanguage(next.defaultLanguage || "ar");
    setAcknowledged(false);
  }, []);

  const load = React.useCallback(async () => {
    if (!authHeaders || !allowedUser) return;
    setBusy("load");
    setError("");
    try {
      applySnapshot(await asolApi.get<GooglePlayStoreAssetsSnapshot>(GOOGLE_PLAY_STORE_ASSETS_API.snapshot, { headers: authHeaders, cache: "no-store" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("releaseConsole.errors.load"));
    } finally {
      setBusy("");
    }
  }, [allowedUser, applySnapshot, authHeaders, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveText() {
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
      setNotice(t("releaseConsole.notices.saved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("releaseConsole.errors.save"));
    } finally {
      setBusy("");
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!authHeaders || !files?.length) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      for (const file of Array.from(files)) {
        const dimensions = await browserImageDimensions(file);
        const validation = validateGooglePlayImage({
          imageType,
          contentType: file.type,
          size: file.size,
          dimensions,
          existingCount: snapshot?.images.find((group) => group.language === language && group.imageType === imageType)?.images.length ?? 0,
        });
        if (!validation.ok) throw new Error(validation.message);
        const form = new FormData();
        form.set("language", language);
        form.set("imageType", imageType);
        form.set("file", file);
        const result = await asolApi.postForm<GooglePlayStoreAssetsMutationResult>(GOOGLE_PLAY_STORE_ASSETS_API.uploadImage, form, { headers: authHeaders });
        applySnapshot(result.snapshot);
      }
      setNotice(t("releaseConsole.notices.uploaded"));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("releaseConsole.errors.upload"));
    } finally {
      setBusy("");
    }
  }

  async function deleteImage(imageId: string, nextLanguage: string, nextType: GooglePlayImageType) {
    if (!authHeaders || !window.confirm(t("releaseConsole.confirm.deleteImage"))) return;
    const result = await asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.deleteImage,
      { imageId, language: nextLanguage, imageType: nextType },
      { headers: authHeaders },
    );
    applySnapshot(result.snapshot);
    setNotice(t("releaseConsole.notices.deleted"));
  }

  async function deleteListing(nextLanguage: string) {
    if (!authHeaders || !nextLanguage || !window.confirm(t("releaseConsole.confirm.deleteListing"))) return;
    const result = await asolApi.post<GooglePlayStoreAssetsMutationResult>(
      GOOGLE_PLAY_STORE_ASSETS_API.deleteListing,
      { language: nextLanguage },
      { headers: authHeaders },
    );
    applySnapshot(result.snapshot);
  }

  async function startCommand(command: BuildCommandCatalogEntry) {
    try {
      await jobs.start({ commandId: command.id, confirmationPhrase: confirmation });
      setNotice(t("releaseConsole.notices.jobStarted"));
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : t("releaseConsole.errors.job"));
    }
  }

  if (isLoading) return <main className="p-4 text-sm text-on-surface-variant">{t("releaseConsole.loading")}</main>;
  if (!allowedUser) {
    return (
      <main className="mx-auto max-w-2xl p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="rounded-md border bg-muted p-4 text-on-surface-variant">{t("releaseConsole.forbidden")}</div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ImageIcon className="h-6 w-6 text-primary" />
            {t("releaseConsole.title")}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t("releaseConsole.subtitle")}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy === "load"}>
          <RefreshCw className="h-4 w-4" />
          {t("releaseConsole.actions.refresh")}
        </Button>
      </header>

      {error ? <section className="rounded-md border bg-muted p-3 text-sm text-on-surface-variant">{error}</section> : null}
      {notice ? <section className="rounded-md border bg-muted p-3 text-sm text-on-surface-variant">{notice}</section> : null}

      {snapshot ? (
        <Tabs defaultValue="overview" className="space-y-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="overview">{t("releaseConsole.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="text">{t("releaseConsole.tabs.text")}</TabsTrigger>
            <TabsTrigger value="images">{t("releaseConsole.tabs.images")}</TabsTrigger>
            <TabsTrigger value="build">{t("releaseConsole.tabs.build")}</TabsTrigger>
            <TabsTrigger value="jobs">{t("releaseConsole.tabs.jobs")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab snapshot={snapshot} t={t} /></TabsContent>
          <TabsContent value="text">
            <TextListingsTab snapshot={snapshot} details={details} listings={listings} acknowledged={acknowledged} busy={busy} t={t} onDetailsChange={setDetails} onListingsChange={setListings} onAcknowledgeChange={setAcknowledged} onSave={() => void saveText()} onDeleteListing={(value) => void deleteListing(value)} />
          </TabsContent>
          <TabsContent value="images">
            <ImagesTab snapshot={snapshot} language={language} imageType={imageType} busy={busy} t={t} onLanguageChange={setLanguage} onImageTypeChange={setImageType} onFiles={(files) => void uploadFiles(files)} onDeleteImage={(id, nextLanguage, nextType) => void deleteImage(id, nextLanguage, nextType)} />
          </TabsContent>
          <TabsContent value="build">
            <BuildPublishTab catalog={jobs.catalog} confirmation={confirmation} t={t} onConfirmationChange={setConfirmation} onStart={(command) => void startCommand(command)} />
          </TabsContent>
          <TabsContent value="jobs">
            <JobsLogTab jobs={jobs.jobs} selectedJobId={jobs.selectedJobId} log={jobs.log} t={t} onSelect={jobs.setSelectedJobId} onCancel={(job) => void jobs.cancel(job)} />
          </TabsContent>
        </Tabs>
      ) : null}
    </main>
  );
}

function browserImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("releaseConsole.errors.imageDimensions"));
    };
    image.src = url;
  });
}
