import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Crest, Form, minuteLabel } from "@/components/bits";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Reminder } from "@/components/Reminder";
import { data } from "@/lib/data";
import { dict, isLang, pick } from "@/lib/i18n";
import { leagueByKey } from "@/lib/leagues";
import { formatDay, formatKickoff, kickoffDate } from "@/lib/time";
import type { Lang, MatchDetail, MatchEvent, StandingRow } from "@/lib/types";

type Props = { params: Promise<{ lang: string; id: string }> };

const load = cache(async (id: string) => {
  try {
    return await data.match(id);
  } catch (err) {
    console.error(err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const m = isLang(lang) ? await load(id) : null;
  if (!m || !isLang(lang)) return {};
  return { title: `${pick(m.home.name, lang)} ${dict(lang).vs} ${pick(m.away.name, lang)}` };
}

const ball = <svg className="ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" /></svg>;
const subIcon = <svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" aria-hidden="true"><path d="M7 4v14M3 14l4 4 4-4" stroke="var(--win)" /><path d="M17 20V6M13 10l4-4 4 4" stroke="var(--loss)" /></svg>;

function EventLine({ e, lang }: { e: MatchEvent; lang: Lang }) {
  const t = dict(lang);
  const icon = e.type === "yellow" ? <span className="ic yellow" /> : e.type === "red" ? <span className="ic red" /> : e.type === "sub" ? subIcon : ball;
  const note = e.type === "pen" ? t.penalty : e.type === "own" ? t.ownGoal : undefined;
  const body = <div className="side">{icon}<span>{pick(e.player, lang)}</span>{note && <span className="note">{note}</span>}</div>;
  return (
    <div className="ev">
      <div className="h">{e.side === "home" && body}</div>
      <div className="m num">{e.minute}{e.extra ? `+${e.extra}` : ""}′</div>
      <div className="a">{e.side === "away" && body}</div>
    </div>
  );
}

function Events({ m, lang }: { m: MatchDetail; lang: Lang }) {
  const t = dict(lang);
  if (!m.events.length) return <p className="note">{t.noEvents}</p>;
  const pastHalf = m.status === "ft" || m.status === "ht" || (m.minute ?? 0) > 45;
  const items = [...m.events].sort((a, b) => b.minute - a.minute || (b.extra ?? 0) - (a.extra ?? 0));
  const out: React.ReactNode[] = [];
  if (m.status === "ft") out.push(<div key="ft" className="htline">{t.fullTime}</div>);
  let htShown = false;
  items.forEach((e, i) => {
    if (pastHalf && !htShown && e.minute <= 45) {
      out.push(<div key="ht" className="htline">{t.halfTime}</div>);
      htShown = true;
    }
    out.push(<EventLine key={i} e={e} lang={lang} />);
  });
  return <>{out}</>;
}

export default async function MatchPage({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const m = await load(id);
  if (!m) notFound();
  const league = leagueByKey(m.league);
  const live = m.status === "live" || m.status === "ht";
  const day = kickoffDate(m.kickoff);

  let table: StandingRow[] = [];
  if (m.status === "ns") {
    try {
      table = await data.standings(m.league);
    } catch {}
  }
  const formOf = (teamName: string) => table.find((r) => r.team.name.en === teamName)?.form;
  const [h, a] = m.score ?? [0, 0];

  return (
    <main>
      <div className="mgrid">
        <h1 className="sr-only">{pick(m.home.name, lang)} {t.vs} {pick(m.away.name, lang)}</h1>
        <article className="card">
          <div className="ptop">
            <span>{pick(league.name, lang)}{m.round ? ` · ${m.round}` : ""}</span>
            <Link prefetch={false} href={`/${lang}?date=${day}`}>{t.back}</Link>
          </div>
          <div className="scoreboard">
            <div className="t"><Crest team={m.home} lang={lang} large /><span>{pick(m.home.name, lang)}</span></div>
            <div>
              {m.status === "ns" || !m.score ? (
                <>
                  <div className="big ko num">{formatKickoff(m.kickoff)}</div>
                  <div className="sub">{formatDay(day, lang)}</div>
                </>
              ) : (
                <>
                  <div className="big num" dir="ltr">
                    {lang === "ar" ? <><span>{a}</span><em>-</em><span>{h}</span></> : <><span>{h}</span><em>-</em><span>{a}</span></>}
                  </div>
                  <div className={`sub${live ? " live" : ""}`}>
                    {m.status === "live" ? `${t.status.live} · ${minuteLabel(m)}` : t.status[m.status]}
                  </div>
                </>
              )}
            </div>
            <div className="t"><Crest team={m.away} lang={lang} large /><span>{pick(m.away.name, lang)}</span></div>
          </div>
          <div className="stream">
            <b>{live ? t.streamLive : m.status === "ft" ? t.streamFt : t.streamNs}</b>
            <p>{m.status === "ft" ? t.streamNoteFt : t.streamNote}</p>
          </div>
          <div className="sect">
            <h2>{t.whereToWatch}</h2>
            <div className="wl">
              {league.broadcasters.map((b) =>
                b.url ? (
                  <a key={b.name.en} className="wbtn" href={b.url} target="_blank" rel="noopener noreferrer">{pick(b.name, lang)}</a>
                ) : (
                  <span key={b.name.en} className="wbtn plain">{pick(b.name, lang)}</span>
                ),
              )}
            </div>
          </div>
          {m.venue && <div className="sect"><span className="note">{t.venue}: {m.venue}</span></div>}
        </article>

        <aside className="card">
          {m.status === "ns" ? (
            <div className="sect" style={{ borderTop: 0 }}>
              {table.length > 0 && (
                <>
                  <h2>{t.lastResults}</h2>
                  {[m.home, m.away].map((team) => {
                    const form = formOf(team.name.en);
                    return form ? <div key={team.id} className="formrow"><span>{pick(team.name, lang)}</span><Form form={form} lang={lang} /></div> : null;
                  })}
                </>
              )}
              <Reminder lang={lang} id={m.id} kickoff={m.kickoff} title={`${pick(m.home.name, lang)} ${t.vs} ${pick(m.away.name, lang)} · ${formatKickoff(m.kickoff)}`} />
            </div>
          ) : (
            <>
              <div className="sect" style={{ borderTop: 0 }}>
                <h2>{t.events}</h2>
                <Events m={m} lang={lang} />
              </div>
              {m.stats.length > 0 && (
                <div className="sect">
                  <h2>{t.stats}</h2>
                  {m.stats.map((s) => {
                    const pct = s.key === "possession" ? "%" : "";
                    const total = s.home + s.away || 1;
                    return (
                      <div key={s.key} className="stat">
                        <div className="lbl num"><span>{s.home}{pct}</span><span>{t.statLabels[s.key]}</span><span>{s.away}{pct}</span></div>
                        <div className="bars"><i><b style={{ width: `${(s.home / total) * 100}%` }} /></i><i><b style={{ width: `${(s.away / total) * 100}%` }} /></i></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      <LiveRefresh active={live} />
    </main>
  );
}
