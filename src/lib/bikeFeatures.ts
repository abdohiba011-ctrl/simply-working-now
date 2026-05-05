// Shared map for bike "What's included" features.
// Wizard writes the keys to bike_types.features (text[]); BikeCard and
// BikeDetails read the same keys to render icon + label.
//
// NOTE: renter-facing surfaces should NOT show emoji icons. The `icon`
// field is kept (string) for backwards compatibility with the agency
// wizard / admin views, but renter components now render lucide icons
// (see RENTER_FEATURE_ICONS below).

import type { LucideIcon } from "lucide-react";
import {
  HardHat,
  Lock,
  Smartphone,
  Briefcase,
  CloudRain,
  Hand,
  MapPin,
  Plug,
  Shield,
  Shirt,
  Wrench,
} from "lucide-react";

export type FeatureKey =
  | "helmet"
  | "lock"
  | "phone_holder"
  | "top_case"
  | "rain_gear"
  | "gloves"
  | "gps"
  | "usb_charger"
  | "guards"
  | "vest"
  | "toolkit";

export const FEATURE_LABELS: Record<FeatureKey, { icon: string; label: string }> = {
  helmet:       { icon: "🪖", label: "Helmet(s) provided" },
  lock:         { icon: "🔒", label: "U-lock / chain lock" },
  phone_holder: { icon: "📱", label: "Phone holder" },
  top_case:     { icon: "🎒", label: "Top case / storage" },
  rain_gear:    { icon: "🌧️", label: "Rain gear" },
  gloves:       { icon: "🧤", label: "Gloves" },
  gps:          { icon: "📍", label: "GPS device" },
  usb_charger:  { icon: "🔌", label: "USB charger" },
  guards:       { icon: "🛡️", label: "Knee/elbow guards" },
  vest:         { icon: "🦺", label: "Reflective vest" },
  toolkit:      { icon: "🧰", label: "Basic toolkit" },
};

// Lucide icons for renter-facing surfaces (no emojis).
export const RENTER_FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  helmet:       HardHat,
  lock:         Lock,
  phone_holder: Smartphone,
  top_case:     Briefcase,
  rain_gear:    CloudRain,
  gloves:       Hand,
  gps:          MapPin,
  usb_charger:  Plug,
  guards:       Shield,
  vest:         Shirt,
  toolkit:      Wrench,
};

export const FEATURE_ORDER: FeatureKey[] = [
  "helmet", "lock", "phone_holder", "top_case", "rain_gear",
  "gloves", "gps", "usb_charger", "guards", "vest", "toolkit",
];

export const BIKE_BRANDS = [
  "Honda", "Yamaha", "Kymco", "Vespa", "Peugeot", "Piaggio",
  "Sym", "BMW", "Suzuki", "Other",
] as const;

export const BIKE_CATEGORIES = [
  { key: "scooter",   icon: "🛵", label: "Scooter" },
  { key: "standard",  icon: "🏍️", label: "Standard" },
  { key: "sport",     icon: "🏁", label: "Sport" },
  { key: "electric",  icon: "⚡", label: "Electric" },
  { key: "cruiser",   icon: "🛣️", label: "Cruiser" },
  { key: "adventure", icon: "🌄", label: "Adventure" },
] as const;

export const LICENSE_OPTIONS = [
  { key: "none", label: "No license needed (50cc and under)" },
  { key: "A1",   label: "A1 — Light motorcycles, up to 125cc" },
  { key: "A2",   label: "A2 — Medium, up to 35kW" },
  { key: "A",    label: "A — Full motorcycle license" },
  { key: "B",    label: "B — Car license (only valid for 50cc bikes)" },
] as const;

export function licenseLabel(key?: string | null): string | null {
  if (!key) return null;
  return LICENSE_OPTIONS.find((l) => l.key === key)?.label ?? key;
}

export const CANCELLATION_OPTIONS = [
  {
    key: "flexible",
    icon: "🟢",
    title: "Flexible",
    text: "Full refund up to 24h before pickup",
  },
  {
    key: "moderate",
    icon: "🟡",
    title: "Moderate",
    text: "Full refund up to 2 days before pickup",
  },
  {
    key: "strict",
    icon: "🔴",
    title: "Strict",
    text: "50% refund up to 7 days before pickup",
  },
] as const;

// Plain text — renderer is responsible for any iconography.
export function cancellationText(key?: string | null): string | null {
  const opt = CANCELLATION_OPTIONS.find((o) => o.key === (key || "moderate"));
  return opt ? opt.text : null;
}
