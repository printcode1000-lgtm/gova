"use client";

import * as React from "react";
import { StickyNote } from "lucide-react";

interface WorkingHoursNoteCardProps {
  mode: "edit" | "preview";
  note: string;
  locale?: "ar" | "en";
  onChange?: (note: string) => void;
}

const NOTE_MAX_LENGTH = 500;

/**
 * The note that sits beside the week, in its own container.
 *
 * It is prose about the whole schedule — holidays, seasons, exceptions — not a
 * property of any one day, so it lives outside the card that pages the week
 * rather than under whichever day happens to be open.
 */
export function WorkingHoursNoteCard({ id,
  mode,
  note,
  locale = "ar",
  onChange,
}: WorkingHoursNoteCardProps & { id?: string }) {
  const isEdit = mode === "edit";
  const text = {
    title: locale === "ar" ? "ملاحظة المواعيد" : "Hours note",
    placeholder:
      locale === "ar"
        ? "مثال: المواعيد قد تختلف في العطلات."
        : "Example: hours may vary on holidays.",
  };

  if (!isEdit && !note) return null;

  return (
    <section
      id={id}
      className="min-w-0 space-y-3 rounded-xl border border-outline-variant bg-surface p-4"
    >
      <h3 className="flex min-w-0 items-center gap-2 break-words text-sm font-bold text-on-surface">
        <StickyNote className="h-5 w-5 text-primary" />
        {text.title}
      </h3>
      {isEdit ? (
        <textarea
          value={note}
          onChange={(event) =>
            onChange?.(event.target.value.slice(0, NOTE_MAX_LENGTH))
          }
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          placeholder={text.placeholder}
          aria-label={text.title}
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary"
        />
      ) : (
        <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
          {note}
        </p>
      )}
    </section>
  );
}
