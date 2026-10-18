import type { LeagueKey, Localized } from "./types";

export interface Broadcaster {
  name: Localized;
  url?: string;
}

export interface League {
  key: LeagueKey;
  apiId: number; // API-Football league id
  name: Localized;
  short: Localized;
  color: string;
  broadcasters: Broadcaster[];
  zone: number; // top N rows highlighted in the table
  zoneLabel: Localized;
}

const BEIN: Broadcaster = { name: { ar: "beIN SPORTS", en: "beIN SPORTS" }, url: "https://www.beinsports.com" };
const TOD: Broadcaster = { name: { ar: "TOD", en: "TOD" }, url: "https://www.tod.tv" };
const UCL_ZONE = { ar: "دوري أبطال أوروبا", en: "Champions League" };
const ACL_ZONE = { ar: "دوري أبطال آسيا للنخبة", en: "AFC Champions League Elite" };

// Broadcasters are a starting point only: confirm current rights holders before launch.
export const LEAGUES: League[] = [
  {
    key: "ucl", apiId: 2, color: "#1E3A8A",
    name: { ar: "دوري أبطال أوروبا", en: "UEFA Champions League" },
    short: { ar: "أبطال أوروبا", en: "Champions League" },
    broadcasters: [BEIN, TOD], zone: 8,
    zoneLabel: { ar: "التأهل المباشر لدور الـ16", en: "Direct qualification to round of 16" },
  },
  {
    key: "epl", apiId: 39, color: "#6B2C91",
    name: { ar: "الدوري الإنجليزي الممتاز", en: "Premier League" },
    short: { ar: "الإنجليزي", en: "Premier League" },
    broadcasters: [BEIN, TOD], zone: 4, zoneLabel: UCL_ZONE,
  },
  {
    key: "laliga", apiId: 140, color: "#E8452C",
    name: { ar: "الدوري الإسباني", en: "LaLiga" },
    short: { ar: "الإسباني", en: "LaLiga" },
    broadcasters: [BEIN, TOD], zone: 4, zoneLabel: UCL_ZONE,
  },
  {
    key: "seriea", apiId: 135, color: "#0A7BC2",
    name: { ar: "الدوري الإيطالي", en: "Serie A" },
    short: { ar: "الإيطالي", en: "Serie A" },
    broadcasters: [BEIN, TOD], zone: 4, zoneLabel: UCL_ZONE,
  },
  {
    key: "egy", apiId: 233, color: "#C8102E",
    name: { ar: "الدوري المصري الممتاز", en: "Egyptian Premier League" },
    short: { ar: "المصري", en: "Egyptian" },
    broadcasters: [{ name: { ar: "أون تايم سبورتس", en: "ON Time Sports" } }], zone: 2,
    zoneLabel: { ar: "دوري أبطال أفريقيا", en: "CAF Champions League" },
  },
  {
    key: "spl", apiId: 307, color: "#1B8A4C",
    name: { ar: "دوري روشن السعودي", en: "Saudi Pro League" },
    short: { ar: "السعودي", en: "Saudi" },
    broadcasters: [{ name: { ar: "شاهد", en: "Shahid" }, url: "https://shahid.mbc.net" }, { name: { ar: "SSC", en: "SSC" } }],
    zone: 3, zoneLabel: ACL_ZONE,
  },
  {
    key: "uae", apiId: 301, color: "#B08D2C",
    name: { ar: "دوري أدنوك للمحترفين", en: "UAE Pro League" },
    short: { ar: "الإماراتي", en: "UAE" },
    broadcasters: [{ name: { ar: "أبوظبي الرياضية", en: "AD Sports" } }, { name: { ar: "دبي الرياضية", en: "Dubai Sports" } }],
    zone: 2, zoneLabel: ACL_ZONE,
  },
];

export const LEAGUE_KEYS = LEAGUES.map((l) => l.key);
export const leagueByKey = (key: LeagueKey) => LEAGUES.find((l) => l.key === key)!;
export const leagueByApiId = (id: number) => LEAGUES.find((l) => l.apiId === id);
export const isLeagueKey = (v: unknown): v is LeagueKey => typeof v === "string" && (LEAGUE_KEYS as string[]).includes(v);
