export type Lang = "ar" | "en";
export type LeagueKey = "ucl" | "epl" | "laliga" | "seriea" | "egy" | "spl" | "uae";
export type Status = "ns" | "live" | "ht" | "ft" | "pst" | "canc";

export type Localized = { ar: string; en: string };

export interface Team {
  id: string;
  name: Localized;
  code: string;
  logo?: string;
  color?: string;
  textColor?: string;
}

export interface Match {
  id: string;
  league: LeagueKey;
  kickoff: string; // ISO date-time
  status: Status;
  minute?: number;
  home: Team;
  away: Team;
  score: [number, number] | null;
  venue?: string;
  round?: string;
}

export type EventType = "goal" | "own" | "pen" | "yellow" | "red" | "sub";

export interface MatchEvent {
  minute: number;
  extra?: number;
  type: EventType;
  side: "home" | "away";
  player: Localized;
  detail?: string;
}

export type StatKey = "possession" | "shots" | "onTarget" | "corners" | "fouls";

export interface MatchStat {
  key: StatKey;
  home: number;
  away: number;
}

export interface MatchDetail extends Match {
  events: MatchEvent[];
  stats: MatchStat[];
}

export interface StandingRow {
  rank: number;
  team: Team;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string; // oldest → newest, letters W/D/L
}

export interface Scorer {
  player: Localized;
  team: Team;
  goals: number;
}

export interface DataProvider {
  source: "sample" | "api-football" | "football-data" | "mixed";
  fixtures(date: string): Promise<Match[]>;
  match(id: string): Promise<MatchDetail | null>;
  standings(league: LeagueKey): Promise<StandingRow[]>;
  scorers(league: LeagueKey): Promise<Scorer[]>;
}
