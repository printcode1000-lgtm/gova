"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebookF,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { QrCode, Share2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/utils";
import { saveQrCodePng } from "@/features/qr-code";
import type { ShareContent, ShareDestination } from "./share-content";
import {
  copyShareLink,
  shareThroughSystem,
  shareToFacebook,
  shareToInstagram,
  shareToWhatsApp,
} from "./share-actions.client";
import { uiAttributes } from "@asol/ui-registry-core";

interface ShareMenuProps {
  content: ShareContent;
  locale: "ar" | "en";
  trigger: ReactNode;
}

const destinationStyles: Record<ShareDestination, string> = {
  whatsapp: "bg-[#25D366]/12 text-[#128C4A] dark:text-[#55e38a]",
  facebook: "bg-[#1877F2]/12 text-[#1877F2]",
  instagram:
    "bg-gradient-to-br from-[#833AB4]/15 via-[#E1306C]/15 to-[#FCAF45]/20 text-[#C13584]",
  system: "bg-primary/10 text-primary",
  copy: "bg-surface-container-high text-on-surface-variant",
};

export function ShareMenu({ id, content, locale, trigger }: ShareMenuProps & { id?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [savingQrCode, setSavingQrCode] = useState(false);
  const ar = locale === "ar";

  const finish = (message = "") => {
    setStatus(message);
    if (!message) setOpen(false);
  };

  const run = async (destination: ShareDestination) => {
    try {
      switch (destination) {
        case "whatsapp":
          shareToWhatsApp(content);
          finish();
          return;
        case "facebook":
          shareToFacebook(content);
          finish();
          return;
        case "instagram":
          await shareToInstagram(content);
          finish(
            ar
              ? "تم نسخ النص والرابط. الصقهما داخل Instagram."
              : "Text and link copied. Paste them in Instagram.",
          );
          return;
        case "system": {
          const result = await shareThroughSystem(content);
          if (result === "copied") {
            finish(ar ? "تم نسخ الرابط" : "Link copied");
          } else if (result === "shared") {
            finish();
          }
          return;
        }
        case "copy":
          await copyShareLink(content);
          finish(ar ? "تم نسخ الرابط" : "Link copied");
      }
    } catch (error) {
      console.warn("[Sharing] Share destination failed.", {
        destination,
        error,
      });
      setStatus(
        ar ? "تعذرت المشاركة. حاول مرة أخرى." : "Sharing failed. Try again.",
      );
    }
  };

  const saveQrCode = async () => {
    if (savingQrCode) return;
    setSavingQrCode(true);
    setStatus("");
    try {
      await saveQrCodePng({
        value: content.url,
        fileName: `asol-${content.kind}-${content.title}`,
      });
      finish(ar ? "تم إنشاء رمز QR وحفظه" : "QR code created and saved");
    } catch (error) {
      console.warn("[Sharing] QR code save failed.", error);
      setStatus(
        ar
          ? "تعذر إنشاء رمز QR أو حفظه. حاول مرة أخرى."
          : "Unable to create or save the QR code. Try again.",
      );
    } finally {
      setSavingQrCode(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setStatus("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        id={id}
        dir={ar ? "rtl" : "ltr"}
        className="fixed inset-x-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-[2rem] border-outline-variant/70 bg-surface/98 px-4 pb-[max(1.25rem,var(--asol-safe-area-bottom))] pt-5 shadow-2xl backdrop-blur-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6"
      >
        <div {...uiAttributes({ uid: "sharing.share-menu.div-fsCYT9", id: "sharing.share-menu.div" })} className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-outline-variant sm:hidden" />
        <DialogHeader ui={{ uid: "sharing.share-menu.dialog-header-h0nELO", id: "sharing.share-menu.dialog-header" }} className="text-start sm:text-start">
          <DialogTitle ui={{ uid: "sharing.share-menu.dialog-title-SRY2r2", id: "sharing.share-menu.dialog-title" }}>{ar ? "مشاركة عبر" : "Share via"}</DialogTitle>
          <DialogDescription ui={{ uid: "sharing.share-menu.dialog-description-S9CZvX", id: "sharing.share-menu.dialog-description" }}>
            {ar
              ? "اختر التطبيق الذي تريد مشاركة الرابط من خلاله"
              : "Choose where you want to share this link"}
          </DialogDescription>
        </DialogHeader>

        <div {...uiAttributes({ uid: "sharing.share-menu.div.2-iBvPs0", id: "sharing.share-menu.div.2" })} className="mt-4 flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3">
          {content.imageUrl ? (
            <div {...uiAttributes({ uid: "sharing.share-menu.div.3-ImbVP2", id: "sharing.share-menu.div.3" })} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
              <Image
                src={content.imageUrl}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ) : (
            <div {...uiAttributes({ uid: "sharing.share-menu.div.4-PsV8uf", id: "sharing.share-menu.div.4" })} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Share2 className="h-6 w-6" />
            </div>
          )}
          <div {...uiAttributes({ uid: "sharing.share-menu.div.5-puiS7j", id: "sharing.share-menu.div.5" })} className="min-w-0">
            <p {...uiAttributes({ uid: "sharing.share-menu.p-k8KJ5T", id: "sharing.share-menu.p" })} className="line-clamp-1 text-sm font-bold text-on-surface">
              {content.title}
            </p>
            <p {...uiAttributes({ uid: "sharing.share-menu.p.2-MoBLs5", id: "sharing.share-menu.p.2" })} className="mt-1 line-clamp-1 text-xs text-on-surface-variant">
              {content.text}
            </p>
          </div>
        </div>

        <div {...uiAttributes({ uid: "sharing.share-menu.div.6-CLPd9a", id: "sharing.share-menu.div.6" })} className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          <DestinationButton
            label="WhatsApp"
            destination="whatsapp"
            onClick={() => void run("whatsapp")}
          >
            <FontAwesomeIcon icon={faWhatsapp} />
          </DestinationButton>
          <DestinationButton
            label="Facebook"
            destination="facebook"
            onClick={() => void run("facebook")}
          >
            <FontAwesomeIcon icon={faFacebookF} />
          </DestinationButton>
          <DestinationButton
            label="Instagram"
            destination="instagram"
            onClick={() => void run("instagram")}
          >
            <FontAwesomeIcon icon={faInstagram} />
          </DestinationButton>
          <DestinationButton
            label={ar ? "مشاركة أخرى" : "More"}
            destination="system"
            onClick={() => void run("system")}
          >
            <Share2 />
          </DestinationButton>
        </div>

        <button {...uiAttributes({ uid: "sharing.share-menu.button-sA118d", id: "sharing.share-menu.button" })}
          type="button"
          onClick={() => void saveQrCode()}
          disabled={savingQrCode}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant/70 bg-surface-container-low px-4 text-sm font-bold text-on-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <QrCode className="h-5 w-5" />
          {savingQrCode
            ? ar
              ? "جارٍ إنشاء رمز QR..."
              : "Creating QR code..."
            : ar
              ? "إنشاء وحفظ رمز QR"
              : "Create and save QR code"}
        </button>

        <p {...uiAttributes({ uid: "sharing.share-menu.p.3-F5R9iy", id: "sharing.share-menu.p.3" })}
          role="status"
          aria-live="polite"
          className={cn(
            "min-h-5 pt-2 text-center text-xs font-semibold",
            status ? "text-primary" : "text-transparent",
          )}
        >
          {status || "."}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function DestinationButton({ id,
  children,
  destination,
  label,
  onClick,
}: {
  children: ReactNode;
  destination: ShareDestination;
  label: string;
  onClick: () => void;
} & { id?: string }) {
  return (
    <button {...uiAttributes({ uid: "sharing.share-menu.button.2-32w1CX", id: "sharing.share-menu.button.2" })} id={id}
      type="button"
      onClick={onClick}
      className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={label}
    >
      <span {...uiAttributes({ uid: "sharing.share-menu.span-61qJVX", id: "sharing.share-menu.span" })}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm transition group-active:scale-95 [&>svg]:h-6 [&>svg]:w-6",
          destinationStyles[destination],
        )}
      >
        {children}
      </span>
      <span {...uiAttributes({ uid: "sharing.share-menu.span.2-45YIiV", id: "sharing.share-menu.span.2" })} className="w-full truncate text-[11px] font-semibold text-on-surface-variant sm:text-xs">
        {label}
      </span>
    </button>
  );
}
