import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Package-local class merge. Favorites UI never reaches into application utils. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
