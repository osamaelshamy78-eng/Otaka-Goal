import { LEAGUES } from "../leagues";
import { TEAMS } from "../teams";
import { cairoDateTime, weekday } from "../time";
import type {
  DataProvider, LeagueKey, Localized, Match, MatchDetail, MatchEvent, MatchStat, Scorer, StandingRow, Status,
} from "../types";

// Sample data used until an API-Football key is configured. Fixtures are generated
// for any date of the 2026/27 season, seeded by the date so a day never changes,
// and their status follows the real clock: matches go live at kickoff and finish ~2h later.

const SEASON_START = "2026-08-14";
const SEASON_END = "2027-05-30";
const UCL_DATES = new Set([
  "2026-09-15", "2026-09-16", "2026-09-29", "2026-09-30", "2026-10-20", "2026-10-21", "2026-11-03", "2026-11-04",
  "2026-11-24", "2026-11-25", "2026-12-08", "2026-12-09", "2027-01-19", "2027-01-20", "2027-01-27",
]);
// matches per weekday (0 = Sunday)
const PLAN: Record<Exclude<LeagueKey, "ucl">, Record<number, number>> = {
  epl: { 5: 1, 6: 4, 0: 3, 1: 1 },
  laliga: { 5: 1, 6: 3, 0: 3, 1: 1 },
  seriea: { 5: 1, 6: 3, 0: 3, 1: 1 },
  egy: { 4: 2, 5: 2, 6: 2, 0: 2, 1: 1 },
  spl: { 4: 2, 5: 3, 6: 3 },
  uae: { 5: 2, 6: 2, 0: 2 },
};
const SLOTS: Record<LeagueKey, string[]> = {
  ucl: ["19:45", "22:00", "22:00", "22:00"],
  epl: ["14:30", "17:00", "17:00", "19:30"],
  laliga: ["15:00", "17:15", "19:30", "22:00"],
  seriea: ["13:30", "16:00", "19:00", "21:45"],
  egy: ["17:00", "20:00"],
  spl: ["17:35", "19:00", "21:00"],
  uae: ["17:00", "19:30"],
};

