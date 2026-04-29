import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ExternalLink } from "lucide-react";

const KIND_LABELS: Record<string, string> = {
  id_front: "ID card – front",
  id_back: "ID card – back",
  bike_photo: "Motorbike photo",
  ownership_paper: "Ownership paper (carte grise)",
};

interface DocRow {
  id: string;
  kind: string;
  file_path: string;
  signedUrl?: string | null;
}

export const ApplicationDocumentsPreview = ({ applicationId }: { applicationId: string }) => {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_application_documents")
        .select("id, kind, file_path")
        .eq("application_id", applicationId);
      if (error || !data) {
        if (!cancelled) {
          setDocs([]);
          setLoading(false);
        }
        return;
      }
      const withUrls = await Promise.all(
        data.map(async (d) => {
          const { data: signed } = await supabase.storage
            .from("business-applications")
            .createSignedUrl(d.file_path, 3600);
          return { ...d, signedUrl: signed?.signedUrl ?? null };
        })
      );
      if (!cancelled) {
        setDocs(withUrls);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading documents…
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground pt-2">No documents uploaded.</p>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="text-sm font-semibold">Uploaded documents</p>
      <div className="grid grid-cols-2 gap-2">
        {docs.map((d) => (
          <a
            key={d.id}
            href={d.signedUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent text-sm"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{KIND_LABELS[d.kind] || d.kind}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
};
