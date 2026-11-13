import type { MetadataRoute } from "next";

// Every calendar day is a separate URL and each one costs a data-provider request,
// so crawlers get the main pages only.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/ar", "/en"], disallow: ["/*?*date=", "/*?*league=", "/ar/match/", "/en/match/"] },
    host: "https://goal.mambz.com",
  };
}