// [code, played, won, drawn, lost, goals for, goals against, form oldest→newest]
type TableRow = [string, number, number, number, number, number, number, string];
const TABLES: Record<LeagueKey, TableRow[]> = {
  ucl: [["BAY", 2, 2, 0, 0, 7, 1, "WW"], ["ARS", 2, 2, 0, 0, 5, 0, "WW"], ["RMA", 2, 2, 0, 0, 5, 1, "WW"], ["INT", 2, 2, 0, 0, 4, 1, "WW"], ["PSG", 2, 1, 1, 0, 4, 2, "WD"], ["LIV", 2, 1, 1, 0, 3, 2, "DW"], ["BAR", 2, 1, 0, 1, 4, 3, "LW"], ["MCI", 2, 1, 0, 1, 3, 3, "WL"], ["NAP", 2, 1, 0, 1, 2, 2, "WL"], ["DOR", 2, 0, 1, 1, 2, 4, "DL"]],
  epl: [["ARS", 8, 6, 1, 1, 16, 5, "WWDWW"], ["MCI", 8, 6, 0, 2, 19, 8, "WLWWW"], ["LIV", 8, 5, 2, 1, 15, 8, "WDWLW"], ["CHE", 8, 4, 3, 1, 14, 8, "DWWDW"], ["TOT", 8, 4, 2, 2, 12, 9, "WLWWD"], ["AVL", 8, 4, 1, 3, 10, 9, "WWLWL"], ["NEW", 8, 3, 3, 2, 10, 8, "DLWDD"], ["MUN", 8, 3, 2, 3, 11, 12, "LWDLW"]],
  laliga: [["RMA", 9, 8, 0, 1, 22, 8, "WWWLW"], ["BAR", 9, 7, 1, 1, 25, 10, "WWDWW"], ["ATM", 9, 6, 2, 1, 17, 7, "DWWWW"], ["VIL", 9, 5, 2, 2, 14, 9, "WLWDW"], ["BET", 9, 4, 4, 1, 13, 9, "DDWWD"], ["ATH", 9, 4, 2, 3, 10, 9, "LWDWL"], ["RSO", 9, 3, 3, 3, 11, 11, "DLWDL"], ["SEV", 9, 3, 2, 4, 12, 14, "WLLDL"]],
  seriea: [["NAP", 7, 5, 1, 1, 12, 5, "WWDWL"], ["INT", 7, 5, 0, 2, 16, 8, "LWWWW"], ["MIL", 7, 4, 2, 1, 11, 6, "WDWWL"], ["JUV", 7, 4, 2, 1, 10, 5, "DWWDW"], ["ROM", 7, 4, 1, 2, 8, 5, "WLWWD"], ["ATA", 7, 3, 3, 1, 12, 8, "DDWWD"], ["COM", 7, 3, 2, 2, 10, 8, "WDLWD"], ["LAZ", 7, 3, 1, 3, 9, 9, "LWLWD"]],
  egy: [["AHL", 10, 7, 2, 1, 18, 6, "WWDWW"], ["PYR", 10, 7, 1, 2, 17, 7, "WLWWW"], ["ZAM", 10, 6, 3, 1, 15, 7, "DWWDW"], ["MAS", 10, 5, 3, 2, 12, 8, "WDWLD"], ["CER", 10, 5, 2, 3, 13, 10, "LWWDW"], ["ZED", 10, 4, 4, 2, 11, 9, "DDWLD"], ["SMO", 10, 3, 4, 3, 9, 10, "DLDWL"], ["ISM", 10, 2, 4, 4, 7, 11, "LDLDW"]],
  spl: [["HIL", 6, 5, 1, 0, 15, 4, "WWDWW"], ["NAS", 6, 5, 0, 1, 17, 6, "WWWLW"], ["ITT", 6, 4, 2, 0, 13, 6, "DWWWD"], ["AHS", 6, 4, 1, 1, 11, 5, "WDWWL"], ["QAD", 6, 3, 2, 1, 10, 7, "WDLWD"], ["TAA", 6, 3, 1, 2, 9, 8, "LWWDL"], ["ETT", 6, 2, 2, 2, 8, 8, "DLWDW"], ["SHB", 6, 2, 1, 3, 7, 9, "LWLDL"]],
  uae: [["AIN", 6, 5, 1, 0, 14, 4, "WWWDW"], ["SAH", 6, 4, 2, 0, 12, 5, "DWWDW"], ["WAH", 6, 4, 0, 2, 11, 7, "WLWWL"], ["SHJ", 6, 3, 2, 1, 10, 7, "WDWDL"], ["JAZ", 6, 3, 1, 2, 9, 8, "LWDWW"], ["WSL", 6, 2, 3, 1, 8, 7, "DDWLD"], ["NSR", 6, 2, 1, 3, 7, 9, "LWLDW"], ["BNY", 6, 1, 2, 3, 5, 10, "LDLDL"]],
};

