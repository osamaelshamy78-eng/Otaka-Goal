import { notFound } from "next/navigation";
import { LeagueChips, MatchRow } from "@/components/bits";
import { DayStrip } from "@/components/DayStrip";
import { LiveRefresh } from "@/components/LiveRefresh";
import { data, PlanLimitError } from "@/lib/data";
import { dict, isLang, pick } from "@/lib/i18n";
import { isLeagueKey, LEAGUES } from "@/lib/leagues";
import { cairoToday, formatDay, parseDate } from "@/lib/time";
import type { Match } from "@/lib/types";

export default async function MatchesPage({ params, searchParams }: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ date?: string; league?: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;
  const t = dict(lang);
  const today = cairoToday();
  const date = parseDate(sp.date) ?? today;
  const league = isLeagueKey(sp.league) ? sp.league : "all";

  let matches: Match[] = [];
  let failed: false | "error" | "plan" = false;
  try {
    matches = (await data.fixtures(date)).filter((m) => league === "all" || m.league === league);
  } catch (err) {
    if (err instanceof PlanLimitError) failed = "plan";
    else {
      console.error(err);
      failed = "error";
    }
  }
  const kind = date < today ? t.results : date > today ? t.fixtures : t.todayMatches;
  const anyLive = matches.some((m) => m.status === "live" || m.status === "ht");
  const startsSoon = date === today && matches.some((m) => m.status === "ns" && new Date(m.kickoff).getTime() - Date.now() < 30 * 60 * 1000);

  return (
    <>
      <section className="filters">
        <LeagueChips lang={lang} base={`/${lang}`} current={league} allowAll query={date === today ? {} : { date }} />
        <DayStrip key={date} lang={lang} date={date} today={today} league={league} />
      </section>
      <main>
        <h1 className="daytitle">
          {date === today ? `${t.today}${lang === "ar" ? "، " : ", "}` : ""}{formatDay(date, lang)}
          <span>{kind}{matches.length ? ` · ${t.matchCount(matches.length)}` : ""}</span>
        </h1>
        {failed ? (
          <div className="empty">{failed === "plan" ? t.planLimit : t.loadError}</div>
        ) : matches.length === 0 ? (
          <div className="empty">{t.noMatches}</div>
        ) : (
          LEAGUES.filter((l) => matches.some((m) => m.league === l.key)).map((l) => {
            const ms = matches.filter((m) => m.league === l.key).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
            const live = ms.filter((m) => m.status === "live" || m.status === "ht").length;
            return (
              <section key={l.key} className="group" style={{ "--lc": l.color } as React.CSSProperties}>
                <h2 className="ghead"><i />{pick(l.name, lang)}<span>{live ? `${t.liveCount(live)} · ` : ""}{t.matchCount(ms.length)}</span></h2>
                {ms.map((m) => <MatchRow key={m.id} match={m} lang={lang} />)}
              </section>
            );
          })
        )}
      </main>
      <LiveRefresh active={anyLive || startsSoon} />
    </>
  );
}
