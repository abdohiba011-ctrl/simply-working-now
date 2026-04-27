import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { compressImage, validateImageFile } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export const LogoUploader = ({ userId, value, onChange, className }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    const v = validateImageFile(file, MAX_BYTES / 1024 / 1024);
    if (!v.valid) return toast.error(v.error || "Invalid image");
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await compressImage(file, 300, 600);
      } catch {
        blob = file;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `agency-logos/${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, {
        cacheControl: "31536000",
        contentType: blob.type || file.type,
        upsert: false,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Logo updated");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!value) return;
    if (!confirm("Remove your logo?")) return;
    setBusy(true);
    try {
      try {
        const u = new URL(value);
        const parts = u.pathname.split("/storage/v1/object/public/avatars/");
        if (parts[1])
          await supabase.storage.from("avatars").remove([decodeURIComponent(parts[1])]);
      } catch {
        /* ignore */
      }
      onChange(null);
      toast.success("Logo removed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {value ? (
          <img src={value} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload className="mr-2 h-3.5 w-3.5" /> {value ? "Replace" : "Upload logo"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={remove}
            disabled={busy}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
          </Button>
        )}
        <p className="basis-full text-[11px] text-muted-foreground">
          Square image works best. JPG · PNG · WebP, max 2 MB.
        </p>
      </div>
    </div>
  );
};
