import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageOff, MapPin, AlertTriangle } from "lucide-react";
import {
  BIKE_CATEGORIES, FEATURE_LABELS, FeatureKey,
  licenseLabel, CANCELLATION_OPTIONS,
} from "@/lib/bikeFeatures";
import { TIER_MIN_DAYS, TIER_LABELS, tierSavingsPct, type TierMinDays } from "@/lib/pricingTiers";
import {
  formatWorkingHoursSummary, normalizeWorkingHours,
} from "@/lib/workingHours";

export interface BikeDetailData {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  category?: string | null;
  engine_cc?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  mileage_km?: number | null;
  license_required?: string | null;
  min_age?: number | null;
  min_experience_years?: number | null;
  helmets_count?: number | null;
  features?: string[] | null;
  deposit_amount?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  cancellation_policy?: string | null;
  approval_status?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
}

export interface BikeDetailPhoto { id?: string; image_url: string }

export interface BikeDetailAgency {
  business_name?: string | null;
  is_verified?: boolean | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  working_hours?: unknown;
}

export interface BikeDetailPickup {
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  usingAgencyFallback?: boolean;
}

export interface BikeDetailCardProps {
  bike: BikeDetailData;
  photos: BikeDetailPhoto[];
  tiers: { min_days: number; daily_price_mad: number }[];
  agency: BikeDetailAgency | null;
  pickup: BikeDetailPickup | null;
  mode: "agency" | "admin";
}

