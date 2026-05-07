import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  ice_cert: "ice_cert",
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
  const [ice, setIce] = useState<string>("");
  const [iceTouched, setIceTouched] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [rejectedAt, setRejectedAt] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

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
          .select("id,verification_status,is_verified,ice,rejection_reason,rejected_at")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (agency) {
          setAgencyId(agency.id);
          setIce(agency.ice || "");
          setRejectionReason(agency.rejection_reason || null);
          setRejectedAt(agency.rejected_at || null);
          if (agency.is_verified) setStatus("approved");
          else if (agency.verification_status) setStatus(agency.verification_status);
        }
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
        else if (name.startsWith("ice_cert")) matched = "ice_cert";
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

  const iceValid = /^[0-9]{15}$/.test(ice);
  const hasBusiness = !!docs.find((d) => d.key === businessSlot);
  const hasIceCert = !!docs.find((d) => d.key === "ice_cert");
  const hasIdFront = !!docs.find((d) => d.key === "id_front");
  const hasIdBack = !!docs.find((d) => d.key === "id_back");
  const completed = [iceValid, hasBusiness, hasIceCert, hasIdFront, hasIdBack].filter(Boolean).length;
  const total = 5;
  const allReady = completed === total;
  const progressPct = Math.round((completed / total) * 100);

  const handleSubmit = async () => {
    if (!userId) return;
    if (!iceValid) {
      toast.error("ICE must be exactly 15 digits.");
      return;
    }
    if (!allReady) {
      toast.error("Please complete all required items first.");
      return;
    }
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

      const payload = {
        verification_status: "pending",
        ice,
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
      } as const;

      if (existing?.id) {
        const { error: aErr } = await supabase
          .from("agencies")
          .update(payload)
          .eq("id", existing.id);
        if (aErr) throw aErr;
      } else {
        const { error: aErr } = await supabase.from("agencies").insert({
          profile_id: profile.id,
          business_name: profile.business_name || "Agency",
          is_verified: false,
          ...payload,
        });
        if (aErr) throw aErr;
      }

      setStatus("pending");
      setRejectionReason(null);
      setRejectedAt(null);
      toast.success("Submitted! We'll review your documents within 24–48h.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = status === "pending";
  const isVerified = status === "approved";
  const isRejected = status === "rejected";
  const locked = isPending || isVerified;

  const banner = useMemo(() => {
    if (isVerified) {
      return {
        tone: "success" as const,
        icon: <CheckCircle2 className="h-5 w-5 text-slate-950 bg-slate-50/0" />,
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
          <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
        </Badge>
      );
    if (isPending)
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-700">
          <Clock className="mr-1 h-3 w-3" /> Pending
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
    icon,
  }: {
    slot: SlotKey;
    title: string;
    icon: React.ReactNode;
  }) => {
    const existing = docs.find((d) => d.key === slot);
    const isUploading = uploading === slot;
    const done = !!existing;

    return (
      <div
        className={cn(
          "relative rounded-lg border p-3.5 transition-colors",
          done
            ? "border-success/40 bg-success/5"
            : "border-dashed border-input bg-muted/30 hover:bg-muted/50 hover:border-slate-400",
          locked && "opacity-90",
        )}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "rounded-md p-1.5 shrink-0",
              done ? "bg-success/15 text-success" : "bg-slate-100 text-slate-700",
            )}
          >
            {done ? <FileCheck2 className="h-3.5 w-3.5" /> : icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">{title}</Label>
              {done && (
                <Badge className="bg-success/15 text-success border border-success/30 shrink-0 text-[10px] px-1.5 py-0">
                  Uploaded
                </Badge>
              )}
            </div>

            {existing ? (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="truncate text-muted-foreground" title={existing.file_name}>
                  {existing.file_name.replace(/^(rc|ae_card|ice_cert|id_front|id_back)-/, "")}
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                PDF, JPG, PNG · Max 5 MB
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                  className="h-7 text-xs"
                >
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Uploading…
                      </>
                    ) : done ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3 w-3" /> Replace
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3 w-3" /> Upload
                      </>
                    )}
                  </span>
                </Button>
              </label>
              {existing && (
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <a href={existing.file_url} target="_blank" rel="noreferrer">
                    <Eye className="mr-1.5 h-3 w-3" /> Preview
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SectionTitle = ({ num, title, hint }: { num: string; title: string; hint?: string }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-700">】
          {num}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-28">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Business verification</h2>
              <p className="text-xs text-muted-foreground">
                Verified agencies appear in renter search results · 24–48h review
              </p>
            </div>
          </div>
          {statusPill()}
        </div>

        <div className={cn("mt-4 flex items-start gap-3 rounded-lg border px-4 py-3", bannerClasses)}>
          <div className="mt-0.5 shrink-0">{banner.icon}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950">{banner.title}</div>
            <p className="mt-0.5 text-xs opacity-90 text-slate-800">{banner.text}</p>
          </div>
        </div>

        {isRejected && rejectionReason && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">Verification rejected</div>
                <p className="mt-0.5 text-xs whitespace-pre-wrap">{rejectionReason}</p>
                {rejectedAt && (
                  <p className="mt-1 text-[11px] opacity-70">
                    {new Date(rejectedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!isVerified && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{completed}/{total}</span> completed
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}
      </Card>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <Card className="p-6 sm:p-7 space-y-6">
            {/* Section A — Business details */}
            <div>
              <SectionTitle
                num="01"
                title="Business details"
                hint="Pick your legal status and enter your ICE number."
              />
              <div className="grid gap-4 md:grid-cols-12">
                {/* Entity type — segmented */}
                <div className="md:col-span-7">
                  <Label className="text-xs font-medium text-muted-foreground">Entity type</Label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-lg border border-input bg-muted/30 p-1">
                    <button
                      type="button"
                      onClick={() => persistEntityType("company")}
                      disabled={locked}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        entityType === "company"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                        locked && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      Company
                      {entityType === "company" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => persistEntityType("auto_entrepreneur")}
                      disabled={locked}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        entityType === "auto_entrepreneur"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                        locked && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <UserIcon className="h-4 w-4" />
                      Auto-entrepreneur
                      {entityType === "auto_entrepreneur" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </div>
                </div>

                {/* ICE Number */}
                <div className="md:col-span-5">
                  <Label htmlFor="ice" className="text-xs font-medium text-muted-foreground">
                    ICE Number
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="ice"
                      inputMode="numeric"
                      maxLength={15}
                      placeholder="15-digit ICE"
                      value={ice}
                      disabled={locked}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 15);
                        setIce(v);
                      }}
                      onBlur={() => setIceTouched(true)}
                      className={cn(
                        "font-mono bg-muted/40 pr-14 focus-visible:bg-background",
                        iceTouched && !iceValid && ice.length > 0 && "border-destructive",
                        iceValid && "border-success/50",
                      )}
                    />
                    <span className={cn(
                      "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] tabular-nums",
                      iceValid ? "text-success" : "text-muted-foreground",
                    )}>
                      {iceValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : `${ice.length}/15`}
                    </span>
                  </div>
                  {iceTouched && !iceValid && ice.length > 0 && (
                    <p className="mt-1 text-[11px] text-destructive">Must be exactly 15 digits.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Section B — Documents */}
            <div>
              <SectionTitle
                num="02"
                title="Documents"
                hint="Upload clear scans or photos. PDF, JPG, PNG · max 5 MB each."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <UploadTile
                  slot={businessSlot}
                  title={businessLabel}
                  icon={<Building2 className="h-3.5 w-3.5" />}
                />
                <UploadTile
                  slot="ice_cert"
                  title="ICE Certificate"
                  icon={<FileCheck2 className="h-3.5 w-3.5" />}
                />
                <UploadTile
                  slot="id_front"
                  title="Owner CIN — Front"
                  icon={<UserIcon className="h-3.5 w-3.5" />}
                />
                <UploadTile
                  slot="id_back"
                  title="Owner CIN — Back"
                  icon={<UserIcon className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </Card>

          {/* Sticky submit bar */}
          <div className="sticky bottom-4 z-10">
            <Card className="flex flex-wrap items-center justify-between gap-3 border-2 px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    allReady ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {allReady ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                </div>
                <div className="text-sm">
                  {isVerified ? (
                    <span className="font-medium">Your shop is verified.</span>
                  ) : isPending ? (
                    <span className="font-medium">Documents under review · 24–48h</span>
                  ) : isRejected ? (
                    <span className="font-medium text-destructive">
                      Replace flagged documents and resubmit.
                    </span>
                  ) : allReady ? (
                    <span className="font-medium">All set — ready to submit.</span>
                  ) : (
                    <span>
                      <span className="font-medium text-foreground">{total - completed}</span>{" "}
                      item{total - completed === 1 ? "" : "s"} left.
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
