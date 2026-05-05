import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ImageOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  BIKE_CATEGORIES, FEATURE_LABELS, FeatureKey,
  licenseLabel, CANCELLATION_OPTIONS,
} from "@/lib/bikeFeatures";
import {
  formatWorkingHoursSummary, normalizeWorkingHours,
} from "@/lib/workingHours";

export interface ReviewBike {
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
  daily_price?: number | null;
  deposit_amount?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  cancellation_policy?: string | null;
  approval_status?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
}

export interface ReviewAgency {
  business_name?: string | null;
  is_verified?: boolean | null;
  phone?: string | null;
  city?: string | null;
  primary_neighborhood?: string | null;
  address?: string | null;
  working_hours?: unknown;
}

interface Props {
  bike: ReviewBike;
  photos: { id?: string; image_url: string }[];
  tiers: { min_days: number; daily_price_mad: number }[];
  agency: ReviewAgency | null;
}

const Field = ({ label, value }: { label: string; value: ReactNode }) => {
  const isEmpty =
    value === null || value === undefined ||
    (typeof value === "string" && value.trim() === "");
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm ${isEmpty ? "text-muted-foreground/50" : "font-medium"}`}>
        {isEmpty ? "—" : value}
      </span>
    </div>
  );
};

export const AdminBikeReviewSteps = ({ bike, photos, tiers, agency }: Props) => {
  const [lightbox, setLightbox] = useState<string | null>(null);

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
  const baseRate = tierMap.get(1) ?? Number(bike.daily_price ?? 0);

  const wh = agency?.working_hours ? normalizeWorkingHours(agency.working_hours) : null;
  const whSummary = wh ? formatWorkingHoursSummary(wh) : [];

  const warnings: string[] = [];
  if ((bike.deposit_amount ?? 0) === 0) warnings.push("Deposit = 0 MAD");
  if (photos.length < 4) warnings.push(`Only ${photos.length} photo${photos.length === 1 ? "" : "s"}`);
  if (baseRate > 500) warnings.push("Base rate > 500 MAD/day");

  return (
    <div className="space-y-3">
      {/* Agency Info banner */}
      <Card className="p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agency</p>
            <p className="text-base font-semibold flex items-center gap-1.5">
              {agency?.business_name || "—"}
              {agency?.is_verified && (
                <span className="inline-flex items-center gap-0.5 text-success text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {agency?.phone && <span>📞 {agency.phone}</span>}
              {agency?.city && <span>📍 {agency.city}{agency.primary_neighborhood ? ` · ${agency.primary_neighborhood}` : ""}</span>}
              {agency?.address && <span>{agency.address}</span>}
            </div>
            {whSummary.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Working hours</summary>
                <div className="mt-1 grid grid-cols-2 gap-x-3 text-[11px]">
                  {whSummary.map((line) => (
                    <div key={line.label} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{line.label}</span>
                      <span>{line.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="text-right">
            {bike.created_at && (
              <p className="text-[11px] text-muted-foreground">
                Submitted {new Date(bike.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">Status: <span className="font-medium capitalize">{bike.approval_status || "—"}</span></p>
          </div>
        </div>
      </Card>

      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-[11px] text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              <AlertTriangle className="h-3 w-3" /> {w}
            </span>
          ))}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["info", "specs", "included", "photos", "pricing"]} className="space-y-2">
        {/* Step 1 — Basic Info */}
        <AccordionItem value="info" className="rounded-lg border border-border bg-card px-3">
          <AccordionTrigger className="text-sm font-semibold">📋 Step 1 — Basic Info</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pb-2">
              <Field label="Name" value={bike.name} />
              <Field label="Brand" value={bike.brand} />
              <Field label="Model" value={bike.model} />
              <Field label="Year" value={bike.year} />
              <Field label="Color" value={bike.color} />
              <Field label="Category" value={categoryMeta ? `${categoryMeta.icon} ${categoryMeta.label}` : bike.category} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step 2 — Specifications */}
        <AccordionItem value="specs" className="rounded-lg border border-border bg-card px-3">
          <AccordionTrigger className="text-sm font-semibold">⚙️ Step 2 — Specifications</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pb-2">
              <Field label="Engine" value={bike.engine_cc ? `${bike.engine_cc} cc` : null} />
              <Field label="Fuel type" value={bike.fuel_type} />
              <Field label="Transmission" value={bike.transmission} />
              <Field label="Mileage" value={bike.mileage_km != null ? `${Number(bike.mileage_km).toLocaleString()} km` : null} />
              <Field label="License required" value={licenseLabel(bike.license_required ?? null)} />
              <Field label="Min age" value={bike.min_age} />
              <Field label="Min experience" value={bike.min_experience_years != null ? `${bike.min_experience_years} years` : null} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step 3 — What's Included */}
        <AccordionItem value="included" className="rounded-lg border border-border bg-card px-3">
          <AccordionTrigger className="text-sm font-semibold">🎁 Step 3 — What's Included</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-2">
              <Field
                label="Helmets"
                value={(bike.helmets_count ?? 0) > 0 ? `🪖 ${bike.helmets_count} helmet${(bike.helmets_count ?? 0) > 1 ? "s" : ""}` : null}
              />
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Features</p>
                {featureKeys.length === 0 ? (
                  <span className="text-sm text-muted-foreground/50">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {featureKeys.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                        <span>{FEATURE_LABELS[k].icon}</span> {FEATURE_LABELS[k].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step 4 — Photos & Description */}
        <AccordionItem value="photos" className="rounded-lg border border-border bg-card px-3">
          <AccordionTrigger className="text-sm font-semibold">📸 Step 4 — Photos &amp; Description</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Photos ({photos.length})</p>
                {photos.length === 0 ? (
                  <div className="flex h-20 items-center justify-center gap-2 rounded border border-dashed border-border text-xs text-muted-foreground">
                    <ImageOff className="h-4 w-4" /> No photos
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {photos.map((p) => (
                      <button
                        key={p.id ?? p.image_url}
                        type="button"
                        onClick={() => setLightbox(p.image_url)}
                        className="aspect-square overflow-hidden rounded border border-border bg-muted hover:opacity-90"
                      >
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Description</p>
                {bike.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{bike.description}</p>
                ) : (
                  <span className="text-sm text-muted-foreground/50">—</span>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step 5 — Pricing & Policies */}
        <AccordionItem value="pricing" className="rounded-lg border border-border bg-card px-3">
          <AccordionTrigger className="text-sm font-semibold">💰 Step 5 — Pricing &amp; Policies</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pb-2">
              <Field label="Base daily price" value={baseRate ? `${baseRate} MAD` : null} />
              <Field label="Deposit" value={bike.deposit_amount != null ? `${bike.deposit_amount} MAD` : null} />
              <Field label="Min rental days" value={bike.min_rental_days} />
              <Field label="Max rental days" value={bike.max_rental_days} />
              <Field label="Cancellation policy" value={cancellationMeta ? `${cancellationMeta.icon} ${cancellationMeta.title}` : null} />
            </div>
            {tiers.length > 1 && (
              <div className="mt-3 rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-1 text-left">Tier (min days)</th>
                      <th className="px-2 py-1 text-right">Rate / day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t) => (
                      <tr key={t.min_days} className="border-t border-border">
                        <td className="px-2 py-1">{t.min_days}+ days</td>
                        <td className="px-2 py-1 text-right tabular-nums">{t.daily_price_mad} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl overflow-hidden bg-background p-0">
          {lightbox && <img src={lightbox} alt="" className="h-auto w-full" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBikeReviewSteps;
