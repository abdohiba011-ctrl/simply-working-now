import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BikeCard } from "@/components/BikeCard";
import { useFavorites } from "@/lib/favorites";
import { useAuthStore } from "@/stores/useAuthStore";

type FavRow = {
  id: string;
  bike_type_id: string;
  bike_type: {
    id: string;
    slug: string | null;
    name: string;
    category: string | null;
    fuel_type: string | null;
    daily_price: number | null;
    weekly_price: number | null;
    monthly_price: number | null;
    main_image_url: string | null;
    neighborhood: string | null;
    features: string[] | null;
    year: number | null;
    engine_cc: number | null;
  } | null;
};

export default function Favorites() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useFavorites();
  const rows = ((data || []) as unknown) as FavRow[];
  const items = rows.filter((r) => r.bike_type);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 -ml-2 mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Loading…" : `${items.length} bike${items.length === 1 ? "" : "s"} saved`}
        </p>

        <div className="mt-6">
          {!user ? (
            <EmptyShell
              title="Sign in to see your favorites"
              subtitle="Save bikes you like so you can come back to them later."
              cta="Sign in"
              onCta={() => navigate("/login?redirect=" + encodeURIComponent("/favorites"))}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyShell
              title="No favorites yet"
              subtitle="Tap the heart icon on any bike to save it here."
              cta="Browse bikes"
              onCta={() => navigate("/rent/casablanca")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((r) => (
                <BikeCard
                  key={r.id}
                  bike={r.bike_type!}
                  isFavorited={true}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}

function EmptyShell({
  title,
  subtitle,
  cta,
  onCta,
}: {
  title: string;
  subtitle: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Heart className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <Button onClick={onCta}>{cta}</Button>
    </div>
  );
}
