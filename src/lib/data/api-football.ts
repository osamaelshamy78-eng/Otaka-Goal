import { leagueByApiId, leagueByKey } from "../leagues";
import { knownTeam } from "../teams";
import { cairoToday, seasonFor, TZ } from "../time";
import type { DataProvider, EventType, MatchDetail, Match, MatchEvent, MatchStat, Status, StatKey, Team } from "../types";

// https://www.api-football.com/documentation-v3
const BASE = "https://v3.football.api-sports.io";

interface ApiTeam { id: number; name: string; logo: string }
interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null; extra?: number | null }; venue?: { name: string | null } };
  league: { id: number; round?: string };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
  events?: { time: { elapsed: number; extra: number | null }; team: { id: number }; player: { name: string | null }; type: string; detail: string }[];
  statistics?: { team: { id: number }; statistics: { type: string; value: number | string | null }[] }[];
}

async function get<T>(path: string, params: Record<string, string | number>, revalidate: number): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set");
  const url = `${BASE}${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`;
  const res = await fetch(url, { headers: { "x-apisports-key": key }, next: { revalidate } });
  if (!res.ok) throw new Error(`API-Football ${path} responded ${res.status}`);
  const body = (await res.json()) as { response: T[]; errors: unknown };
  // the API reports quota and plan errors in the body with a 200 status
  const errors = body.errors && typeof body.errors === "object" ? Object.values(body.errors) : [];
  if (errors.length) throw new Error(`API-Football ${path}: ${errors.join("; ")}`);
  return body.response;
}

function toTeam(t: ApiTeam): Team {
  const known = knownTeam(t.name);
  return {
    id: String(t.id),
    code: known?.[0] ?? t.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(),
    name: { ar: known?.[1] ?? t.name, en: t.name },
    logo: t.logo,
    color: known?.[3],
    textColor: known?.[4],
  };
}

function toStatus(short: string): Status {
  if (["NS", "TBD"].includes(short)) return "ns";
  if (short === "HT") return "ht";
  if (["FT", "AET", "PEN"].includes(short)) return "ft";
  if (short === "PST") return "pst";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "canc";
  return "live"; // 1H, 2H, ET, BT, P, SUSP, INT, LIVE
}

function toMatch(f: ApiFixture): Match | null {
  const league = leagueByApiId(f.league.id);
  if (!league) return null;
  const status = toStatus(f.fixture.status.short);
  return {
    id: `a-${f.fixture.id}`,
    league: league.key,
    kickoff: f.fixture.date,
    status,
    minute: f.fixture.status.elapsed ?? undefined,
    home: toTeam(f.teams.home),
    away: toTeam(f.teams.away),
    score: f.goals.home === null || f.goals.away === null ? null : [f.goals.home, f.goals.away],
    venue: f.fixture.venue?.name ?? undefined,
    round: f.league.round,
  };
}

function eventType(type: string, detail: string): EventType | null {
  if (type === "Goal") return detail === "Own Goal" ? "own" : detail === "Penalty" ? "pen" : detail === "Missed Penalty" ? null : "goal";
  if (type === "Card") return detail.startsWith("Red") || detail.startsWith("Second") ? "red" : "yellow";
  if (type === "subst") return "sub";
  return null;
}

const STAT_TYPES: Record<string, StatKey> = {
  "Ball Possession": "possession", "Total Shots": "shots", "Shots on Goal": "onTarget", "Corner Kicks": "corners", Fouls: "fouls",
};

// Live data refreshes often; finished days rarely change.
const ttlFor = (date: string) => {
  const today = cairoToday();
  return date === today ? 30 : date < today ? 3600 : 900;
};

export const apiFootball: DataProvider = {
  source: "api-football",
  async fixtures(date) {
    const rows = await get<ApiFixture>("/fixtures", { date, timezone: TZ }, ttlFor(date));
    return rows.map(toMatch).filter((m): m is Match => m !== null);
  },
  async match(id) {
    const fixtureId = id.match(/^a-(\d+)$/)?.[1];
    if (!fixtureId) return null;
    const [f] = await get<ApiFixture>("/fixtures", { id: fixtureId, timezone: TZ }, 30);
    const base = f && toMatch(f);
    if (!base) return null;
    const homeId = f.teams.home.id;
    const events: MatchEvent[] = (f.events ?? []).flatMap((e) => {
      const type = eventType(e.type, e.detail);
      if (!type || !e.player.name) return [];
      const name = e.player.name;
      return [{ minute: e.time.elapsed, extra: e.time.extra ?? undefined, type, side: e.team.id === homeId ? "home" : "away", player: { ar: name, en: name } }];
    });
    const stats: MatchStat[] = [];
    const [h, a] = [f.statistics?.find((s) => s.team.id === homeId), f.statistics?.find((s) => s.team.id !== homeId)];
    for (const [type, key] of Object.entries(STAT_TYPES)) {
      const value = (side?: typeof h) => Number(String(side?.statistics.find((s) => s.type === type)?.value ?? 0).replace("%", "")) || 0;
      if (h && a) stats.push({ key, home: value(h), away: value(a) });
    }
    return { ...base, events, stats } satisfies MatchDetail;
  },
  async standings(key) {
    type Row = { rank: number; team: ApiTeam; points: number; form: string | null; all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } } };
    const [res] = await get<{ league: { standings: Row[][] } }>("/standings", { league: leagueByKey(key).apiId, season: seasonFor(cairoToday()) }, 3600);
    return (res?.league.standings[0] ?? []).map((r) => ({
      rank: r.rank, team: toTeam(r.team), played: r.all.played, win: r.all.win, draw: r.all.draw, loss: r.all.lose,
      goalsFor: r.all.goals.for, goalsAgainst: r.all.goals.against, points: r.points, form: r.form ?? "",
    }));
  },
  async scorers(key) {
    type Row = { player: { name: string }; statistics: { team: ApiTeam; goals: { total: number | null } }[] };
    const rows = await get<Row>("/players/topscorers", { league: leagueByKey(key).apiId, season: seasonFor(cairoToday()) }, 3600);
    return rows.slice(0, 15).map((r) => ({
      player: { ar: r.player.name, en: r.player.name }, team: toTeam(r.statistics[0].team), goals: r.statistics[0].goals.total ?? 0,
    }));
  },
};
