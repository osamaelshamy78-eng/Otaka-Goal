"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the page's server data every 30 seconds while something is live.
export function LiveRefresh({ active, every = 30 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every * 1000);
    return () => clearInterval(id);
  }, [active, every, router]);
  return null;
}
