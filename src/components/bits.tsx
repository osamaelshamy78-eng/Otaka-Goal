import Link from "next/link";
import { LEAGUES } from "@/lib/leagues";
import { dict, pick } from "@/lib/i18n";
import type { Lang, LeagueKey, Match, Team } from "@/lib/types";
import { formatKickoff } from "@/lib/time";

export function Crest({ team, lang, large }: { team: Team; lang: Lang; large?: boolean }) {
  const cls = `crest${large ? " lg" : ""}`;
  if (team.logo) {
    return (
      <span className={`${cls} img`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt="" loading="lazy" width={large ? 56 : 30} height={large ? 56 : 30} />
      </span>
    );
  }
  return (
    <span className={cls} style={{ "--c": team.color, "--cf": team.textColor } as React.CSSProperties} aria-hidden="true" title={pick(team.name, lang)}>
      {team.code}
    </span>
  );
}

export function LeagueChips({ lang, base, current, allowAll, query = {} }: {
  lang: Lang; base: string; current: LeagueKey | "all"; allowAll?: boolean; query?: Record<string, string>;
}) {
  const t = dict(lang);
  const href = (league?: LeagueKey) => {
    const q = new URLSearchParams({ ...query, ...(league ? { league } : {}) }).toString();
    return q ? `${base}?${q}` : base;
  };
  return (
    <nav className="chips" aria-label={lang === "ar" ? "البطولات" : "Competitions"}>
      {allowAll && (
        <Link prefetch={false} className="chip" href={href()} aria-current={current === "all"} style={{ "--lc": "var(--accent)" } as React.CSSProperties}>
          <i />{t.allLeagues}
        </Link>
      )}
      {LEAGUES.map((l) => (
        <Link prefetch={false} key={l.key} className="chip" href={href(l.key)} aria-current={current === l.key} style={{ "--lc": l.color } as React.CSSProperties}>
          <i />{pick(l.short, lang)}
        </Link>
      ))}
    </nav>
  );
}

export const minuteLabel = (m: Match) => (m.minute && m.minute > 90 ? `90+${m.minute - 90}′` : `${m.minute ?? 0}′`);

export function MatchRow({ match: m, lang }: { match: Match; lang: Lang }) {
  const t = dict(lang);
  const live = m.status === "live" || m.status === "ht";
  const [h, a] = m.score ?? [0, 0];
  const done = m.status === "ft";
  return (
    <Link prefetch={false} className="match" href={`/${lang}/match/${m.id}`} aria-label={`${pick(m.home.name, lang)} ${t.vs} ${pick(m.away.name, lang)}`}>
      {live ? (
        <div className="state live num">{m.status === "ht" ? t.statusShort.ht : minuteLabel(m)}<small>{t.status.live}</small></div>
      ) : (
        <div className="state">{t.statusShort[m.status]}</div>
      )}
      <div className={`team${done && h > a ? " won" : ""}`}><Crest team={m.home} lang={lang} /><span>{pick(m.home.name, lang)}</span></div>
      {m.score && m.status !== "ns" ? (
        <div className={`score num${live ? " live" : ""}`} dir="ltr">
          {lang === "ar" ? <><span>{a}</span><em>-</em><span>{h}</span></> : <><span>{h}</span><em>-</em><span>{a}</span></>}
        </div>
      ) : (
        <div className="score ns num">{formatKickoff(m.kickoff)}</div>
      )}
      <div className={`team away${done && a > h ? " won" : ""}`}><Crest team={m.away} lang={lang} /><span>{pick(m.away.name, lang)}</span></div>
    </Link>
  );
}

export function Form({ form, lang }: { form: string; lang: Lang }) {
  const letters = dict(lang).formLetter;
  return (
    <span className="form">
      {form.split("").slice(-5).map((f, i) => <b key={i} className={f}>{letters[f] ?? f}</b>)}
    </span>
  );
}
