import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest, Form, LeagueChips } from "@/components/bits";
import { data } from "@/lib/data";
import { dict, isLang, pick } from "@/lib/i18n";
import { isLeagueKey, leagueByKey } from "@/lib/leagues";
import { cairoToday, seasonFor } from "@/lib/time";
import type { StandingRow } from "@/lib/types";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ league?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? dict(lang).nav.standings : undefined };
}

export default async function StandingsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { league: q } = await searchParams;
  const key = isLeagueKey(q) ? q : "epl";
  const t = dict(lang);
  const league = leagueByKey(key);
  const season = seasonFor(cairoToday());

  let rows: StandingRow[] = [];
  let failed = false;
  try {
    rows = await data.standings(key);
  } catch (err) {
    console.error(err);
    failed = true;
  }

  return (
    <>
      <section className="filters"><LeagueChips lang={lang} base={`/${lang}/standings`} current={key} /></section>
      <main>
        <h1 className="daytitle">{pick(league.name, lang)}<span>{t.season} {season}/{season + 1}</span></h1>
        {failed ? <div className="empty">{t.loadError}</div> : (
          <div className="tblwrap">
            <table className="num" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>#</th><th className="tm">{t.table.team}</th><th>{t.table.played}</th><th>{t.table.w}</th><th>{t.table.d}</th><th>{t.table.l}</th>
                  <th>{t.table.gf}</th><th>{t.table.ga}</th><th>{t.table.gd}</th><th>{t.table.pts}</th><th>{t.table.form}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const gd = r.goalsFor - r.goalsAgainst;
                  return (
                    <tr key={r.team.id} className={r.rank <= league.zone ? "zone" : undefined}>
                      <td className="pos">{r.rank}</td>
                      <td className="tm"><div><Crest team={r.team} lang={lang} />{pick(r.team.name, lang)}</div></td>
                      <td>{r.played}</td><td>{r.win}</td><td>{r.draw}</td><td>{r.loss}</td>
                      <td>{r.goalsFor}</td><td>{r.goalsAgainst}</td><td><bdi dir="ltr">{gd > 0 ? `+${gd}` : gd}</bdi></td>
                      <td className="pts">{r.points}</td>
                      <td><Form form={r.form} lang={lang} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tnote"><span><i />{pick(league.zoneLabel, lang)}</span></div>
          </div>
        )}
      </main>
    </>
  );
}
