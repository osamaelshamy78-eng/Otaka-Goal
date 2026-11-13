import { unstable_cache } from "next/cache";
import { arabicName, knownTeam } from "../teams";
import { addDays, cairoToday, kickoffDate } from "../time";
import type { DataProvider, EventType, LeagueKey, Match, MatchDetail, MatchEvent, MatchStat, Status, StatKey, Team } from "../types";
import { RateLimitError, throttle } from "./throttle";

// ESPN's public site API: no key, but undocumented and unsupported, so it can change
// without notice. It covers these five competitions; the Egyptian and UAE leagues
// aren't on it.
const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
const SLUGS: Partial<Record<LeagueKey, string>> = { ucl: "uefa.champions", epl: "eng.1", laliga: "esp.1", seriea: "ita.1", spl: "ksa.1" };
export const ESPN_LEAGUES = Object.keys(SLUGS) as LeagueKey[];

interface EspnTeam { id: string; displayName: string; shortDisplayName?: string; abbreviation?: string; logo?: string; logos?: { href: string }[] }
interface EspnCompetitor { homeAway: "home" | "away"; score?: string; team: EspnTeam }
interface EspnStatus { displayClock?: string; type: { name: string; state: "pre" | "in" | "post" } }
interface EspnCompetition { date?: string; competitors: EspnCompetitor[]; status?: EspnStatus; venue?: { fullName?: string } }
interface EspnEvent { id: string; date: string; status: EspnStatus; competitions: EspnCompetition[] }

const limiter = throttle("ESPN");

async function request(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 429) {
    limiter.block(60);
    throw new RateLimitError(`ESPN ${url} responded 429`);
  }
  if (!res.ok) throw new Error(`ESPN ${url} responded ${res.status}`);
  return res.json();
}

// Cache successful responses only.
async function get<T>(url: string, revalidate: number): Promise<T> {
  return (await unstable_cache(() => limiter.run(url, () => request(url)), ["espn", url], { revalidate })()) as T;
}

function toTeam(t: EspnTeam): Team {
  const en = t.shortDisplayName ?? t.displayName;
  const known = knownTeam(t.displayName) ?? knownTeam(en);
  return {
    id: `espn${t.id}`,
    code: known?.[0] ?? t.abbreviation ?? en.slice(0, 3).toUpperCase(),
    name: { ar: arabicName(t.displayName, en) ?? en, en },
    logo: t.logo ?? t.logos?.[0]?.href,
    color: known?.[3],
    textColor: known?.[4],
  };
}

function toStatus(s: EspnStatus): Status {
  const name = s.type.name;
  if (name.includes("POSTPONED")) return "pst";
  if (name.includes("CANCELED") || name.includes("ABANDONED")) return "canc";
  if (name.includes("HALFTIME")) return "ht";
  return s.type.state === "pre" ? "ns" : s.type.state === "in" ? "live" : "ft";
}

