import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Upload,
  FileCheck2,
  Clock,
  Loader2,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useAgencyData";
import { cn } from "@/lib/utils";

type EntityType = "company" | "auto_entrepreneur";

// Slot keys we persist into the file_name prefix so we can re-hydrate the UI.
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
      // Look up profile (by user_id, NOT id) to read business_type, and the
      // matching agency row to read shop verification_status.
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,business_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.business_type === "auto_entrepreneur") {
        setEntityType("auto_entrepreneur");
      } else if (profile?.business_type === "company") {
        setEntityType("company");
      }
      if (profile?.id) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("verification_status,is_verified")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (agency?.is_verified) {
          setStatus("verified");
        } else if (agency?.verification_status) {
          setStatus(agency.verification_status);
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
        // Order matters: ae_card before rc, id_front/back before any partial match
        if (name.startsWith("ae_card")) matched = "ae_card";
        else if (name.startsWith("id_front")) matched = "id_front";
        else if (name.startsWith("id_back")) matched = "id_back";
        else if (name.startsWith("rc")) matched = "rc";
        if (!matched) continue;
        // Keep only the newest per slot (files are ordered DESC already)
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
    setEntityType(next);
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ business_type: next })
      .eq("user_id", userId);
  };

  const handleUpload = async (slot: SlotKey, file: File | null) => {
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5 MB");
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
          {
            key: slot,
            file_name: fileName,
            file_url: fileUrl,
            created_at: new Date().toISOString(),
          },
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
    entityType === "company"
      ? "RC (Registre de Commerce)"
      : "Auto-entrepreneur card";
  const businessHelp =
    entityType === "company"
      ? "Upload a clear scan or photo of your Registre de Commerce."
      : "Take a clear photo of your auto-entrepreneur card.";

  const hasBusiness = !!docs.find((d) => d.key === businessSlot);
  const hasIdFront = !!docs.find((d) => d.key === "id_front");
  const hasIdBack = !!docs.find((d) => d.key === "id_back");
  const allReady = hasBusiness && hasIdFront && hasIdBack;

  const handleSubmit = async () => {
    if (!userId || !allReady) return;
    setSubmitting(true);
    try {
      // Get the profile row to find the agency
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id,business_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.id) throw new Error("Profile not found");

      // Persist business_type on profile
      await supabase
        .from("profiles")
        .update({ business_type: entityType })
        .eq("user_id", userId);

      // Ensure an agency row exists for this profile, then mark it pending_review.
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
      toast.success("Submitted for review. We'll get back to you in 24–48h.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = status === "pending" || status === "pending_review";
  const isLocked = isPending || status === "verified" || status === "rejected";

  const statusBadge = () => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-success/15 text-success border-success/30">
            Verified
          </Badge>
        );
      case "pending":
      case "pending_review":
        return (
          <Badge variant="outline" className="border-amber-400 text-amber-700">
            <Clock className="mr-1 h-3 w-3" /> Pending review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">Rejected — please re-upload</Badge>
        );
      default:
        return <Badge variant="outline">Not started</Badge>;
    }
  };

  const slotCard = (
    slot: SlotKey,
    title: string,
    helpText: string,
    icon: React.ReactNode,
  ) => {
    const existing = docs.find((d) => d.key === slot);
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              {icon}
            </div>
            <div>
              <Label className="text-sm font-semibold">{title}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, JPG or PNG. Max 5 MB.
              </p>
            </div>
          </div>
          {existing && (
            <FileCheck2 className="h-5 w-5 text-success shrink-0" />
          )}
        </div>
        {existing && (
          <p className="mt-3 truncate text-xs text-muted-foreground">
            Uploaded:{" "}
            <a
              href={existing.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {existing.file_name}
            </a>
          </p>
        )}
        <div className="mt-4">
          <label className="inline-flex">
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              disabled={uploading === slot}
              onChange={(e) => handleUpload(slot, e.target.files?.[0] || null)}
            />
            <Button
              asChild
              size="sm"
              variant={existing ? "outline" : "default"}
              disabled={uploading === slot}
            >
              <span className="cursor-pointer">
                {uploading === slot ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{" "}
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3.5 w-3.5" />{" "}
                    {existing ? "Replace" : "Upload"}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </Card>
    );
  };

  const idSubSlot = (slot: "id_front" | "id_back", label: string) => {
    const existing = docs.find((d) => d.key === slot);
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
          {existing && <FileCheck2 className="h-4 w-4 text-success shrink-0" />}
        </div>
        {existing ? (
          <p className="mt-2 truncate text-xs text-muted-foreground">
            <a
              href={existing.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {existing.file_name}
            </a>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Not uploaded yet.
          </p>
        )}
        <div className="mt-3">
          <label className="inline-flex">
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              disabled={uploading === slot}
              onChange={(e) => handleUpload(slot, e.target.files?.[0] || null)}
            />
            <Button
              asChild
              size="sm"
              variant={existing ? "outline" : "default"}
              disabled={uploading === slot}
            >
              <span className="cursor-pointer">
                {uploading === slot ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{" "}
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3.5 w-3.5" />{" "}
                    {existing ? "Replace" : "Upload"}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>
    );
  };

  const idCard = (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <UserIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <Label className="text-sm font-semibold">
            2. Owner ID card (CIN)
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload both sides of the CIN of the person managing the business.
            Make sure the text is readable. PDF, JPG or PNG. Max 5 MB each.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {idSubSlot("id_front", "Front side")}
        {idSubSlot("id_back", "Back side")}
      </div>
    </Card>
  );


  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Business
              verification
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Most reviews take 24–48 hours. Unverified agencies don't appear
              in renter search results.
            </p>
          </div>
          {statusBadge()}
        </div>
      </Card>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Step 0 — entity type selector */}
          <Card className="p-5">
            <Label className="text-sm font-semibold">
              What kind of business are you?
            </Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => persistEntityType("company")}
                className={cn(
                  "rounded-lg border p-4 text-start transition-colors",
                  entityType === "company"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Company (SARL, SA…)</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  We'll ask for your RC.
                </p>
              </button>
              <button
                type="button"
                onClick={() => persistEntityType("auto_entrepreneur")}
                className={cn(
                  "rounded-lg border p-4 text-start transition-colors",
                  entityType === "auto_entrepreneur"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Auto-entrepreneur</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  We'll ask for a photo of your card.
                </p>
              </button>
            </div>
          </Card>

          {/* Steps 1-2 — required documents */}
          <div className="grid gap-4">
            {slotCard(
              businessSlot,
              `1. ${businessLabel}`,
              businessHelp,
              <Building2 className="h-4 w-4" />,
            )}
            {idCard}
          </div>

          {/* Submit */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm text-muted-foreground">
              {allReady
                ? status === "pending"
                  ? "Your documents are under review."
                  : "All set — submit your documents for review."
                : "Upload all required documents to enable submission."}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!allReady || submitting || status === "pending" || status === "verified"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : status === "pending" ? (
                "Pending review"
              ) : status === "verified" ? (
                "Verified"
              ) : (
                "Submit for review"
              )}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
};

export default Verification;
