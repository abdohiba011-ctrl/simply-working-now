// Single source of truth for converting between city display names and URL slugs.
// Keeps all city/neighborhood routing consistent so we never mix one city's
// neighborhoods into another (e.g. Casablanca neighborhoods leaking into Marrakech).

export const CITY_SLUGS: Record<string, string> = {
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

export function cityToSlug(city: string): string {
  if (!city) return "";
  const key = city.trim().toLowerCase();
  return CITY_SLUGS[key] || key.replace(/\s+/g, "-");
}

export function slugToCityLabel(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
