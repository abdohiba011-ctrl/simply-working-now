import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://motonita.ma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CITY_SLUGS: Record<string, string> = {
  casablanca: "casablanca",
  marrakech: "marrakech",
  marrakesh: "marrakech",
  rabat: "rabat",
  tangier: "tangier",
  tanger: "tangier",
  agadir: "agadir",
  fes: "fes",
  fez: "fes",
  dakhla: "dakhla",
  essaouira: "essaouira",
  meknes: "meknes",
  oujda: "oujda",
  tetouan: "tetouan",
  "el jadida": "el-jadida",
  "el-jadida": "el-jadida",
  kenitra: "kenitra",
  nador: "nador",
  ifrane: "ifrane",
  chefchaouen: "chefchaouen",
};

function cityToSlug(name: string): string {
  if (!name) return "";
  const k = name.trim().toLowerCase();
  return CITY_SLUGS[k] || k.replace(/\s+/g, "-");
}

const STATIC_URLS: Array<{
  loc: string;
  changefreq: string;
  priority: string;
}> = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/blog", changefreq: "weekly", priority: "0.85" },
  { loc: "/blog/how-to-rent-motorbike-morocco", changefreq: "monthly", priority: "0.85" },
  { loc: "/blog/motorbike-license-morocco-guide", changefreq: "monthly", priority: "0.85" },
  { loc: "/blog/motorbike-rental-casablanca-neighborhoods", changefreq: "monthly", priority: "0.85" },
  { loc: "/blog/best-motorbike-routes-morocco", changefreq: "monthly", priority: "0.85" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/agencies", changefreq: "monthly", priority: "0.7" },
  { loc: "/affiliate", changefreq: "monthly", priority: "0.7" },
  { loc: "/become-business", changefreq: "monthly", priority: "0.6" },
  { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/cookies", changefreq: "yearly", priority: "0.3" },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const today = new Date().toISOString().slice(0, 10);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const entries: string[] = [];

  // Static URLs
  for (const u of STATIC_URLS) {
    entries.push(urlEntry(`${SITE}${u.loc}`, today, u.changefreq, u.priority));
  }

  // Cities
  try {
    const { data: cities } = await supabase
      .from("service_cities")
      .select("name, updated_at")
      .eq("is_available", true);

    const seen = new Set<string>();
    for (const c of cities ?? []) {
      const slug = cityToSlug((c as { name: string }).name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const lastmod =
        (c as { updated_at?: string }).updated_at?.slice(0, 10) ?? today;
      entries.push(
        urlEntry(`${SITE}/rent/${slug}`, lastmod, "daily", "0.9"),
      );
    }
  } catch (e) {
    console.error("cities query failed", e);
  }

  // Bikes
  try {
    const { data: bikes } = await supabase
      .from("bike_types")
      .select("id, updated_at")
      .eq("is_approved", true)
      .eq("business_status", "active")
      .limit(5000);

    for (const b of bikes ?? []) {
      const id = (b as { id: string }).id;
      const lastmod =
        (b as { updated_at?: string }).updated_at?.slice(0, 10) ?? today;
      entries.push(urlEntry(`${SITE}/bike/${id}`, lastmod, "weekly", "0.8"));
    }
  } catch (e) {
    console.error("bikes query failed", e);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
