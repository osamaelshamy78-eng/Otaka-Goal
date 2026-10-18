import type { Team } from "./types";

type Row = [code: string, ar: string, en: string, color: string, text: string, aliases?: string[]];

// Clubs covered by the sample data. The Arabic names are also used to translate
// API-Football team names, matched on the English name or any alias.
const ROWS: Row[] = [
  ["ARS", "أرسنال", "Arsenal", "#E20E17", "#fff"],
  ["MCI", "مانشستر سيتي", "Manchester City", "#6CABDD", "#0B2545"],
  ["LIV", "ليفربول", "Liverpool", "#C8102E", "#fff"],
  ["CHE", "تشيلسي", "Chelsea", "#034694", "#fff"],
  ["TOT", "توتنهام", "Tottenham", "#F2F2F2", "#132257", ["Tottenham Hotspur"]],
  ["MUN", "مانشستر يونايتد", "Manchester United", "#DA291C", "#FBE122"],
  ["NEW", "نيوكاسل", "Newcastle", "#241F20", "#fff", ["Newcastle United"]],
  ["AVL", "أستون فيلا", "Aston Villa", "#670E36", "#95BFE5"],
  ["RMA", "ريال مدريد", "Real Madrid", "#FFFFFF", "#B8901B"],
  ["BAR", "برشلونة", "Barcelona", "#A50044", "#EDBB00", ["FC Barcelona"]],
  ["ATM", "أتلتيكو مدريد", "Atletico Madrid", "#CB3524", "#fff", ["Atlético Madrid", "Atletico de Madrid"]],
  ["ATH", "أتلتيك بلباو", "Athletic Club", "#EE2523", "#fff", ["Athletic Bilbao"]],
  ["VIL", "فياريال", "Villarreal", "#FFE667", "#005187"],
  ["BET", "ريال بيتيس", "Real Betis", "#00954C", "#fff"],
  ["RSO", "ريال سوسيداد", "Real Sociedad", "#0067B1", "#fff"],
  ["SEV", "إشبيلية", "Sevilla", "#F4F4F4", "#D81E05"],
  ["INT", "إنتر ميلان", "Inter", "#0068A8", "#fff", ["Inter Milan", "Internazionale"]],
  ["MIL", "ميلان", "AC Milan", "#FB090B", "#111", ["Milan"]],
  ["JUV", "يوفنتوس", "Juventus", "#1A1A1A", "#fff"],
  ["NAP", "نابولي", "Napoli", "#12A0D7", "#fff"],
  ["ROM", "روما", "AS Roma", "#8E1F2F", "#F0BC42", ["Roma"]],
  ["ATA", "أتالانتا", "Atalanta", "#1E71B8", "#111"],
  ["LAZ", "لاتسيو", "Lazio", "#87D8F7", "#0B2545"],
  ["COM", "كومو", "Como", "#1B3A6B", "#fff"],
  ["AHL", "الأهلي", "Al Ahly", "#D2232A", "#fff"],
  ["ZAM", "الزمالك", "Zamalek", "#FFFFFF", "#D2232A", ["Zamalek SC"]],
  ["PYR", "بيراميدز", "Pyramids", "#0E2B5C", "#7FB2E5", ["Pyramids FC"]],
  ["MAS", "المصري", "Al Masry", "#0B7A3E", "#fff", ["Al Masry SC"]],
  ["ISM", "الإسماعيلي", "Ismaily", "#FFD200", "#0B5E2E", ["Ismaily SC"]],
  ["CER", "سيراميكا كليوباترا", "Ceramica Cleopatra", "#F28C28", "#1A1A1A"],
  ["SMO", "سموحة", "Smouha", "#1565C0", "#fff", ["Smouha SC"]],
  ["ZED", "زد", "ZED", "#00A651", "#fff", ["ZED FC"]],
  ["HIL", "الهلال", "Al Hilal", "#005EB8", "#fff", ["Al-Hilal Saudi FC", "Al-Hilal"]],
  ["NAS", "النصر", "Al Nassr", "#FFD100", "#0B2A5B", ["Al-Nassr"]],
  ["ITT", "الاتحاد", "Al Ittihad", "#F7D117", "#111", ["Al-Ittihad FC", "Al-Ittihad"]],
  ["AHS", "الأهلي السعودي", "Al Ahli Saudi", "#006A3B", "#fff", ["Al-Ahli Jeddah", "Al Ahli Jeddah"]],
  ["QAD", "القادسية", "Al Qadsiah", "#C8102E", "#F2C94C", ["Al-Qadisiyah FC", "Al Qadisiyah"]],
  ["TAA", "التعاون", "Al Taawoun", "#F6C700", "#1A1A1A", ["Al-Taawoun"]],
  ["ETT", "الاتفاق", "Al Ettifaq", "#1B7F3A", "#E53935", ["Al-Ettifaq"]],
  ["SHB", "الشباب", "Al Shabab", "#F4F4F4", "#111", ["Al-Shabab"]],
  ["AIN", "العين", "Al Ain", "#6A1B9A", "#fff"],
  ["SAH", "شباب الأهلي", "Shabab Al Ahli", "#B71C1C", "#fff", ["Shabab Al-Ahli"]],
  ["WAH", "الوحدة", "Al Wahda", "#8B1E3F", "#fff", ["Al-Wahda"]],
  ["JAZ", "الجزيرة", "Al Jazira", "#1A1A1A", "#E53935", ["Al-Jazira"]],
  ["SHJ", "الشارقة", "Sharjah", "#FFFFFF", "#E30613", ["Al Sharjah"]],
  ["WSL", "الوصل", "Al Wasl", "#FFD100", "#111", ["Al-Wasl"]],
  ["NSR", "النصر الإماراتي", "Al Nasr", "#0D47A1", "#FFD100", ["Al-Nasr Dubai", "Al Nasr Dubai"]],
  ["BNY", "بني ياس", "Baniyas", "#6EC1E4", "#0B2545", ["Bani Yas"]],
  ["BAY", "بايرن ميونخ", "Bayern Munich", "#DC052D", "#fff", ["Bayern München"]],
  ["PSG", "باريس سان جيرمان", "Paris Saint Germain", "#004170", "#fff", ["Paris Saint-Germain", "PSG"]],
  ["DOR", "بوروسيا دورتموند", "Borussia Dortmund", "#FDE100", "#111"],
];

export const TEAMS: Record<string, Team> = Object.fromEntries(
  ROWS.map(([code, ar, en, color, text]) => [code, { id: code, code, name: { ar, en }, color, textColor: text }]),
);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[-.]/g, " ").replace(/\b(fc|sc|cf|club)\b/g, "").replace(/\s+/g, " ").trim();

const BY_NAME = new Map<string, Row>();
for (const row of ROWS) for (const n of [row[2], ...(row[5] ?? [])]) BY_NAME.set(norm(n), row);

export function knownTeam(englishName: string): Row | undefined {
  return BY_NAME.get(norm(englishName));
}
