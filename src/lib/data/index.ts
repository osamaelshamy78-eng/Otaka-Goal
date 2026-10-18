import { addDays, cairoToday } from "../time";
import type { DataProvider, Match } from "../types";
import { apiFootball, PlanLimitError } from "./api-football";
import { FOOTBALL_DATA_LEAGUES, footballData } from "./football-data";
import { sample } from "./sample";

export { PlanLimitError };

const hasFd = !!process.env.FOOTBALL_DATA_KEY;
const hasAf = !!process.env.API_FOOTBALL_KEY;
const isEuropean = (m: { league: string }) => (FOOTBALL_DATA_LEAGUES as string[]).includes(m.league);

// API-Football's free plan only serves yesterday, today and tomorrow.
export const AF_WINDOW_DAYS = 1;
export const arabLeaguesLimited = hasFd && hasAf;
const inAfWindow = (date: string) => date >= addDays(cairoToday(), -AF_WINDOW_DAYS) && date <= addDays(cairoToday(), AF_WINDOW_DAYS);

// football-data.org for the four European competitions, API-Football for the
// Egyptian, Saudi and UAE leagues. Either one alone, or sample data with neither.
const mixed: DataProvider = {
  source: "mixed",
  async fixtures(date) {
    const [eu, rest] = await Promise.allSettled([
      footballData.fixtures(date),
      inAfWindow(date) ? apiFootball.fixtures(date).then((ms) => ms.filter((m) => !isEuropean(m))) : Promise.resolve([] as Match[]),
    ]);
    if (eu.status === "rejected" && rest.status === "rejected") throw eu.reason;
    if (eu.status === "rejected") console.error(eu.reason);
    if (rest.status === "rejected" && !(rest.reason instanceof PlanLimitError)) console.error(rest.reason);
    return [...(eu.status === "fulfilled" ? eu.value : []), ...(rest.status === "fulfilled" ? rest.value : [])];
  },
  match: (id) => (id.startsWith("f-") ? footballData.match(id) : apiFootball.match(id)),
  standings: (league) => (isEuropean({ league }) ? footballData.standings(league) : apiFootball.standings(league)),
  scorers: (league) => (isEuropean({ league }) ? footballData.scorers(league) : apiFootball.scorers(league)),
};

export const data: DataProvider = hasFd && hasAf ? mixed : hasFd ? footballData : hasAf ? apiFootball : sample;