const empty = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-xs text-right ${empty(value) ? "text-muted-foreground/60" : "font-medium"}`}>
      {empty(value) ? "—" : value}
    </span>
  </div>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </p>
);

export const BikeDetailCard = ({
  bike, photos, tiers, agency, pickup, mode,
}: BikeDetailCardProps) => {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showAllDesc, setShowAllDesc] = useState(false);

  const categoryMeta = BIKE_CATEGORIES.find((c) => c.key === bike.category);
  const cancellationMeta = CANCELLATION_OPTIONS.find(
    (c) => c.key === (bike.cancellation_policy || "moderate"),
  );
  const featureKeys = ((bike.features as string[] | null) || []).filter(
    (f): f is FeatureKey => f in FEATURE_LABELS,
  );

  const tierMap = new Map<number, number>(
    tiers.map((t) => [Number(t.min_days), Number(t.daily_price_mad)]),
  );
  const baseRate = tierMap.get(1) ?? 0;

  const warnings: string[] = [];
  if (mode === "admin") {
    if ((bike.deposit_amount ?? 0) === 0) warnings.push("Deposit = 0 MAD");
    if (photos.length < 4) warnings.push(`Only ${photos.length} photo${photos.length === 1 ? "" : "s"}`);
    if (baseRate > 500) warnings.push("Base rate > 500 MAD/day");
    if (tiers.some((t) => Number(t.min_days) > 1 && baseRate > 0 && Number(t.daily_price_mad) > baseRate))
      warnings.push("A higher-duration tier costs more than base");
    if (baseRate > 0 && tiers.length <= 1) warnings.push("No volume discounts set");
  }

  const wh = agency?.working_hours ? normalizeWorkingHours(agency.working_hours) : null;
  const whSummary = wh ? formatWorkingHoursSummary(wh) : [];

  const desc = bike.description || "";
  const descLong = desc.length > 240;

  return (
    <div className="space-y-3">
      {/* Warnings (admin only) */}
      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-[11px] text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
            >
              <AlertTriangle className="h-3 w-3" /> {w}
            </span>
          ))}
        </div>
      )}

      {/* Rejection reason banner (both modes) */}
      {bike.approval_status === "rejected" && bike.rejection_reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs">
          <span className="font-semibold text-destructive">Rejected: </span>
          <span className="text-foreground/80 whitespace-pre-wrap">{bike.rejection_reason}</span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        {/* LEFT (60%) */}
        <div className="space-y-3">
          {/* Photos */}
          <Card className="p-3">
            <SectionTitle>Photos ({photos.length})</SectionTitle>
            {photos.length === 0 ? (
              <div className="flex h-20 items-center justify-center gap-2 rounded border border-dashed border-border text-xs text-muted-foreground">
                <ImageOff className="h-4 w-4" /> No photos
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {photos.map((p) => (
                  <button
                    key={p.id ?? p.image_url}
                    type="button"
                    onClick={() => setLightbox(p.image_url)}
                    className="overflow-hidden rounded border border-border bg-muted hover:opacity-90"
                    style={{ width: 88, height: 88 }}
                  >
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Description */}
          {!empty(desc) && (
            <Card className="p-3">
              <SectionTitle>Description</SectionTitle>
              <p className={`whitespace-pre-wrap text-xs leading-relaxed ${!showAllDesc && descLong ? "line-clamp-3" : ""}`}>
                {desc}
              </p>
              {descLong && (
                <button
                  className="mt-1 text-[11px] text-primary hover:underline"
                  onClick={() => setShowAllDesc((v) => !v)}
                >
                  {showAllDesc ? "Show less" : "Show more"}
                </button>
              )}
            </Card>
          )}

          {/* Specs */}
          <Card className="p-3">
            <SectionTitle>Specifications</SectionTitle>
            <div className="grid grid-cols-2 gap-x-4">
              <Row label="Brand" value={bike.brand} />
              <Row label="Engine" value={bike.engine_cc ? `${bike.engine_cc} cc` : null} />
              <Row label="Model" value={bike.model} />
              <Row label="Fuel" value={bike.fuel_type} />
              <Row label="Year" value={bike.year} />
              <Row label="Trans." value={bike.transmission} />
              <Row label="Color" value={bike.color} />
              <Row label="Mileage" value={bike.mileage_km != null ? `${Number(bike.mileage_km).toLocaleString()} km` : null} />
              <Row
                label="Category"
                value={categoryMeta ? `${categoryMeta.icon} ${categoryMeta.label}` : bike.category}
              />
              <Row label="License" value={licenseLabel(bike.license_required ?? null)} />
              <Row label="Min age" value={bike.min_age} />
              <Row label="Min exp." value={bike.min_experience_years != null ? `${bike.min_experience_years}y` : null} />
            </div>
          </Card>

          {/* Included */}
          <Card className="p-3">
            <SectionTitle>What's Included</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {(bike.helmets_count ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                  🪖 {bike.helmets_count} helmet{(bike.helmets_count ?? 0) > 1 ? "s" : ""}
                </span>
              )}
              {featureKeys.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                  <span>{FEATURE_LABELS[k].icon}</span> {FEATURE_LABELS[k].label}
                </span>
              ))}
              {featureKeys.length === 0 && (bike.helmets_count ?? 0) === 0 && (
                <span className="text-xs text-muted-foreground">— None specified</span>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT (40%) */}
        <div className="space-y-3">
          {/* Agency */}
          <Card className="p-3">
            <SectionTitle>Agency</SectionTitle>
            {agency ? (
              <div className="space-y-0.5 text-xs">
                <p className="font-medium">
                  {agency.business_name || "—"}{" "}
                  {agency.is_verified && <span className="text-success">✓ Verified</span>}
                </p>
                {agency.phone && <p className="text-muted-foreground">📞 {agency.phone}</p>}
                {agency.city && <p className="text-muted-foreground">📍 {agency.city}</p>}
                {agency.address && <p className="text-muted-foreground">{agency.address}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
            {whSummary.length > 0 && (
              <div className="mt-2 border-t border-border/50 pt-2">
                <p className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Working hours</p>
                {whSummary.map((line) => (
                  <p key={line.label} className="text-[11px] flex justify-between gap-2">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span>{line.value}</span>
                  </p>
                ))}
              </div>
            )}
            {mode === "admin" && bike.created_at && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Submitted {new Date(bike.created_at).toLocaleDateString()}
              </p>
            )}
          </Card>

          {/* Pricing tiers */}
          <Card className="p-3">
            <SectionTitle>Pricing Tiers</SectionTitle>
            <div className="overflow-hidden rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-7 text-[10px]">Days</TableHead>
                    <TableHead className="h-7 text-[10px]">Rate</TableHead>
                    <TableHead className="h-7 text-[10px]">Save</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIER_MIN_DAYS.map((md) => {
                    const rate = tierMap.get(md);
                    const set = rate != null;
                    const pct = set && md > 1 ? tierSavingsPct(baseRate, rate!) : 0;
                    return (
                      <TableRow key={md}>
                        <TableCell className="py-1 text-[11px] font-medium">{TIER_LABELS[md as TierMinDays]}</TableCell>
                        <TableCell className={`py-1 text-[11px] ${set ? "" : "text-muted-foreground/60"}`}>
                          {set ? `${rate} MAD` : "—"}
                        </TableCell>
                        <TableCell className={`py-1 text-[11px] ${pct > 0 ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                          {md === 1 ? "—" : pct > 0 ? `${pct}%` : set ? "0%" : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Policies */}
          <Card className="p-3">
            <SectionTitle>Policies</SectionTitle>
            <Row label="Deposit" value={bike.deposit_amount != null ? `${bike.deposit_amount} MAD` : null} />
            <Row label="Min days" value={bike.min_rental_days} />
            <Row label="Max days" value={bike.max_rental_days} />
            <Row
              label="Cancellation"
              value={cancellationMeta ? `${cancellationMeta.icon} ${cancellationMeta.title}` : null}
            />
          </Card>

          {/* Pickup */}
          <Card className="p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <SectionTitle>Pickup</SectionTitle>
              {pickup?.usingAgencyFallback && (
                <span className="ml-auto rounded-full border border-border bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                  agency loc
                </span>
              )}
            </div>
            {pickup && (pickup.city || pickup.neighborhood || pickup.address) ? (
              <div className="space-y-0.5 text-xs">
                {pickup.neighborhood && <p>{pickup.neighborhood}</p>}
                {pickup.city && <p className="text-muted-foreground">{pickup.city}</p>}
                {pickup.address && <p className="text-muted-foreground">{pickup.address}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No pickup location set.</p>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl overflow-hidden bg-background p-0">
          {lightbox && <img src={lightbox} alt="" className="h-auto w-full" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BikeDetailCard;
