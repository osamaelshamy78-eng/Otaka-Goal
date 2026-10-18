import { unstable_cache } from "next/cache";
import { knownTeam } from "../teams";
import { addDays, cairoToday, kickoffDate } from "../time";
import type { DataProvider, LeagueKey, Match, MatchDetail, MatchEvent, Status, Team } from "../types";
import { PlanLimitError } from "./api-football";

// https://docs.football-data.org — the free tier covers these four competitions.
const BASE = "https://api.football-data.org/v4";
const CODES: Partial<Record<LeagueKey, string>> = { ucl: "CL", epl: "PL", laliga: "PD", seriea: "SA" };
const BY_CODE = Object.fromEntries(Object.entries(CODES).map(([k, v]) => [v, k as LeagueKey]));
export const FOOTBALL_DATA_LEAGUES = Object.keys(CODES) as LeagueKey[];

interface FdTeam { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | string | null;
  venue?: string | null;
  competition: { code: string };
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
  // only present on plans that include match details
  goals?: { minute: number; injuryTime?: number | null; type?: string; team: { id: number }; scorer?: { name: string } | null }[];
  bookings?: { minute: number; team: { id: number }; player?: { name: string } | null; card: string }[];
}

async function request(path: string): Promise<unknown> {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_KEY is not set");
  const res = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": key }, cache: "no-store" });
  if (res.status === 403) throw new PlanLimitError(`football-data.org ${path}: not included in this plan`);
  if (!res.ok) throw new Error(`football-data.org ${path} responded ${res.status}`);
  return res.json();
}

// Cache successful responses only; the free tier allows 10 requests a minute.
async function get<T>(path: string, revalidate: number): Promise<T> {
  return (await unstable_cache(() => request(path), ["football-data", path], { revalidate })()) as T;
}

function toTeam(t: FdTeam): Team {
  const known = knownTeam(t.shortName ?? t.name) ?? knownTeam(t.name);
  const en = t.shortName ?? t.name;
  return {
    id: `fd${t.id}`,
    code: known?.[0] ?? t.tla ?? en.slice(0, 3).toUpperCase(),
    name: { ar: known?.[1] ?? en, en },
    logo: t.crest,
    color: known?.[3],
    textColor: known?.[4],
  };
}

function toStatus(s: string): Status {
  if (s === "IN_PLAY" || s === "LIVE" || s === "SUSPENDED") return "live";
  if (s === "PAUSED") return "ht";
  if (s === "FINISHED" || s === "AWARDED") return "ft";
  if (s === "POSTPONED") return "pst";
  if (s === "CANCELLED") return "canc";
  return "ns"; // SCHEDULED, TIMED
}

function toMatch(m: FdMatch): Match | null {
  const league = BY_CODE[m.competition.code];
  if (!league) return null;
  const status = toStatus(m.status);
  const { home, away } = m.score.fullTime;
  const minute = Number(m.minute);
  return {
    id: `f-${m.id}`,
    league,
    kickoff: m.utcDate,
    status,
    minute: Number.isFinite(minute) && minute > 0 ? minute : undefined,
    home: toTeam(m.homeTeam),
    away: toTeam(m.awayTeam),
    score: home === null || away === null ? (status === "ns" ? null : [0, 0]) : [home, away],
    venue: m.venue ?? undefined,
  };
}

export const footballData: DataProvider = {
  source: "football-data",
  async fixtures(date) {
    // utcDate is UTC, so ask for the neighbouring days and keep the ones that fall on `date` in Cairo
    const today = cairoToday();
    const ttl = date === today ? 60 : date < today ? 3600 : 900;
    const res = await get<{ matches: FdMatch[] }>(
      `/matches?competitions=${Object.values(CODES).join(",")}&dateFrom=${addDays(date, -1)}&dateTo=${addDays(date, 1)}`,
      ttl,
    );
    return res.matches.map(toMatch).filter((m): m is Match => m !== null && kickoffDate(m.kickoff) === date);
  },
  async match(id) {
    const fdId = id.match(/^f-(\d+)$/)?.[1];
    if (!fdId) return null;
    const m = await get<FdMatch>(`/matches/${fdId}`, 60);
    const base = toMatch(m);
    if (!base) return null;
    const side = (teamId: number) => (teamId === m.homeTeam.id ? "home" : "away") as MatchEvent["side"];
    const events: MatchEvent[] = [
      ...(m.goals ?? []).filter((g) => g.scorer?.name).map((g): MatchEvent => ({
        minute: g.minute, extra: g.injuryTime ?? undefined, side: side(g.team.id),
        type: g.type === "OWN" ? "own" : g.type === "PENALTY" ? "pen" : "goal",
        player: { ar: g.scorer!.name, en: g.scorer!.name },
      })),
      ...(m.bookings ?? []).filter((b) => b.player?.name).map((b): MatchEvent => ({
        minute: b.minute, side: side(b.team.id), type: b.card === "YELLOW" ? "yellow" : "red",
        player: { ar: b.player!.name, en: b.player!.name },
      })),
    ];
    return { ...base, events, stats: [] } satisfies MatchDetail;
  },
  async standings(league) {
    type Row = { position: number; team: FdTeam; playedGames: number; won: number; draw: number; lost: number; points: number; goalsFor: number; goalsAgainst: number; form: string | null };
    const res = await get<{ standings: { type: string; table: Row[] }[] }>(`/competitions/${CODES[league]}/standings`, 3600);
    const total = res.standings.find((s) => s.type === "TOTAL") ?? res.standings[0];
    return (total?.table ?? []).map((r) => ({
      rank: r.position, team: toTeam(r.team), played: r.playedGames, win: r.won, draw: r.draw, loss: r.lost,
      goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points,
      form: (r.form ?? "").split(",").reverse().join(""), // assumed newest first; verify against a live table
    }));
  },
  async scorers(league) {
    type Row = { player: { name: string }; team: FdTeam; goals: number | null };
    const res = await get<{ scorers: Row[] }>(`/competitions/${CODES[league]}/scorers?limit=15`, 3600);
    return res.scorers.map((r) => ({ player: { ar: r.player.name, en: r.player.name }, team: toTeam(r.team), goals: r.goals ?? 0 }));
  },
};
