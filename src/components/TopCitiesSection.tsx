import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { cityToSlug } from "@/lib/citySlug";

// Fallback images for cities - optimized AVIF format
import marrakeshImg from "@/assets/city-marrakesh.avif";
import casablancaImg from "@/assets/city-casablanca.avif";
import rabatImg from "@/assets/city-rabat.avif";
import fesImg from "@/assets/city-fes.avif";
import tangierImg from "@/assets/city-tangier.avif";
import agadirImg from "@/assets/city-agadir.avif";
import essaouiraImg from "@/assets/city-essaouira.avif";
import chefchaouenImg from "@/assets/city-chefchaouen.avif";

const fallbackImages: Record<string, string> = {
  casablanca: casablancaImg,
  marrakesh: marrakeshImg,
  rabat: rabatImg,
  fes: fesImg,
  tangier: tangierImg,
  agadir: agadirImg,
  essaouira: essaouiraImg,
  chefchaouen: chefchaouenImg,
};

export const TopCitiesSection = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['service-cities-homepage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_cities')
        .select('*')
        .eq('show_in_homepage', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Live bike counts per city — sourced from real bike_types data via the
  // city_bike_counts view. Never fall back to the manually-typed
  // service_cities.bikes_count column (it can be wrong/fake).
  const { data: liveCounts = [] } = useQuery({
    queryKey: ['city-bike-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city_bike_counts' as any)
        .select('city_id, bikes_available');
      if (error) throw error;
      return ((data as unknown) || []) as Array<{ city_id: string; bikes_available: number }>;
    },
  });

  const countByCity = new Map<string, number>(
    liveCounts.map((c) => [c.city_id, Number(c.bikes_available) || 0])
  );

  // Realtime: refresh counts whenever cities or bike_types change
  useEffect(() => {
    const channel = supabase
      .channel('cities_homepage_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_cities' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-cities-homepage'] });
          queryClient.invalidateQueries({ queryKey: ['city-bike-counts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bike_types' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['city-bike-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <section className="py-20 bg-secondary/30" aria-label={t('cities.title')}>
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          </div>
        </div>
      </section>
    );
  }

  if (cities.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
    <section className="py-20 bg-secondary/30" aria-label={t('cities.title')}>
      <div className="container mx-auto px-4">
        <header className="text-center mb-12 animate-fade-in">
          <h2 className="mb-4 text-foreground text-3xl md:text-4xl font-bold">{t('cities.title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('cities.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up max-w-7xl mx-auto">
          {cities.map((city, index) => {
            const cityName = t(`cityNames.${city.name_key}`) || city.name;
            const cityImage = city.image_url || fallbackImages[city.name_key] || casablancaImg;
            const isAvailable = city.is_available && !city.is_coming_soon;
            
            return (
              <Card
                key={city.id}
                className={`group overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-border rounded-xl ${
                  isAvailable ? 'cursor-pointer hover:scale-105 hover:border-primary/50' : 'cursor-not-allowed opacity-90'
                }`}
                onClick={() =>
                  isAvailable &&
                  navigate(`/rent/${cityToSlug(city.name)}`)
                }
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <ResponsiveImage
                    src={cityImage}
                    alt={cityName}
                    width={300}
                    height={400}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    fallback={casablancaImg}
                    className={`w-full h-full transition-transform duration-300 ${
                      isAvailable ? 'group-hover:scale-110' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  {!isAvailable && (
                    <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-white text-black font-bold text-sm px-4 py-2 hover:bg-white/90">
                            {t('cities.comingSoon')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('cities.comingSoonTooltip').replace('{city}', cityName)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {cityName}
                    </h3>
                    <p className="text-sm text-white/90 font-medium">
                      {countByCity.get(city.id) ?? 0} {t('cities.bikesAvailable')}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
    </TooltipProvider>
  );
};