import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Upload, FileCheck2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useAgencyData";

const DOC_TYPES = [
  { key: "rc", label: "RC (Registre de Commerce)" },
  { key: "ice", label: "ICE certificate" },
  { key: "rib", label: "RIB / Bank account" },
  { key: "insurance", label: "Insurance certificate" },
];

interface UploadedDoc {
  key: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

const Verification = () => {
  const { userId } = useCurrentUser();
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("not_started");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.verification_status) setStatus(profile.verification_status);

      const { data: files } = await supabase
        .from("client_files")
        .select("file_name, file_url, created_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const list: UploadedDoc[] = (files || []).map((f) => {
        const matched = DOC_TYPES.find((d) =>
          (f.file_name || "").toLowerCase().includes(d.key),
        );
        return {
          key: matched?.key || "other",
          file_name: f.file_name,
          file_url: f.file_url,
          created_at: f.created_at,
        };
      });
      setDocs(list);
      setLoading(false);
    })();
  }, [userId]);

  const handleUpload = async (docKey: string, file: File | null) => {
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5 MB");
      return;
    }
    setUploading(docKey);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${userId}/${docKey}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-files")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("client-files")
        .createSignedUrl(path, 60 * 60 * 24 * 30);

      const { error: insErr } = await supabase.from("client_files").insert({
        user_id: userId,
        file_name: `${docKey}-${file.name}`,
        file_url: signed?.signedUrl || path,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
      });
      if (insErr) throw insErr;

      // Mark profile as 'pending' if user just started
      if (status === "not_started" || status === "rejected") {
        await supabase
          .from("profiles")
          .update({ verification_status: "pending" })
          .eq("id", userId);
        setStatus("pending");
      }

      setDocs((prev) => [
        {
          key: docKey,
          file_name: `${docKey}-${file.name}`,
          file_url: signed?.signedUrl || path,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const statusBadge = () => {
    switch (status) {
      case "verified":
        return <Badge className="bg-success/15 text-success border-success/30">Verified</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-amber-400 text-amber-700"><Clock className="mr-1 h-3 w-3" /> Pending review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected — please re-upload</Badge>;
      default:
        return <Badge variant="outline">Not started</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Business verification
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your business documents. Most reviews take 24–48 hours. Unverified agencies don't appear in renter search results.
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
        <div className="grid gap-4 md:grid-cols-2">
          {DOC_TYPES.map((doc) => {
            const existing = docs.find((d) => d.key === doc.key);
            return (
              <Card key={doc.key} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label className="text-sm font-semibold">{doc.label}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, JPG or PNG. Max 5 MB.
                    </p>
                  </div>
                  {existing && <FileCheck2 className="h-5 w-5 text-success shrink-0" />}
                </div>
                {existing && (
                  <p className="mt-3 truncate text-xs text-muted-foreground">
                    Uploaded: <a href={existing.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{existing.file_name}</a>
                  </p>
                )}
                <div className="mt-4">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      disabled={uploading === doc.key}
                      onChange={(e) => handleUpload(doc.key, e.target.files?.[0] || null)}
                    />
                    <Button asChild size="sm" variant={existing ? "outline" : "default"} disabled={uploading === doc.key}>
                      <span className="cursor-pointer">
                        {uploading === doc.key ? (
                          <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Uploading…</>
                        ) : (
                          <><Upload className="mr-2 h-3.5 w-3.5" /> {existing ? "Replace" : "Upload"}</>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Verification;
