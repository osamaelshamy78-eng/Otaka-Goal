"use client";

import { useEffect, useState } from "react";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const KEY = "otaka-reminders";
const LEAD_MS = 15 * 60 * 1000;

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

// Saves the reminder in this browser and shows a notification 15 minutes before
// kickoff while the site is open. Push notifications for closed tabs need a server.
export function Reminder({ lang, id, kickoff, title }: { lang: Lang; id: string; kickoff: string; title: string }) {
  const t = dict(lang);
  const [on, setOn] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => setOn(load().includes(id)), [id]);

  useEffect(() => {
    if (!on || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const wait = new Date(kickoff).getTime() - LEAD_MS - Date.now();
    if (wait < 0 || wait > 2 ** 31 - 1) return;
    const timer = setTimeout(() => new Notification("Otaka Goal", { body: title, icon: "/icon.svg" }), wait);
    return () => clearTimeout(timer);
  }, [on, kickoff, title]);

  async function toggle() {
    const ids = load();
    if (on) {
      save(ids.filter((x) => x !== id));
      setOn(false);
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setBlocked(typeof Notification !== "undefined" && Notification.permission === "denied");
    save([...ids, id]);
    setOn(true);
  }

  return (
    <>
      <button className="remind" aria-pressed={on} onClick={toggle}>{on ? t.reminding : t.remind}</button>
      {blocked && <p className="note">{t.remindBlocked}</p>}
    </>
  );
}
