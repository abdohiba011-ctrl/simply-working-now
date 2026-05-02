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

// All known display-name variants for a given canonical slug. Used when
// looking up a city in service_cities (which may store either spelling, e.g.
// "Marrakesh" vs "Marrakech", "Tangier" vs "Tanger", "Fes" vs "Fez").
export const CITY_NAME_VARIANTS: Record<string, string[]> = {
  casablanca: ["Casablanca"],
  marrakech: ["Marrakech", "Marrakesh"],
  rabat: ["Rabat"],
  tangier: ["Tangier", "Tanger"],
  agadir: ["Agadir"],
  fes: ["Fes", "Fez"],
  dakhla: ["Dakhla"],
  essaouira: ["Essaouira"],
  meknes: ["Meknes", "Meknès"],
  oujda: ["Oujda"],
  tetouan: ["Tetouan", "Tétouan"],
  "el-jadida": ["El Jadida", "El-Jadida"],
  kenitra: ["Kenitra", "Kénitra"],
  nador: ["Nador"],
  ifrane: ["Ifrane"],
  chefchaouen: ["Chefchaouen"],
};

/** Returns the canonical display variants to try when querying service_cities by name. */
export function slugToCityNameVariants(slug: string): string[] {
  if (!slug) return [];
  const canonical = cityToSlug(slug);
  return CITY_NAME_VARIANTS[canonical] || [slugToCityLabel(canonical)];
}

/** Best-effort label for the page heading: prefers the first known variant. */
export function slugToDisplayName(slug: string): string {
  const variants = slugToCityNameVariants(slug);
  return variants[0] || slugToCityLabel(slug);
}
