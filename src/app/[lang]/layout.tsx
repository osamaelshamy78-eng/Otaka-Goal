import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HeaderNav } from "@/components/HeaderNav";
import { Logo } from "@/components/Logo";
import { data } from "@/lib/data";
import { dict, dir, isLang, LANGS } from "@/lib/i18n";
import { cairoToday } from "@/lib/time";
import "../globals.css";

const readex = Readex_Pro({ subsets: ["arabic", "latin"], weight: ["500", "600", "700"], variable: "--font-readex" });
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600"], variable: "--font-plex" });

export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = dict(isLang(lang) ? lang : "ar");
  return {
    title: { default: `Otaka Goal | ${t.tagline}`, template: "%s | Otaka Goal" },
    description: lang === "en"
      ? "Live scores, fixtures, standings and top scorers for the Champions League, Premier League, LaLiga, Serie A and the Egyptian, Saudi and UAE leagues."
      : "نتائج مباشرة ومواعيد وترتيب وهدافين لدوري أبطال أوروبا والدوري الإنجليزي والإسباني والإيطالي والمصري والسعودي والإماراتي.",
    alternates: { languages: { ar: "/ar", en: "/en" } },
  };
}

export const viewport: Viewport = { themeColor: "#0E2A33", viewportFit: "cover" };

async function liveCount() {
  try {
    const today = await data.fixtures(cairoToday());
    return today.filter((m) => m.status === "live" || m.status === "ht").length;
  } catch {
    return 0;
  }
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const live = await liveCount();

  return (
    <html lang={lang} dir={dir(lang)} className={`${readex.variable} ${plex.variable}`}>
      <body>
        <header className="site-header">
          <div className="wrap hrow">
            <a href={`/${lang}`} aria-label="Otaka Goal"><Logo /></a>
            {live > 0 && <div className="livecount"><span className="dot" />{t.liveNow(live)}</div>}
            <Suspense><HeaderNav lang={lang} /></Suspense>
          </div>
        </header>
        <div className="wrap">
          {children}
          <footer><p>{data.source === "sample" ? t.footerSample : t.footerLive}</p></footer>
        </div>
      </body>
    </html>
  );
}
