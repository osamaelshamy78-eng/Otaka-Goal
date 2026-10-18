"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dict } from "@/lib/i18n";
import { addDays, daysBetween, formatDay, formatMonth } from "@/lib/time";
import type { Lang } from "@/lib/types";

export function DayStrip({ lang, date, today, league }: { lang: Lang; date: string; today: string; league: string }) {
  const t = dict(lang);
  const [open, setOpen] = useState(false);
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>("[aria-current='true']")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);
  const [y0, m0] = date.split("-").map(Number);
  const [month, setMonth] = useState({ y: y0, m: m0 - 1 });

  const href = (d: string) => {
    const q = new URLSearchParams();
    if (d !== today) q.set("date", d);
    if (league !== "all") q.set("league", league);
    const s = q.toString();
    return `/${lang}${s ? `?${s}` : ""}`;
  };
  const label = (d: string) => {
    const diff = daysBetween(today, d);
    if (diff === 0) return t.today;
    if (diff === -1) return t.yesterday;
    if (diff === 1) return t.tomorrow;
    return formatDay(d, lang, { weekday: "long" });
  };

  const first = `${month.y}-${String(month.m + 1).padStart(2, "0")}-01`;
  const len = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 1) % 7; // weeks start on Saturday
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (m + n + 12) % 12 }));

  return (
    <>
      <div className="daysrow">
        <nav className="days" ref={strip} aria-label={t.calendar}>
          {[-2, -1, 0, 1, 2].map((o) => {
            const d = addDays(date, o);
            return (
              <Link prefetch={false} key={d} className="day" href={href(d)} aria-current={d === date}>
                <b>{label(d)}</b>
                <span className="num">{formatDay(d, lang, { day: "numeric", month: "long" })}</span>
              </Link>
            );
          })}
        </nav>
        <button className="calbtn" aria-expanded={open} aria-controls="calendar" onClick={() => { setMonth({ y: y0, m: m0 - 1 }); setOpen(!open); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          {t.calendar}
        </button>
      </div>
      {open && (
        <div className="cal" id="calendar">
          <div className="calhead">
            <button onClick={() => shift(-1)} aria-label={t.prevMonth}>{lang === "ar" ? "›" : "‹"}</button>
            <span>{formatMonth(month.y, month.m, lang)}</span>
            <button onClick={() => shift(1)} aria-label={t.nextMonth}>{lang === "ar" ? "‹" : "›"}</button>
          </div>
          <div className="calgrid">
            {t.weekdays.map((w) => <span key={w} className="wd">{w}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: len }, (_, i) => {
              const d = addDays(first, i);
              const cls = ["cd", "num", d < today ? "past" : "", d === today ? "today" : ""].join(" ");
              return (
                <Link prefetch={false} key={d} className={cls} href={href(d)} aria-current={d === date} aria-label={formatDay(d, lang)} onClick={() => setOpen(false)}>
                  {i + 1}
                </Link>
              );
            })}
          </div>
          <div className="calfoot">
            <span>{t.calendarHint}</span>
            <Link prefetch={false} href={href(today)} onClick={() => setOpen(false)}>{t.backToToday}</Link>
          </div>
        </div>
      )}
    </>
  );
}
