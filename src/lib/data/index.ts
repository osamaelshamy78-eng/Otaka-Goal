import { addDays, cairoToday } from "../time";
import type { DataProvider, Lang, LeagueKey, Match } from "../types";
import { apiFootball, PlanLimitError } from "./api-football";
import { ESPN_LEAGUES, espn } from "./espn";
import { FOOTBALL_DATA_LEAGUES, footballData } from "./football-data";
import { sample } from "./sample";

export { PlanLimitError };

const hasFd = !!process.env.FOOTBALL_DATA_KEY;
const hasAf = !!process.env.API_FOOTBALL_KEY;
const fromEspn = (league: string) => (ESPN_LEAGUES as string[]).includes(league);
const fdCovers = (league: string) => hasFd && (FOOTBALL_DATA_LEAGUES as string[]).includes(league);

// The leagues ESPN doesn't cover come from API-Football, whose free plan only
// serves yesterday, today and tomorrow.
export const LIMITED_LEAGUES: LeagueKey[] = ["egy", "uae"];
export const AF_WINDOW_DAYS = 1;
const inAfWindow = (date: string) => date >= addDays(cairoToday(), -AF_WINDOW_DAYS) && date <= addDays(cairoToday(), AF_WINDOW_DAYS);

const logFailure = (r: PromiseSettledResult<unknown>) => {
  if (r.status === "rejected") console.error(r.reason instanceof Error ? r.reason.message : r.reason);
};

// ESPN for the Champions League, the Premier League, LaLiga, Serie A and the Saudi
// league, with football-data.org standing in for the European four when ESPN fails;
// API-Football for the Egyptian and UAE leagues.
const live: DataProvider = {
  source: "espn",
  async fixtures(date) {
    const [main, rest] = await Promise.allSettled([
      espn.fixtures(date).catch((err) => {
        if (!hasFd) throw err;
        console.error(err instanceof Error ? err.message : err);
        return footballData.fixtures(date);
      }),
      hasAf && inAfWindow(date)
        ? apiFootball.fixtures(date).then((ms) => ms.filter((m) => LIMITED_LEAGUES.includes(m.league)))
        : Promise.resolve([] as Match[]),
    ]);
    [main, rest].forEach(logFailure);
    if (main.status === "rejected" && rest.status === "rejected") throw main.reason;
    return [...(main.status === "fulfilled" ? main.value : []), ...(rest.status === "fulfilled" ? rest.value : [])];
  },
  match(id) {
    if (id.startsWith("e-")) return espn.match(id);
    if (id.startsWith("f-")) return footballData.match(id);
    return apiFootball.match(id);
  },
  async standings(league) {
    if (!fromEspn(league)) return apiFootball.standings(league);
    return espn.standings(league).catch((err) => (fdCovers(league) ? footballData.standings(league) : Promise.reject(err)));
  },
  async scorers(league) {
    if (!fromEspn(league)) return apiFootball.scorers(league);
    return espn.scorers(league).catch((err) => (fdCovers(league) ? footballData.scorers(league) : Promise.reject(err)));
  },
};

export const data: DataProvider = process.env.SAMPLE_DATA === "1" ? sample : live;

export const sourceLabel = (lang: Lang) => {
  const names = ["ESPN", ...(hasFd ? ["football-data.org"] : []), ...(hasAf ? ["API-Football"] : [])];
  return names.join(lang === "ar" ? " و" : " and ").replace(/ و(?=\S)/g, " و ");
};
