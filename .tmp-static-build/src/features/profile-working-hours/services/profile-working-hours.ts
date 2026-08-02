import type {
  ProfileWorkingHours,
  WorkingDayId,
  WorkingDayLabel,
  WorkingHoursDay,
  WorkingHoursPeriod,
} from "../entities/profile-working-hours.types";

export const WORKING_DAY_LABELS: WorkingDayLabel[] = [
  { id: "saturday", ar: "السبت", en: "Saturday" },
  { id: "sunday", ar: "الأحد", en: "Sunday" },
  { id: "monday", ar: "الاثنين", en: "Monday" },
  { id: "tuesday", ar: "الثلاثاء", en: "Tuesday" },
  { id: "wednesday", ar: "الأربعاء", en: "Wednesday" },
  { id: "thursday", ar: "الخميس", en: "Thursday" },
  { id: "friday", ar: "الجمعة", en: "Friday" },
];

const DAY_IDS = new Set<WorkingDayId>(WORKING_DAY_LABELS.map((day) => day.id));
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const EMPTY_PROFILE_WORKING_HOURS: ProfileWorkingHours = {
  timezone: "Africa/Cairo",
  note: "",
  days: WORKING_DAY_LABELS.map((day) => ({
    day: day.id,
    open: false,
    periods: [],
  })),
};

function isDayId(value: unknown): value is WorkingDayId {
  return typeof value === "string" && DAY_IDS.has(value as WorkingDayId);
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanTime(value: unknown): string {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : "";
}

function makePeriodId(day: WorkingDayId, index: number): string {
  return `${day}-${index + 1}`;
}

export function createDefaultWorkingPeriod(
  day: WorkingDayId,
  index = 0,
): WorkingHoursPeriod {
  return {
    id: makePeriodId(day, index),
    start: "09:00",
    end: "17:00",
  };
}

export function normalizeProfileWorkingHours(
  value: unknown,
): ProfileWorkingHours {
  if (!value || typeof value !== "object") return EMPTY_PROFILE_WORKING_HOURS;
  const input = value as Partial<ProfileWorkingHours>;
  const inputDays = Array.isArray(input.days) ? input.days : [];
  const byDay = new Map<WorkingDayId, WorkingHoursDay>();

  inputDays.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const dayInput = item as Partial<WorkingHoursDay>;
    if (!isDayId(dayInput.day)) return;
    const periods = Array.isArray(dayInput.periods)
      ? dayInput.periods
          .map((period, index) => {
            const row = period as Partial<WorkingHoursPeriod>;
            const start = cleanTime(row.start);
            const end = cleanTime(row.end);
            if (!start || !end || start >= end) return null;
            return {
              id: cleanText(row.id, 60) || makePeriodId(dayInput.day!, index),
              start,
              end,
            };
          })
          .filter((period): period is WorkingHoursPeriod => Boolean(period))
          .slice(0, 4)
      : [];
    byDay.set(dayInput.day, {
      day: dayInput.day,
      open: dayInput.open === true && periods.length > 0,
      periods,
    });
  });

  return {
    timezone: cleanText(input.timezone, 80) || EMPTY_PROFILE_WORKING_HOURS.timezone,
    note: cleanText(input.note, 500),
    days: WORKING_DAY_LABELS.map(
      (day) =>
        byDay.get(day.id) ?? {
          day: day.id,
          open: false,
          periods: [],
        },
    ),
  };
}

export function hasWorkingHours(value: ProfileWorkingHours): boolean {
  return value.days.some((day) => day.open && day.periods.length > 0);
}

export function getWorkingHoursDayLabel(day: WorkingDayId, locale: "ar" | "en") {
  const label = WORKING_DAY_LABELS.find((item) => item.id === day);
  return locale === "ar" ? label?.ar ?? day : label?.en ?? day;
}

export function getCurrentWorkingHoursStatus(
  value: ProfileWorkingHours,
  now = new Date(),
): "open" | "closed" | "unknown" {
  if (!hasWorkingHours(value)) return "unknown";
  const dayIndex = now.getDay();
  const dayByJsIndex: WorkingDayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const day = value.days.find((item) => item.day === dayByJsIndex[dayIndex]);
  if (!day?.open) return "closed";
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = day.periods.some((period) => {
    const [startH = 0, startM = 0] = period.start.split(":").map(Number);
    const [endH = 0, endM = 0] = period.end.split(":").map(Number);
    return minutes >= startH * 60 + startM && minutes <= endH * 60 + endM;
  });
  return isOpen ? "open" : "closed";
}
