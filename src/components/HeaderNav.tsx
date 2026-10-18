"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export function HeaderNav({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const path = usePathname();
  const query = useSearchParams().toString();
  const rest = path.replace(/^\/(ar|en)/, "");
  const other: Lang = lang === "ar" ? "en" : "ar";
  const links = [
    { href: `/${lang}`, label: t.nav.matches, active: rest === "" || rest.startsWith("/match") },
    { href: `/${lang}/standings`, label: t.nav.standings, active: rest.startsWith("/standings") },
    { href: `/${lang}/scorers`, label: t.nav.scorers, active: rest.startsWith("/scorers") },
  ];
  return (
    <nav className="hnav">
      <div className="views">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.active ? "page" : undefined}>{l.label}</Link>
        ))}
      </div>
      <Link className="langswitch" href={`/${other}${rest}${query ? `?${query}` : ""}`} hrefLang={other} lang={other}>
        {t.switchLang}
      </Link>
    </nav>
  );
}
