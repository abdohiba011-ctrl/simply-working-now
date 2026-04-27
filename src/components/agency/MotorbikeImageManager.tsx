import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { compressImage, validateImageFile, formatFileSize } from "@/lib/imageCompression";
import {
  Upload,
  Star,
  Trash2,
  Replace,
  GripVertical,
  ShieldAlert,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 8;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface BikeImage {
  id?: string;
  image_url: string;
  display_order: number;
  isPrimary: boolean;
  uploading?: boolean;
  progress?: number;
}

interface Props {
  bikeTypeId: string;
  ownerId: string;
  initialMainImageUrl: string | null;
  onChange?: () => void;
}

export const MotorbikeImageManager = ({
  bikeTypeId,
  ownerId,
  initialMainImageUrl,
  onChange,
}: Props) => {
  const [images, setImages] = useState<BikeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const replacingIdxRef = useRef<number | null>(null);

  // Load images from `bike_type_images` plus the primary `main_image_url`.
  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bike_type_images")
      .select("id, image_url, display_order")
      .eq("bike_type_id", bikeTypeId)
      .order("display_order", { ascending: true });

    const list: BikeImage[] = (data || []).map((r) => ({
      id: r.id,
      image_url: r.image_url,
      display_order: r.display_order ?? 0,
      isPrimary: r.image_url === initialMainImageUrl,
    }));

    // Ensure primary is in the list (in case main_image_url was set without an entry)
    if (initialMainImageUrl && !list.some((i) => i.image_url === initialMainImageUrl)) {
      list.unshift({
        image_url: initialMainImageUrl,
        display_order: -1,
        isPrimary: true,
      });
    }

    // Mark primary
    if (initialMainImageUrl) {
      list.forEach((i) => (i.isPrimary = i.image_url === initialMainImageUrl));
    } else if (list.length > 0) {
      list[0].isPrimary = true;
    }

    setImages(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bikeTypeId, initialMainImageUrl]);

  // ----- Upload -----
  const uploadOne = async (file: File): Promise<BikeImage | null> => {
    const v = validateImageFile(file, MAX_FILE_BYTES / 1024 / 1024);
    if (!v.valid) {
      toast.error(v.error || "Invalid image");
      return null;
    }

    let blob: Blob;
    try {
      blob = await compressImage(file, 1200, 2000);
    } catch {
      blob = file;
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${ownerId}/${bikeTypeId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("bike-images")
      .upload(path, blob, {
        cacheControl: "31536000",
        contentType: blob.type || file.type,
        upsert: false,
      });
    if (upErr) {
      toast.error(upErr.message);
      return null;
    }
    const { data: pub } = supabase.storage.from("bike-images").getPublicUrl(path);

    const nextOrder = (images[images.length - 1]?.display_order ?? -1) + 1;
    const { data: row, error: insErr } = await supabase
      .from("bike_type_images")
      .insert({
        bike_type_id: bikeTypeId,
        image_url: pub.publicUrl,
        display_order: nextOrder,
      })
      .select()
      .single();
    if (insErr) {
      toast.error(insErr.message);
      return null;
    }

    return {
      id: row.id,
      image_url: pub.publicUrl,
      display_order: nextOrder,
      isPrimary: false,
    };
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (images.length + arr.length > MAX_IMAGES) {
      toast.error(`You can upload up to ${MAX_IMAGES} images per motorbike.`);
      return;
    }
    const placeholders: BikeImage[] = arr.map((f, i) => ({
      image_url: URL.createObjectURL(f),
      display_order: 999 + i,
      isPrimary: false,
      uploading: true,
    }));
    setImages((prev) => [...prev, ...placeholders]);

    const uploaded: BikeImage[] = [];
    for (const f of arr) {
      const r = await uploadOne(f);
      if (r) uploaded.push(r);
    }

    // Replace placeholders with real records
    setImages((prev) => {
      const stable = prev.filter((i) => !i.uploading);
      const merged = [...stable, ...uploaded];
      // If no primary exists, mark the first one
      if (!merged.some((i) => i.isPrimary) && merged.length > 0) {
        merged[0].isPrimary = true;
        void supabase
          .from("bike_types")
          .update({ main_image_url: merged[0].image_url })
          .eq("id", bikeTypeId);
      }
      return merged;
    });
    onChange?.();
  };

  // ----- Replace -----
  const replaceImage = async (index: number, file: File) => {
    const img = images[index];
    if (!img?.id) return;
    const v = validateImageFile(file, MAX_FILE_BYTES / 1024 / 1024);
    if (!v.valid) return toast.error(v.error || "Invalid image");

    let blob: Blob;
    try {
      blob = await compressImage(file, 1200, 2000);
    } catch {
      blob = file;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${ownerId}/${bikeTypeId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("bike-images")
      .upload(path, blob, {
        cacheControl: "31536000",
        contentType: blob.type || file.type,
      });
    if (upErr) return toast.error(upErr.message);

    const { data: pub } = supabase.storage.from("bike-images").getPublicUrl(path);

    const { error } = await supabase
      .from("bike_type_images")
      .update({ image_url: pub.publicUrl })
      .eq("id", img.id);
    if (error) return toast.error(error.message);

    if (img.isPrimary) {
      await supabase
        .from("bike_types")
        .update({ main_image_url: pub.publicUrl })
        .eq("id", bikeTypeId);
    }
    toast.success("Image replaced");
    refresh();
    onChange?.();
  };

  // ----- Delete -----
  const deleteImage = async (index: number) => {
    const img = images[index];
    if (!img?.id) return;
    if (!confirm("Delete this image?")) return;

    const { error } = await supabase.from("bike_type_images").delete().eq("id", img.id);
    if (error) return toast.error(error.message);

    // Try to remove file from storage (best-effort)
    try {
      const url = new URL(img.image_url);
      const parts = url.pathname.split("/storage/v1/object/public/bike-images/");
      if (parts[1])
        await supabase.storage.from("bike-images").remove([decodeURIComponent(parts[1])]);
    } catch {
      /* ignore */
    }

    if (img.isPrimary) {
      const next = images.find((_, i) => i !== index);
      await supabase
        .from("bike_types")
        .update({ main_image_url: next?.image_url ?? null })
        .eq("id", bikeTypeId);
    }
    toast.success("Image deleted");
    refresh();
    onChange?.();
  };

  // ----- Set primary -----
  const setPrimary = async (index: number) => {
    const img = images[index];
    const { error } = await supabase
      .from("bike_types")
      .update({ main_image_url: img.image_url })
      .eq("id", bikeTypeId);
    if (error) return toast.error(error.message);
    toast.success("Primary image set");
    setImages((prev) => prev.map((i, k) => ({ ...i, isPrimary: k === index })));
    onChange?.();
  };

  // ----- Reorder (drag) -----
  const onDragStart = (i: number) => setDraggedIndex(i);
  const onDragOverItem = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === i) return;
  };
  const onDropItem = async (i: number) => {
    if (draggedIndex === null || draggedIndex === i) {
      setDraggedIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(i, 0, moved);
    setImages(next);
    setDraggedIndex(null);
    // Persist order
    await Promise.all(
      next
        .filter((n) => n.id)
        .map((n, idx) =>
          supabase.from("bike_type_images").update({ display_order: idx }).eq("id", n.id!)
        )
    );
    onChange?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <strong>Privacy tip:</strong> Don&apos;t include your agency logo, watermark, phone number,
          or contact info in motorbike photos. Renters discover and book through Motonita —
          off-platform contact attempts can lead to your listing being removed.
        </div>
      </div>

      {/* Drop zone */}
      <Card
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary/5",
          dragOver && "border-primary bg-primary/10"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-7 w-7 text-muted-foreground" />
        <div className="text-sm font-medium">Click or drop images here</div>
        <div className="text-xs text-muted-foreground">
          JPG · PNG · WebP — up to {MAX_IMAGES} images, {formatFileSize(MAX_FILE_BYTES)} each
        </div>
        <div className="text-xs text-muted-foreground">
          {images.length}/{MAX_IMAGES} uploaded
        </div>
      </Card>

      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const idx = replacingIdxRef.current;
          e.target.value = "";
          if (f && idx !== null) replaceImage(idx, f);
          replacingIdxRef.current = null;
        }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading images…
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm">No images yet — add at least one to publish your motorbike.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.id ?? img.image_url}
              draggable={!img.uploading && !!img.id}
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOverItem(e, i)}
              onDrop={() => onDropItem(i)}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-muted",
                draggedIndex === i && "opacity-50"
              )}
            >
              <div className="aspect-square w-full bg-muted">
                <img
                  src={img.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>

              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {img.isPrimary && (
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </div>
              )}

              {!img.uploading && !!img.id && (
                <>
                  <div className="absolute right-2 top-2 hidden cursor-grab rounded-md bg-background/80 p-1 group-hover:block">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-background/95 p-2 transition-transform group-hover:translate-y-0">
                    {!img.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setPrimary(i)}
                      >
                        <Star className="mr-1 h-3 w-3" /> Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        replacingIdxRef.current = i;
                        replaceFileInputRef.current?.click();
                      }}
                    >
                      <Replace className="mr-1 h-3 w-3" /> Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => deleteImage(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
