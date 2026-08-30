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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <section {...uiAttributes({ uid: "profile-working-hours.working-hours-card.section-TauBS9", id: "profile-working-hours.working-hours-card.section" })} id={id} className="min-w-0 space-y-4 rounded-xl border border-outline-variant bg-surface p-4">
      {!isEdit ? (
        <div {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div-7aRZUK", id: "profile-working-hours.working-hours-card.div" })} className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.2-r51kQk", id: "profile-working-hours.working-hours-card.div.2" })} className="min-w-0">
            <h3 {...uiAttributes({ uid: "profile-working-hours.working-hours-card.h3-wtoRH5", id: "profile-working-hours.working-hours-card.h3" })} className="flex min-w-0 items-center gap-2 break-words text-sm font-bold text-on-surface">
              <CalendarClock className="h-5 w-5 text-primary" />
              {text.title}
            </h3>
          </div>
          {hasAnyHours ? (
            <span {...uiAttributes({ uid: "profile-working-hours.working-hours-card.span-GkB6dD", id: "profile-working-hours.working-hours-card.span" })}
              className={`max-w-full break-words rounded-full px-3 py-1 text-xs font-semibold ${
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
        <p {...uiAttributes({ uid: "profile-working-hours.working-hours-card.p-ZZ274I", id: "profile-working-hours.working-hours-card.p" })} className="break-words text-sm text-on-surface-variant">{text.notSet}</p>
      ) : null}

      <CategoryTabsStrip
        level="sub"
        items={value.days.map((day) => ({
          id: day.day,
          label: getWorkingHoursDayLabel(day.day, locale),
          count: day.open ? day.periods.length : undefined,
        }))}
        selectedId={selectedDayId}
        itemUi={{ uid: "profile-working-hours.day-tab-5Kt9RM", id: "profile-working-hours.day-tab", kind: "item" }}
        onSelect={(dayId) => setSelectedDayId(dayId as WorkingDayId)}
      />

      <div {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.3-TqKZR6", id: "profile-working-hours.working-hours-card.div.3" })} className="min-w-0 space-y-3">
        {visibleDays.map((day) => (
          <div
            key={day.day} {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.4-CF7vDv", id: "profile-working-hours.working-hours-card.div.4" })}
            className="min-w-0 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3"
          >
            <div {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.5-B9f93l", id: "profile-working-hours.working-hours-card.div.5" })} className="flex flex-wrap items-center justify-between gap-2">
              <p {...uiAttributes({ uid: "profile-working-hours.working-hours-card.p.2-A1pIRm", id: "profile-working-hours.working-hours-card.p.2" })} className="min-w-0 break-words text-sm font-semibold text-on-surface">
                {getWorkingHoursDayLabel(day.day, locale)}
              </p>
              {isEdit ? (
                <label {...uiAttributes({ uid: "profile-working-hours.working-hours-card.label-MmH3Wp", id: "profile-working-hours.working-hours-card.label" })} className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
                  <input {...uiAttributes({ uid: "profile-working-hours.working-hours-card.input-IS4zBK", id: "profile-working-hours.working-hours-card.input" })}
                    type="checkbox"
                    checked={day.open}
                    onChange={(event) => toggleDay(day.day, event.target.checked)}
                  />
                  {day.open ? text.open : text.closed}
                </label>
              ) : (
                <span {...uiAttributes({ uid: "profile-working-hours.working-hours-card.span.2-mE1JF1", id: "profile-working-hours.working-hours-card.span.2" })} className="min-w-0 break-words text-xs text-on-surface-variant">
                  {day.open ? text.open : text.closed}
                </span>
              )}
            </div>

            {day.open ? (
              <div {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.6-QA4w5S", id: "profile-working-hours.working-hours-card.div.6" })} className="mt-3 min-w-0 space-y-2">
                {day.periods.map((period, index) => (
                  <div
                    key={period.id} {...uiAttributes({ uid: "profile-working-hours.working-hours-card.div.7-Et5aQk", id: "profile-working-hours.working-hours-card.div.7" })}
                    className="grid min-w-0 items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    {isEdit ? (
                      <>
                        <label {...uiAttributes({ uid: "profile-working-hours.working-hours-card.label.2-SWC3aw", id: "profile-working-hours.working-hours-card.label.2" })} className="space-y-1 text-xs text-on-surface-variant">
                          <span {...uiAttributes({ uid: "profile-working-hours.working-hours-card.span.3-C1q1Tk", id: "profile-working-hours.working-hours-card.span.3" })}>{text.from}</span>
                          <input {...uiAttributes({ uid: "profile-working-hours.working-hours-card.input.2-CP71CY", id: "profile-working-hours.working-hours-card.input.2" })}
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
                        <label {...uiAttributes({ uid: "profile-working-hours.working-hours-card.label.3-TFl62x", id: "profile-working-hours.working-hours-card.label.3" })} className="space-y-1 text-xs text-on-surface-variant">
                          <span {...uiAttributes({ uid: "profile-working-hours.working-hours-card.span.4-heHN7B", id: "profile-working-hours.working-hours-card.span.4" })}>{text.to}</span>
                          <input {...uiAttributes({ uid: "profile-working-hours.working-hours-card.input.3-YRiv2k", id: "profile-working-hours.working-hours-card.input.3" })}
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
                        <button {...uiAttributes({ uid: "profile-working-hours.working-hours-card.button-r23NiD", id: "profile-working-hours.working-hours-card.button" })}
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
                      <p {...uiAttributes({ uid: "profile-working-hours.working-hours-card.p.3-M2sVeU", id: "profile-working-hours.working-hours-card.p.3" })} className="min-w-0 break-words text-xs text-on-surface-variant">
                        {period.start} - {period.end}
                      </p>
                    )}
                  </div>
                ))}
                {isEdit && day.periods.length < 4 ? (
                  <button {...uiAttributes({ uid: "profile-working-hours.working-hours-card.button.2-H4wEwx", id: "profile-working-hours.working-hours-card.button.2" })}
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

    </section>
  );
}
