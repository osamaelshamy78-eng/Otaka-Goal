import type { Lang } from "./types";

export const TZ = "Africa/Cairo";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const locale = (lang: Lang) => (lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB");
const atNoonUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function cairoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function parseDate(v: unknown): string | null {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return null;
  return Number.isNaN(atNoonUTC(v).getTime()) ? null : v;
}

export function addDays(iso: string, n: number): string {
  const d = atNoonUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((atNoonUTC(to).getTime() - atNoonUTC(from).getTime()) / 864e5);
}

export const weekday = (iso: string) => atNoonUTC(iso).getUTCDay(); // 0 = Sunday

// Cairo's UTC offset on a given day, e.g. "+03:00" (Egypt observes summer time).
export function cairoOffset(iso: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(atNoonUTC(iso))
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? "00"}` : "+02:00";
}

export const cairoDateTime = (iso: string, hhmm: string) => `${iso}T${hhmm}:00${cairoOffset(iso)}`;

export function formatDay(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: "UTC" }).format(atNoonUTC(iso));
}

export function formatMonth(year: number, month: number, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(year, month, 15));
}

export function formatKickoff(dateTime: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(dateTime));
}

export function kickoffDate(dateTime: string) {
  return cairoToday(new Date(dateTime));
}

// Football seasons start in summer: a date in Aug 2026–Jul 2027 belongs to season 2026.
export function seasonFor(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return m >= 8 ? y : y - 1;
}