const P = (ar: string, en: string): Localized => ({ ar, en });
// A few players per club, used for scorers and match events.
const SQUADS: Record<string, Localized[]> = {
  ARS: [P("بوكايو ساكا", "Bukayo Saka"), P("فيكتور جيوكيريس", "Viktor Gyökeres"), P("ديكلان رايس", "Declan Rice")],
  MCI: [P("إيرلينغ هالاند", "Erling Haaland"), P("فيل فودين", "Phil Foden"), P("رودري", "Rodri")],
  LIV: [P("محمد صلاح", "Mohamed Salah"), P("ألكسندر إيزاك", "Alexander Isak"), P("فلوريان فيرتز", "Florian Wirtz")],
  CHE: [P("كول بالمر", "Cole Palmer"), P("جواو بيدرو", "João Pedro"), P("إنزو فرنانديز", "Enzo Fernández")],
  TOT: [P("دومينيك سولانكي", "Dominic Solanke"), P("محمد قدوس", "Mohammed Kudus")],
  MUN: [P("برونو فرنانديز", "Bruno Fernandes"), P("برايان مبيومو", "Bryan Mbeumo")],
  NEW: [P("أنتوني غوردون", "Anthony Gordon"), P("برونو غيمارايش", "Bruno Guimarães")],
  AVL: [P("أولي واتكينز", "Ollie Watkins"), P("جون ماكجين", "John McGinn")],
  RMA: [P("كيليان مبابي", "Kylian Mbappé"), P("فينيسيوس جونيور", "Vinícius Júnior"), P("جود بيلينغهام", "Jude Bellingham")],
  BAR: [P("روبرت ليفاندوفسكي", "Robert Lewandowski"), P("لامين يامال", "Lamine Yamal"), P("رافينيا", "Raphinha")],
  ATM: [P("جوليان ألفاريز", "Julián Álvarez"), P("أنطوان غريزمان", "Antoine Griezmann")],
  ATH: [P("نيكو ويليامز", "Nico Williams"), P("أويهان سانسيت", "Oihan Sancet")],
  VIL: [P("جيرارد مورينو", "Gerard Moreno"), P("تاجو بوكانان", "Tajon Buchanan")],
  BET: [P("إيسكو", "Isco"), P("أنتوني", "Antony")],
  RSO: [P("ميكيل أويارزابال", "Mikel Oyarzabal"), P("تاكيفوسا كوبو", "Takefusa Kubo")],
  SEV: [P("إسحاق روميرو", "Isaac Romero"), P("دودي لوكيباكيو", "Dodi Lukébakio")],
  INT: [P("لاوتارو مارتينيز", "Lautaro Martínez"), P("ماركوس تورام", "Marcus Thuram")],
  MIL: [P("كريستيان بوليسيتش", "Christian Pulisic"), P("رافاييل لياو", "Rafael Leão")],
  JUV: [P("دوشان فلاهوفيتش", "Dušan Vlahović"), P("كينان يلدز", "Kenan Yıldız")],
  NAP: [P("سكوت ماكتوميناي", "Scott McTominay"), P("روميلو لوكاكو", "Romelu Lukaku")],
  ROM: [P("أرتيم دوفبيك", "Artem Dovbyk"), P("باولو ديبالا", "Paulo Dybala")],
  ATA: [P("أديمولا لوكمان", "Ademola Lookman"), P("شارل دي كيتيلاري", "Charles De Ketelaere")],
  LAZ: [P("تشيرو إيموبيلي", "Ciro Immobile"), P("ماتيا زاكاني", "Mattia Zaccagni")],
  COM: [P("نيكو باز", "Nico Paz"), P("باتريك كوتروني", "Patrick Cutrone")],
  AHL: [P("إمام عاشور", "Emam Ashour"), P("محمد شريف", "Mohamed Sherif"), P("حسين الشحات", "Hussein El Shahat")],
  ZAM: [P("ناصر منسي", "Nasser Mansi"), P("محمد شحاتة", "Mohamed Shehata")],
  PYR: [P("فيستون ماييلي", "Fiston Mayele"), P("رمضان صبحي", "Ramadan Sobhi")],
  MAS: [P("مروان حمدي", "Marwan Hamdy"), P("صلاح محسن", "Salah Mohsen")],
  ISM: [P("عبد الرحمن مجدي", "Abdelrahman Magdy")],
  CER: [P("فخر الدين بن يوسف", "Fakhreddine Ben Youssef")],
  SMO: [P("أحمد مدبولي", "Ahmed Madbouly")],
  ZED: [P("محمد حمدي", "Mohamed Hamdy")],
  HIL: [P("داروين نونيز", "Darwin Núñez"), P("سالم الدوسري", "Salem Al-Dawsari")],
  NAS: [P("كريستيانو رونالدو", "Cristiano Ronaldo"), P("جواو فيليكس", "João Félix"), P("ساديو ماني", "Sadio Mané")],
  ITT: [P("كريم بنزيما", "Karim Benzema"), P("موسى ديابي", "Moussa Diaby"), P("فابينيو", "Fabinho")],
  AHS: [P("إيفان توني", "Ivan Toney"), P("رياض محرز", "Riyad Mahrez")],
  QAD: [P("بيير إيميريك أوباميانغ", "Pierre-Emerick Aubameyang")],
  TAA: [P("روجر مارتينيز", "Roger Martínez")],
  ETT: [P("موسى ديمبيلي", "Moussa Dembélé")],
  SHB: [P("يانيك كاراسكو", "Yannick Carrasco")],
  AIN: [P("سفيان رحيمي", "Soufiane Rahimi"), P("لابا كودجو", "Laba Kodjo")],
  SAH: [P("يحيى الغساني", "Yahya Al-Ghassani"), P("غييرمي بالا", "Guilherme Bala")],
  WAH: [P("عمر خريبين", "Omar Al Somah")],
  JAZ: [P("علي مبخوت", "Ali Mabkhout")],
  SHJ: [P("عثمان كامارا", "Ousmane Camara")],
  WSL: [P("فابيو ليما", "Fábio Lima")],
  NSR: [P("طارق تيسودالي", "Tarik Tissoudali")],
  BNY: [P("جوناتاس", "Jonatas")],
  BAY: [P("هاري كين", "Harry Kane"), P("جمال موسيالا", "Jamal Musiala")],
  PSG: [P("عثمان ديمبيلي", "Ousmane Dembélé"), P("خفيتشا كفاراتسخيليا", "Khvicha Kvaratskhelia")],
  DOR: [P("سيرهو غيراسي", "Serhou Guirassy"), P("كريم أديمي", "Karim Adeyemi")],
};