// "67'" → 67, "90'+4'" → 94
function clockMinute(clock?: string): number | undefined {
  const m = clock?.match(/^(\d+)'?(?:\+(\d+))?/);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : undefined;
}

function toMatch(league: LeagueKey, id: string, date: string, c: EspnCompetition, status: EspnStatus): Match | null {
  const home = c.competitors.find((x) => x.homeAway === "home");
  const away = c.competitors.find((x) => x.homeAway === "away");
  if (!home || !away) return null;
  const st = toStatus(status);
  const minute = st === "live" ? clockMinute(status.displayClock) : undefined;
  return {
    id: `e-${league}-${id}`,
    league,
    kickoff: date.length === 17 ? date.replace("Z", ":00Z") : date, // "2026-11-08T14:00Z"
    status: st,
    minute,
    home: toTeam(home.team),
    away: toTeam(away.team),
    score: st === "ns" || st === "pst" || st === "canc" ? null : [Number(home.score ?? 0), Number(away.score ?? 0)],
    venue: c.venue?.fullName,
  };
}

const ymd = (iso: string) => iso.replaceAll("-", "");

function eventType(text: string, scoring: boolean): EventType | null {
  if (/own goal/i.test(text)) return "own";
  if (/penalty - scored/i.test(text)) return "pen";
  if (scoring || /^goal/i.test(text)) return "goal";
  if (/yellow/i.test(text)) return "yellow";
  if (/red card/i.test(text)) return "red";
  if (/substitution/i.test(text)) return "sub";
  return null;
}

const STAT_NAMES: Record<string, StatKey> = {
  possessionPct: "possession", totalShots: "shots", shotsOnTarget: "onTarget", wonCorners: "corners", foulsCommitted: "fouls",
};

async function leagueDay(league: LeagueKey, etDay: string, ttl: number): Promise<Match[]> {
  const res = await get<{ events?: EspnEvent[] }>(`${SITE}/${SLUGS[league]}/scoreboard?dates=${ymd(etDay)}`, ttl);
  return (res.events ?? []).map((e) => toMatch(league, e.id, e.date, e.competitions[0], e.status)).filter((m): m is Match => m !== null);
}

export const espn: DataProvider = {
  source: "espn",
  async fixtures(date) {
    const today = cairoToday();
    const ttl = (d: string) => (d >= addDays(today, -1) && d <= today ? 30 : d < addDays(today, -2) ? 86400 : d < today ? 3600 : d > addDays(today, 7) ? 21600 : 900);
    // ESPN groups matches by US Eastern date, which runs behind Cairo, so a Cairo day
    // spans that ET day and the one before it.
    const days = [addDays(date, -1), date];
    const results = await Promise.allSettled(ESPN_LEAGUES.flatMap((l) => days.map((d) => leagueDay(l, d, ttl(d)))));
    const ok = results.filter((r): r is PromiseFulfilledResult<Match[]> => r.status === "fulfilled");
    if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
    const seen = new Set<string>();
    return ok.flatMap((r) => r.value).filter((m) => kickoffDate(m.kickoff) === date && !seen.has(m.id) && seen.add(m.id));
  },
  async match(id) {
    const [, league, eventId] = id.match(/^e-([a-z]+)-(\d+)$/) ?? [];
    if (!league || !SLUGS[league as LeagueKey]) return null;
    type Summary = {
      header: { competitions: EspnCompetition[] };
      gameInfo?: { venue?: { fullName?: string } };
      keyEvents?: { type?: { text?: string }; scoringPlay?: boolean; clock?: { displayValue?: string }; team?: { id: string }; participants?: { athlete?: { displayName?: string } }[] }[];
      boxscore?: { teams?: { team: { id: string }; statistics?: { name: string; displayValue: string }[] }[] };
    };
    const s = await get<Summary>(`${SITE}/${SLUGS[league as LeagueKey]}/summary?event=${eventId}`, 30);
    const c = s.header.competitions[0];
    const base = c.status && c.date ? toMatch(league as LeagueKey, eventId, c.date, { ...c, venue: s.gameInfo?.venue }, c.status) : null;
    if (!base) return null;
    const homeId = c.competitors.find((x) => x.homeAway === "home")?.team.id;
    const events: MatchEvent[] = (s.keyEvents ?? []).flatMap((e) => {
      const type = eventType(e.type?.text ?? "", !!e.scoringPlay);
      const name = e.participants?.[0]?.athlete?.displayName;
      const clock = e.clock?.displayValue?.match(/^(\d+)'?(?:\+(\d+))?/);
      if (!type || !name || !clock || !e.team) return [];
      return [{ minute: Number(clock[1]), extra: clock[2] ? Number(clock[2]) : undefined, type, side: e.team.id === homeId ? "home" : "away", player: { ar: name, en: name } }];
    });
    const [h, a] = [s.boxscore?.teams?.find((t) => t.team.id === homeId), s.boxscore?.teams?.find((t) => t.team.id !== homeId)];
    const stats: MatchStat[] = h && a
      ? Object.entries(STAT_NAMES).map(([name, key]) => {
          const v = (t: typeof h) => Number(t.statistics?.find((x) => x.name === name)?.displayValue ?? 0) || 0;
          return { key, home: Math.round(v(h)), away: Math.round(v(a)) };
        })
      : [];
    return { ...base, events, stats } satisfies MatchDetail;
  },
  async standings(league) {
    type Entry = { team: EspnTeam; stats: { name: string; value?: number }[] };
    const res = await get<{ children?: { standings: { entries: Entry[] } }[] }>(`${V2}/${SLUGS[league]}/standings`, 3600);
    const entries = res.children?.[0]?.standings.entries ?? [];
    const stat = (e: Entry, n: string) => e.stats.find((s) => s.name === n)?.value ?? 0;
    return entries
      .map((e) => ({
        rank: stat(e, "rank"), team: toTeam(e.team), played: stat(e, "gamesPlayed"), win: stat(e, "wins"), draw: stat(e, "ties"),
        loss: stat(e, "losses"), goalsFor: stat(e, "pointsFor"), goalsAgainst: stat(e, "pointsAgainst"), points: stat(e, "points"), form: "",
      }))
      .sort((x, y) => x.rank - y.rank);
  },
  async scorers(league) {
    type Leader = { value: number; athlete: { displayName: string; team?: EspnTeam } };
    const res = await get<{ stats?: { name: string; leaders?: Leader[] }[] }>(`${SITE}/${SLUGS[league]}/statistics`, 3600);
    const goals = res.stats?.find((s) => s.name === "goalsLeaders")?.leaders ?? [];
    return goals.slice(0, 15).map((l) => ({
      player: { ar: l.athlete.displayName, en: l.athlete.displayName },
      team: l.athlete.team ? toTeam(l.athlete.team) : { id: "?", code: "?", name: { ar: "", en: "" } },
      goals: l.value,
    }));
  },
};
