import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest, LeagueChips } from "@/components/bits";
import { data } from "@/lib/data";
import { dict, isLang, pick } from "@/lib/i18n";
import { isLeagueKey, leagueByKey } from "@/lib/leagues";
import { cairoToday, seasonFor } from "@/lib/time";
import type { Scorer } from "@/lib/types";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ league?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? dict(lang).nav.scorers : undefined };
}

export default async function ScorersPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { league: q } = await searchParams;
  const key = isLeagueKey(q) ? q : "epl";
  const t = dict(lang);
  const league = leagueByKey(key);
  const season = seasonFor(cairoToday());

  let rows: Scorer[] = [];
  let failed = false;
  try {
    rows = await data.scorers(key);
  } catch (err) {
    console.error(err);
    failed = true;
  }

  return (
    <>
      <section className="filters"><LeagueChips lang={lang} base={`/${lang}/scorers`} current={key} /></section>
      <main>
        <h1 className="daytitle">{pick(league.name, lang)}<span>{t.season} {season}/{season + 1}</span></h1>
        {failed ? <div className="empty">{t.loadError}</div> : (
          <div className="tblwrap">
            <table className="num" style={{ minWidth: 360 }}>
              <thead><tr><th>#</th><th className="tm">{t.player}</th><th className="tm">{t.table.team}</th><th>{t.goals}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.player.en}-${r.team.id}`}>
                    <td className="pos">{i + 1}</td>
                    <td className="tm" style={{ fontWeight: 600 }}>{pick(r.player, lang)}</td>
                    <td className="tm"><div><Crest team={r.team} lang={lang} />{pick(r.team.name, lang)}</div></td>
                    <td className="pts">{r.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