const SCORERS: Record<LeagueKey, [string, number, number][]> = {
  // [club, squad index, goals]
  ucl: [["RMA", 0, 4], ["BAY", 0, 3], ["MCI", 0, 3], ["INT", 1, 2], ["ARS", 0, 2]],
  epl: [["MCI", 0, 9], ["LIV", 0, 6], ["ARS", 1, 5], ["CHE", 0, 4], ["AVL", 0, 4]],
  laliga: [["RMA", 0, 10], ["BAR", 0, 6], ["BAR", 1, 5], ["ATM", 0, 5], ["RSO", 0, 4]],
  seriea: [["INT", 0, 6], ["NAP", 0, 5], ["MIL", 0, 4], ["JUV", 0, 4], ["ROM", 0, 3]],
  egy: [["PYR", 0, 7], ["ZAM", 0, 5], ["AHL", 0, 4], ["AHL", 1, 4], ["MAS", 0, 3]],
  spl: [["NAS", 0, 8], ["HIL", 0, 6], ["ITT", 0, 5], ["AHS", 0, 5], ["NAS", 1, 4]],
  uae: [["AIN", 0, 7], ["WSL", 0, 5], ["SAH", 0, 5], ["JAZ", 0, 4], ["SHJ", 0, 3]],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const pickOne = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

interface Plan { base: Match; goals: MatchEvent[]; cards: MatchEvent[]; stats: MatchStat[] }

function plansFor(date: string): Plan[] {
  if (date < SEASON_START || date > SEASON_END) return [];
  const out: Plan[] = [];
  for (const { key } of LEAGUES) {
    const n = key === "ucl" ? (UCL_DATES.has(date) ? 4 : 0) : PLAN[key][weekday(date)] ?? 0;
    if (!n) continue;
    const r = rng(hash(date + key));
    const clubs = TABLES[key].map((row) => row[0]);
    for (let i = clubs.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [clubs[i], clubs[j]] = [clubs[j], clubs[i]];
    }
    for (let i = 0; i < n; i++) {
      const home = TEAMS[clubs[i * 2]], away = TEAMS[clubs[i * 2 + 1]];
      const goals: MatchEvent[] = [], cards: MatchEvent[] = [];
      const g = () => [0, 0, 1, 1, 1, 2, 2, 3][Math.floor(r() * 8)];
      for (const [side, club, count] of [["home", home.code, g()], ["away", away.code, g()]] as const) {
        for (let k = 0; k < count; k++) {
          const pen = r() < 0.12;
          goals.push({ minute: 1 + Math.floor(r() * 90), type: pen ? "pen" : "goal", side, player: pickOne(r, SQUADS[club]) });
        }
        for (let k = Math.floor(r() * 3); k > 0; k--) {
          cards.push({ minute: 5 + Math.floor(r() * 85), type: "yellow", side, player: pickOne(r, SQUADS[club]) });
        }
      }
      const pos = 38 + Math.floor(r() * 25), sh = 7 + Math.floor(r() * 11), sa = 5 + Math.floor(r() * 11);
      out.push({
        base: {
          id: `s-${date}-${key}-${i}`, league: key, kickoff: cairoDateTime(date, SLOTS[key][Math.min(i, SLOTS[key].length - 1)]),
          status: "ns", home, away, score: null,
        },
        goals, cards,
        stats: [
          { key: "possession", home: pos, away: 100 - pos },
          { key: "shots", home: sh, away: sa },
          { key: "onTarget", home: Math.ceil(sh / 3), away: Math.ceil(sa / 3) },
          { key: "corners", home: 1 + Math.floor(r() * 8), away: 1 + Math.floor(r() * 8) },
          { key: "fouls", home: 6 + Math.floor(r() * 9), away: 6 + Math.floor(r() * 9) },
        ],
      });
    }
  }
  return out;
}

// Match clock: 45' first half, 15' break, then the second half; full time after ~110' of real time.
function clock(kickoff: string, now: number): { status: Status; minute?: number } {
  const elapsed = Math.floor((now - new Date(kickoff).getTime()) / 60000);
  if (elapsed < 0) return { status: "ns" };
  if (elapsed < 47) return { status: "live", minute: elapsed + 1 };
  if (elapsed < 62) return { status: "ht", minute: 45 };
  if (elapsed < 110) return { status: "live", minute: Math.min(elapsed - 16, 94) };
  return { status: "ft" };
}

function realize(plan: Plan, now = Date.now()): MatchDetail {
  const { status, minute } = clock(plan.base.kickoff, now);
  const upTo = status === "ft" ? 999 : minute ?? 0;
  const happened = (e: MatchEvent) => status !== "ns" && e.minute <= upTo;
  const goals = plan.goals.filter(happened);
  const events = [...goals, ...plan.cards.filter(happened)].sort((a, b) => a.minute - b.minute);
  const share = status === "ft" ? 1 : Math.min(upTo / 90, 1);
  return {
    ...plan.base, status, minute,
    score: status === "ns" ? null : [goals.filter((e) => e.side === "home").length, goals.filter((e) => e.side === "away").length],
    events,
    stats: status === "ns" ? [] : plan.stats.map((s) => (s.key === "possession" ? s : { ...s, home: Math.round(s.home * share), away: Math.round(s.away * share) })),
  };
}

export const sample: DataProvider = {
  source: "sample",
  async fixtures(date) {
    return plansFor(date).map((p) => {
      const { events: _e, stats: _s, ...match } = realize(p);
      return match;
    });
  },
  async match(id) {
    const m = id.match(/^s-(\d{4}-\d{2}-\d{2})-([a-z]+)-(\d+)$/);
    if (!m) return null;
    const plan = plansFor(m[1]).find((p) => p.base.id === id);
    return plan ? realize(plan) : null;
  },
  async standings(league): Promise<StandingRow[]> {
    return TABLES[league]
      .map(([code, played, win, draw, loss, goalsFor, goalsAgainst, form]) => ({
        rank: 0, team: TEAMS[code], played, win, draw, loss, goalsFor, goalsAgainst, points: win * 3 + draw, form,
      }))
      .sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  },
  async scorers(league): Promise<Scorer[]> {
    return SCORERS[league].map(([club, idx, goals]) => ({ player: SQUADS[club][idx], team: TEAMS[club], goals }));
  },
};
