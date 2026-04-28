import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  Upload,
  FileCheck2,
  Clock,
  Loader2,
  Building2,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

type EntityType = "company" | "auto_entrepreneur";

const SLOTS = {
  rc: "rc",
  ae_card: "ae_card",
  id_front: "id_front",
  id_back: "id_back",
} as const;

type SlotKey = (typeof SLOTS)[keyof typeof SLOTS];

interface UploadedDoc {
  key: SlotKey;
  file_name: string;
  file_url: string;
  created_at: string;
}

const Verification = () => {
  const { userId } = useCurrentUser();
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<SlotKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("not_started");
  const [entityType, setEntityType] = useState<EntityType>("company");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,business_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.business_type === "auto_entrepreneur") setEntityType("auto_entrepreneur");
      else if (profile?.business_type === "company") setEntityType("company");

      if (profile?.id) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("verification_status,is_verified")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (agency?.is_verified) setStatus("verified");
        else if (agency?.verification_status) setStatus(agency.verification_status);
      }

      const { data: files } = await supabase
        .from("client_files")
        .select("file_name, file_url, created_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const list: UploadedDoc[] = [];
      for (const f of files || []) {
        const name = (f.file_name || "").toLowerCase();
        let matched: SlotKey | null = null;
        if (name.startsWith("ae_card")) matched = "ae_card";
        else if (name.startsWith("id_front")) matched = "id_front";
        else if (name.startsWith("id_back")) matched = "id_back";
        else if (name.startsWith("rc")) matched = "rc";
        if (!matched) continue;
        if (list.find((d) => d.key === matched)) continue;
        list.push({
          key: matched,
          file_name: f.file_name,
          file_url: f.file_url,
          created_at: f.created_at,
        });
      }
      setDocs(list);
      setLoading(false);
    })();
  }, [userId]);

  const persistEntityType = async (next: EntityType) => {
    if (next === entityType) return;
    setEntityType(next);
    if (!userId) return;
    await supabase.from("profiles").update({ business_type: next }).eq("user_id", userId);
  };

  const handleUpload = async (slot: SlotKey, file: File | null) => {
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5 MB");
      return;
    }
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type);
    if (!okType) {
      toast.error("Only PDF, JPG, PNG or WEBP are allowed");
      return;
    }
    setUploading(slot);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${userId}/${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-files")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("client-files")
        .createSignedUrl(path, 60 * 60 * 24 * 30);

      const fileName = `${slot}-${file.name}`;
      const fileUrl = signed?.signedUrl || path;

      const { error: insErr } = await supabase.from("client_files").insert({
        user_id: userId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
      });
      if (insErr) throw insErr;

      setDocs((prev) => {
        const without = prev.filter((d) => d.key !== slot);
        return [
          { key: slot, file_name: fileName, file_url: fileUrl, created_at: new Date().toISOString() },
          ...without,
        ];
      });
      toast.success("Document uploaded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const businessSlot: SlotKey = entityType === "company" ? "rc" : "ae_card";
  const businessLabel =
    entityType === "company" ? "Registre de Commerce (RC)" : "Auto-entrepreneur card";
  const businessHelp =
    entityType === "company"
      ? "A clear scan or photo of your RC document. Both pages if it has multiple."
      : "A clear photo of your auto-entrepreneur card, all corners visible.";

  const hasBusiness = !!docs.find((d) => d.key === businessSlot);
  const hasIdFront = !!docs.find((d) => d.key === "id_front");
  const hasIdBack = !!docs.find((d) => d.key === "id_back");
  const completed = [hasBusiness, hasIdFront, hasIdBack].filter(Boolean).length;
  const total = 3;
  const allReady = completed === total;
  const progressPct = Math.round((completed / total) * 100);

  const handleSubmit = async () => {
    if (!userId) return;
    if (!allReady) {
      toast.error("Please upload all required documents first.");
      return;
    }
    // Guard against blob/data placeholders that never reached storage
    const bad = docs.find((d) => /^(blob:|data:)/i.test(d.file_url));
    if (bad) {
      toast.error("One of your files didn't upload properly. Please replace it.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id,business_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.id) throw new Error("Profile not found");

      await supabase
        .from("profiles")
        .update({ business_type: entityType })
        .eq("user_id", userId);

      const { data: existing } = await supabase
        .from("agencies")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (existing?.id) {
        const { error: aErr } = await supabase
          .from("agencies")
          .update({ verification_status: "pending_review" })
          .eq("id", existing.id);
        if (aErr) throw aErr;
      } else {
        const { error: aErr } = await supabase.from("agencies").insert({
          profile_id: profile.id,
          business_name: profile.business_name || "Agency",
          verification_status: "pending_review",
          is_verified: false,
        });
        if (aErr) throw aErr;
      }

      setStatus("pending_review");
      toast.success("Submitted! We'll review your documents within 24–48h.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = status === "pending_review";
  const isVerified = status === "verified";
  const isRejected = status === "rejected";
  const locked = isPending || isVerified;

  const banner = useMemo(() => {
    if (isVerified) {
      return {
        tone: "success" as const,
        icon: <CheckCircle2 className="h-5 w-5" />,
        title: "You're verified",
        text: "Your shop is live. Approved motorbikes are visible to renters in search results.",
      };
    }
    if (isPending) {
      return {
        tone: "info" as const,
        icon: <Clock className="h-5 w-5" />,
        title: "Under review",
        text: "Our team is reviewing your documents. Most reviews are completed within 24–48 hours.",
      };
    }
    if (isRejected) {
      return {
        tone: "danger" as const,
        icon: <AlertCircle className="h-5 w-5" />,
        title: "Submission rejected",
        text: "Please replace the documents that need fixing and submit again.",
      };
    }
    return {
      tone: "neutral" as const,
      icon: <Info className="h-5 w-5" />,
      title: "Get verified to go live",
      text: "Verified agencies appear in renter search results. It only takes a few minutes.",
    };
  }, [isVerified, isPending, isRejected]);

  const bannerClasses = {
    success: "border-success/30 bg-success/10 text-success-foreground",
    info: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted/40 text-foreground",
  }[banner.tone];

  const statusPill = () => {
    if (isVerified)
      return (
        <Badge className="bg-success/15 text-success border border-success/30">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
        </Badge>
      );
    if (isPending)
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-700">
          <Clock className="mr-1 h-3 w-3" /> Pending review
        </Badge>
      );
    if (isRejected)
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Rejected
        </Badge>
      );
    return <Badge variant="outline">Not started</Badge>;
  };

  /** Reusable upload tile (single-file slot) */
  const UploadTile = ({
    slot,
    title,
    help,
    icon,
    compact = false,
  }: {
    slot: SlotKey;
    title: string;
    help?: string;
    icon: React.ReactNode;
    compact?: boolean;
  }) => {
    const existing = docs.find((d) => d.key === slot);
    const isUploading = uploading === slot;
    const done = !!existing;

    return (
      <div
        className={cn(
          "relative rounded-lg border p-4 transition-colors",
          done ? "border-success/40 bg-success/5" : "border-dashed border-border bg-background",
          locked && "opacity-90",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-md p-2 shrink-0",
              done ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
            )}
          >
            {done ? <FileCheck2 className="h-4 w-4" /> : icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Label className={cn("font-semibold", compact ? "text-xs uppercase tracking-wide text-muted-foreground" : "text-sm")}>
                {title}
              </Label>
              {done && !compact && (
                <Badge className="bg-success/15 text-success border border-success/30 shrink-0">
                  Uploaded
                </Badge>
              )}
            </div>
            {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
            {!compact && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                PDF, JPG, PNG or WEBP · Max 5 MB
              </p>
            )}

            {existing && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <FileCheck2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate text-muted-foreground" title={existing.file_name}>
                  {existing.file_name.replace(/^(rc|ae_card|id_front|id_back)-/, "")}
                </span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={isUploading || locked}
                  onChange={(e) => {
                    handleUpload(slot, e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                <Button
                  asChild
                  size="sm"
                  variant={done ? "outline" : "default"}
                  disabled={isUploading || locked}
                >
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Uploading…
                      </>
                    ) : done ? (
                      <>
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Replace
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-3.5 w-3.5" /> Upload file
                      </>
                    )}
                  </span>
                </Button>
              </label>
              {existing && (
                <Button asChild size="sm" variant="ghost">
                  <a href={existing.file_url} target="_blank" rel="noreferrer">
                    <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Business verification</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Verified agencies appear in renter search results. Reviews take 24–48 hours.
              </p>
            </div>
          </div>
          {statusPill()}
        </div>

        {/* Status banner */}
        <div className={cn("mt-5 flex items-start gap-3 rounded-lg border p-4", bannerClasses)}>
          <div className="mt-0.5 shrink-0">{banner.icon}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{banner.title}</div>
            <p className="mt-0.5 text-sm opacity-90">{banner.text}</p>
          </div>
        </div>

        {/* Progress (only when actionable) */}
        {!isVerified && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Progress · <span className="font-medium text-foreground">{completed}/{total} documents</span>
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
      </Card>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Step 1 — Entity type */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                1
              </div>
              <div className="flex-1">
                <Label className="text-sm font-semibold">What kind of business are you?</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick the option that matches your legal status. We'll request the matching document next.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => persistEntityType("company")}
                    disabled={locked}
                    className={cn(
                      "rounded-lg border p-4 text-start transition-all",
                      entityType === "company"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                      locked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Company (SARL, SA…)</span>
                      </div>
                      {entityType === "company" && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We'll ask for your Registre de Commerce.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => persistEntityType("auto_entrepreneur")}
                    disabled={locked}
                    className={cn(
                      "rounded-lg border p-4 text-start transition-all",
                      entityType === "auto_entrepreneur"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                      locked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">Auto-entrepreneur</span>
                      </div>
                      {entityType === "auto_entrepreneur" && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We'll ask for a photo of your card.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2 — Business document */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                2
              </div>
              <div className="flex-1">
                <Label className="text-sm font-semibold">{businessLabel}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{businessHelp}</p>
                <div className="mt-4">
                  <UploadTile
                    slot={businessSlot}
                    title={businessLabel}
                    help="Make sure the document is in focus and all text is readable."
                    icon={<Building2 className="h-4 w-4" />}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3 — CIN */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                3
              </div>
              <div className="flex-1">
                <Label className="text-sm font-semibold">Owner ID card (CIN)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Both sides of the CIN of the person managing the business. Place it on a flat surface and avoid glare.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <UploadTile
                    slot="id_front"
                    title="Front side"
                    icon={<UserIcon className="h-4 w-4" />}
                    compact
                  />
                  <UploadTile
                    slot="id_back"
                    title="Back side"
                    icon={<UserIcon className="h-4 w-4" />}
                    compact
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Sticky submit bar */}
          <div className="sticky bottom-4 z-10">
            <Card className="flex flex-wrap items-center justify-between gap-3 border-2 p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    allReady ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {allReady ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                </div>
                <div className="text-sm">
                  {isVerified ? (
                    <span className="font-medium">Your shop is verified.</span>
                  ) : isPending ? (
                    <span className="font-medium">Documents under review · 24–48h</span>
                  ) : isRejected ? (
                    <span className="font-medium text-destructive">
                      Please replace flagged documents and resubmit.
                    </span>
                  ) : allReady ? (
                    <span className="font-medium">All set — ready to submit for review.</span>
                  ) : (
                    <span>
                      <span className="font-medium text-foreground">{total - completed}</span>{" "}
                      document{total - completed === 1 ? "" : "s"} left to upload.
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!allReady || submitting || isPending || isVerified}
                className="min-w-[180px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" /> Pending review
                  </>
                ) : isVerified ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Verified
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Submit for review
                  </>
                )}
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Verification;
