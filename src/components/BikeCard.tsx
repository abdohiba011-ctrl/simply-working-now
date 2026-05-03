import { Heart, MapPin, Settings2, Fuel, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToggleFavorite } from "@/lib/favorites";
import { useState } from "react";

export type BikeCardData = {
  id: string;
  slug?: string | null;
  name: string;
  category?: string | null;
  fuel_type?: string | null;
  daily_price?: number | null;
  weekly_price?: number | null;
  monthly_price?: number | null;
  main_image_url?: string | null;
  neighborhood?: string | null;
  features?: string[] | null;
  year?: number | null;
  engine_cc?: number | null;
};

interface Props {
  bike: BikeCardData;
  isFavorited: boolean;
  totalDays?: number;
  datesQS?: string;
  cityName?: string;
  available?: boolean;
  onRemoved?: () => void;
}

export function BikeCard({
  bike,
  isFavorited,
  totalDays = 1,
  datesQS = "",
  cityName,
  available = true,
  onRemoved,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const toggleMutation = useToggleFavorite();
  const [pop, setPop] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const fav = optimistic ?? isFavorited;

  const price = Number(bike.daily_price) || 0;
  const weekly = Number(bike.weekly_price) || 0;
  const monthly = Number(bike.monthly_price) || 0;
  const effective =
    totalDays >= 30 && monthly > 0
      ? monthly
      : totalDays >= 7 && weekly > 0
        ? weekly
        : price;
  const deposit = Math.round(price * 10);

  const features = bike.features || [];
  const visibleFeatures = features.slice(0, 3);
  const extra = features.length - visibleFeatures.length;

  const handleOpen = () => {
    navigate(`/bike/${bike.slug || bike.id}${datesQS}`);
  };

  const handleHeart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.info("Sign in to save favorites");
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    const next = !fav;
    setOptimistic(next);
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 300);
    }
    try {
      await toggleMutation.mutateAsync({ bikeTypeId: bike.id, isFavorited: fav });
      if (!next) {
        toast(`Removed from favorites`);
        onRemoved?.();
      } else {
        toast.success(`Saved to favorites`);
      }
    } catch {
      setOptimistic(fav);
      toast.error("Could not update favorite");
    }
  };

  return (
    <article
      onClick={handleOpen}
      className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-ring"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {bike.main_image_url ? (
          <img
            src={bike.main_image_url}
            alt={`${bike.name}${bike.year ? ` ${bike.year}` : ""}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}

        {/* Available pill (top-left) */}
        <div
          className={cn(
            "absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm",
            available
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              available ? "bg-[hsl(var(--primary-foreground))]" : "bg-muted-foreground"
            )}
          />
          {available ? "Available" : "Booked"}
        </div>

        {/* Heart (top-right) */}
        <button
          type="button"
          onClick={handleHeart}
          aria-label={fav ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={fav}
          className={cn(
            "absolute top-2 right-2 w-11 h-11 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-background hover:scale-105 shadow-sm"
          )}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-all",
              fav ? "fill-red-500 text-red-500" : "text-gray-700",
              pop && "animate-[heart-pop_250ms_ease-out]"
            )}
          />
        </button>

        {/* Category tag (bottom-left) */}
        {bike.category && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-medium text-white bg-black/70 capitalize">
            {bike.category}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Title + location */}
        <h3 className="font-semibold text-[16px] md:text-[17px] text-foreground leading-tight line-clamp-1">
          {bike.name}
          {bike.year ? <span className="font-normal text-muted-foreground"> · {bike.year}</span> : null}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="line-clamp-1">
            {bike.neighborhood || "—"}
            {cityName ? ` · ${cityName}` : ""}
          </span>
        </div>

        {/* Specs grid (Common Region) */}
        <div className="mt-3 grid grid-cols-3 border border-border rounded-lg overflow-hidden">
          <SpecCell
            icon={<Settings2 className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            value={bike.engine_cc ? `${bike.engine_cc}cc` : "—"}
            label="Engine"
            divide
          />
          <SpecCell
            icon={<Fuel className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            value={bike.fuel_type ? capitalize(bike.fuel_type) : "—"}
            label="Fuel"
            divide
          />
          <SpecCell
            icon={<CalendarIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            value={bike.year ? String(bike.year) : "—"}
            label="Year"
          />
        </div>

        {/* Amenities */}
        {visibleFeatures.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleFeatures.map((f, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground/70"
              >
                {f}
              </span>
            ))}
            {extra > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground/70">
                +{extra} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="leading-none">
            <span className="text-[20px] font-bold text-foreground">{effective}</span>
            <span className="text-[12px] text-muted-foreground ml-1">MAD /day</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Deposit: {deposit} MAD
          </div>
        </div>
        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          View details
        </Button>
      </div>
    </article>
  );
}

function SpecCell({
  icon,
  value,
  label,
  divide,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  divide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center",
        divide && "border-r border-border"
      )}
    >
      <span className="text-gray-700 dark:text-gray-300">{icon}</span>
      <span className="text-[13px] font-semibold text-foreground leading-none truncate max-w-full">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground leading-none">
        {label}
      </span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
