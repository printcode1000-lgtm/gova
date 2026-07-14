export type WorkingDayId =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface WorkingHoursPeriod {
  id: string;
  start: string;
  end: string;
}

export interface WorkingHoursDay {
  day: WorkingDayId;
  open: boolean;
  periods: WorkingHoursPeriod[];
}

export interface ProfileWorkingHours {
  timezone: string;
  note: string;
  days: WorkingHoursDay[];
}

export interface WorkingDayLabel {
  id: WorkingDayId;
  ar: string;
  en: string;
}
