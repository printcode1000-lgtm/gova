"use client";

import * as React from "react";
import { ImagePlus, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { StorageImageManager } from "@/features/storage/components/StorageImageManager";

export interface CustomRequestSubmitInput {
  title: string;
  description: string;
  images: StoredImage[];
}

interface ProfileCustomRequestButtonProps {
  onSubmit: (input: CustomRequestSubmitInput) => Promise<void>;
  title?: string;
  description?: string;
  buttonLabel?: string;
  disabled?: boolean;
}

export function ProfileCustomRequestButton({
  onSubmit,
  title = "إرسال طلب خاص",
  description = "اكتب وصف الطلب ويمكنك إضافة حتى 4 صور. الصور اختيارية.",
  buttonLabel = "طلب خاص",
  disabled = false,
}: ProfileCustomRequestButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [requestTitle, setRequestTitle] = React.useState("");
  const [requestDescription, setRequestDescription] = React.useState("");
  const [images, setImages] = React.useState<StoredImage[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const canSubmit = requestDescription.trim().length > 0 || images.length > 0;

  const submit = async () => {
    if (!canSubmit) {
      setError("اكتب وصف الطلب أو أضف صورة واحدة على الأقل.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        title: requestTitle.trim() || "طلب خاص",
        description: requestDescription.trim(),
        images,
      });
      setRequestTitle("");
      setRequestDescription("");
      setImages([]);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال الطلب الخاص.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled} className="gap-2">
          <ImagePlus className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="custom-request-title">
              عنوان الطلب
            </label>
            <Input
              id="custom-request-title"
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder="مثال: أحتاج خدمة خاصة"
              maxLength={120}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="custom-request-description">
              وصف الطلب
            </label>
            <Textarea
              id="custom-request-description"
              value={requestDescription}
              onChange={(event) => setRequestDescription(event.target.value)}
              placeholder="اكتب تفاصيل الطلب المطلوب..."
              rows={5}
              maxLength={1200}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">الصور</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <StorageImageManager
                  key={index}
                  config={{
                    id: `special-order-image-${index + 1}`,
                    storageProfileId: StorageProfiles.SpicialOrder,
                    storageScope: "custom-request",
                    maxItems: 1,
                    aspectRatio: "square",
                    allowReplace: true,
                    confirmUpload: false,
                    confirmRemove: true,
                    deleteFromStorageOnRemove: true,
                  }}
                  value={images[index] ? [images[index]] : []}
                  onChange={(slot) => {
                    const next = [...images];
                    if (slot[0]) next[index] = slot[0];
                    else next.splice(index, 1);
                    setImages(next.filter(Boolean).slice(0, 4));
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !canSubmit}
            className="gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إرسال الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
