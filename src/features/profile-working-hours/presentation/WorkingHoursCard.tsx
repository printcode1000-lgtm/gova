"use client";

import * as React from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";

import type {
  ProfileWorkingHours,
  WorkingDayId,
  WorkingHoursDay,
  WorkingHoursPeriod,
} from "@/features/profile-working-hours";
import {
  createDefaultWorkingPeriod,
  currentWorkingDayId,
  getCurrentWorkingHoursStatus,
  getWorkingHoursDayLabel,
  hasWorkingHours,
} from "@/features/profile-working-hours";
import { CategoryTabsStrip } from "@/shared/ui/category-tabs-strip";

interface WorkingHoursCardProps {
  mode: "edit" | "preview";
  value: ProfileWorkingHours;
  locale?: "ar" | "en";
  onChange?: (value: ProfileWorkingHours) => void;
}

function updateDay(
  value: ProfileWorkingHours,
  dayId: WorkingDayId,
  updater: (day: WorkingHoursDay) => WorkingHoursDay,
): ProfileWorkingHours {
  return {
    ...value,
    days: value.days.map((day) => (day.day === dayId ? updater(day) : day)),
  };
}

function createNextWorkingPeriod(
  dayId: WorkingDayId,
  periods: WorkingHoursPeriod[],
): WorkingHoursPeriod {
  let index = 0;
  const usedIds = new Set(periods.map((period) => period.id));
  while (usedIds.has(`${dayId}-${index + 1}`)) index += 1;
  return createDefaultWorkingPeriod(dayId, index);
}

export function WorkingHoursCard({ id,
  mode,
  value,
  locale = "ar",
  onChange,
}: WorkingHoursCardProps & { id?: string }) {
  const isEdit = mode === "edit";
  const text = {
    title: locale === "ar" ? "مواعيد العمل" : "Working hours",
    open: locale === "ar" ? "مفتوح" : "Open",
    closed: locale === "ar" ? "مغلق" : "Closed",
    openNow: locale === "ar" ? "مفتوح الآن" : "Open now",
    closedNow: locale === "ar" ? "مغلق الآن" : "Closed now",
    notSet: locale === "ar" ? "لم يتم تحديد مواعيد العمل." : "Working hours are not set.",
    addPeriod: locale === "ar" ? "إضافة فترة" : "Add period",
    note: locale === "ar" ? "ملاحظة" : "Note",
    notePlaceholder:
      locale === "ar"
        ? "مثال: المواعيد قد تختلف في العطلات."
        : "Example: hours may vary on holidays.",
    from: locale === "ar" ? "من" : "From",
    to: locale === "ar" ? "إلى" : "To",
  };
  const currentStatus = getCurrentWorkingHoursStatus(value);
  const hasAnyHours = hasWorkingHours(value);

  // The week is one day at a time on both sides of the card: the seven days are
  // a tab strip, and today is the day already selected — the day an owner comes
  // to fix and the day a visitor is asking about.
  const [selectedDayId, setSelectedDayId] = React.useState<WorkingDayId>(() =>
    currentWorkingDayId(),
  );
  const visibleDays = value.days.filter((day) => day.day === selectedDayId);

  const setValue = (next: ProfileWorkingHours) => onChange?.(next);

  const toggleDay = (dayId: WorkingDayId, open: boolean) => {
    setValue(
      updateDay(value, dayId, (day) => ({
        ...day,
        open,
        periods:
          open && day.periods.length === 0
            ? [createNextWorkingPeriod(dayId, day.periods)]
            : day.periods,
      })),
    );
  };

  if (!isEdit && !hasAnyHours) return null;

  return (
    <section id={id} className="space-y-4 rounded-xl border border-outline-variant bg-surface p-4">
      {!isEdit ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <CalendarClock className="h-5 w-5 text-primary" />
              {text.title}
            </h3>
          </div>
          {hasAnyHours ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                currentStatus === "open"
                  ? "bg-success/15 text-success"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {currentStatus === "open" ? text.openNow : text.closedNow}
            </span>
          ) : null}
        </div>
      ) : null}

      {!isEdit && !hasAnyHours ? (
        <p className="text-sm text-on-surface-variant">{text.notSet}</p>
      ) : null}

      <CategoryTabsStrip
        level="sub"
        items={value.days.map((day) => ({
          id: day.day,
          label: getWorkingHoursDayLabel(day.day, locale),
          count: day.open ? day.periods.length : undefined,
        }))}
        selectedId={selectedDayId}
        onSelect={(dayId) => setSelectedDayId(dayId as WorkingDayId)}
      />

      <div className="space-y-3">
        {visibleDays.map((day) => (
          <div
            key={day.day}
            className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-on-surface">
                {getWorkingHoursDayLabel(day.day, locale)}
              </p>
              {isEdit ? (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(event) => toggleDay(day.day, event.target.checked)}
                  />
                  {day.open ? text.open : text.closed}
                </label>
              ) : (
                <span className="text-xs text-on-surface-variant">
                  {day.open ? text.open : text.closed}
                </span>
              )}
            </div>

            {day.open ? (
              <div className="mt-3 space-y-2">
                {day.periods.map((period, index) => (
                  <div
                    key={period.id}
                    className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    {isEdit ? (
                      <>
                        <label className="space-y-1 text-xs text-on-surface-variant">
                          <span>{text.from}</span>
                          <input
                            type="time"
                            value={period.start}
                            onChange={(event) =>
                              setValue(
                                updateDay(value, day.day, (current) => ({
                                  ...current,
                                  periods: current.periods.map((item) =>
                                    item.id === period.id
                                      ? { ...item, start: event.target.value }
                                      : item,
                                  ),
                                })),
                              )
                            }
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface"
                          />
                        </label>
                        <label className="space-y-1 text-xs text-on-surface-variant">
                          <span>{text.to}</span>
                          <input
                            type="time"
                            value={period.end}
                            onChange={(event) =>
                              setValue(
                                updateDay(value, day.day, (current) => ({
                                  ...current,
                                  periods: current.periods.map((item) =>
                                    item.id === period.id
                                      ? { ...item, end: event.target.value }
                                      : item,
                                  ),
                                })),
                              )
                            }
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setValue(
                              updateDay(value, day.day, (current) => ({
                                ...current,
                                periods: current.periods.filter(
                                  (item) => item.id !== period.id,
                                ),
                                open: current.periods.length > 1,
                              })),
                            )
                          }
                          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-outline-variant px-3 text-destructive transition sm:mt-0"
                          aria-label="Remove period"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-on-surface-variant">
                        {period.start} - {period.end}
                      </p>
                    )}
                  </div>
                ))}
                {isEdit && day.periods.length < 4 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        updateDay(value, day.day, (current) => ({
                          ...current,
                          open: true,
                          periods: [
                            ...current.periods,
                            createNextWorkingPeriod(day.day, current.periods),
                          ],
                        })),
                      )
                    }
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition"
                  >
                    <Plus className="h-4 w-4" />
                    {text.addPeriod}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {isEdit ? (
        <label className="block space-y-2 text-xs text-on-surface-variant">
          <span>{text.note}</span>
          <textarea
            value={value.note}
            onChange={(event) => setValue({ ...value, note: event.target.value.slice(0, 500) })}
            rows={3}
            maxLength={500}
            placeholder={text.notePlaceholder}
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary"
          />
        </label>
      ) : value.note ? (
        <p className="rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
          {value.note}
        </p>
      ) : null}
    </section>
  );
}
