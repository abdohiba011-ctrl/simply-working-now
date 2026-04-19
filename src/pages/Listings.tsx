import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BikeTypeSkeleton } from "@/components/ui/bike-skeleton";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Calendar, Bike, Star, MapPin as MapPinIcon, Info, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBikeTypes, useBikes } from "@/hooks/useBikes";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Neighborhood {
  id: string;
  name: string;
}

// Fallback neighborhoods (used while loading)
const fallbackNeighborhoods: Neighborhood[] = [
  { id: "tet-mellil", name: "Tet Mellil" },
  { id: "mediouna", name: "Mediouna" },
  { id: "deroua-berrechid", name: "Deroua - Berrechid" },
  { id: "maarif", name: "Maarif" },
  { id: "derb-sultan", name: "Derb Sultan" },
  { id: "sidi-maarouf", name: "Sidi Maarouf" },
  { id: "anfa", name: "Anfa" },
  { id: "ain-diab", name: "Ain Diab" },
  { id: "bouskoura", name: "Bouskoura" }
];

// Quantity available for each bike type (random between 5-15)
const bikeQuantities: Record<string, number> = {
  "Sanya R1000": 12,
  "Becane 33": 8,
  "Cappuccino S": 15,
  "SYM Orbit II 50cc": 7,
  "SH": 11
};

const Listings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedBike, setSelectedBike] = useState<string | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(fallbackNeighborhoods);
  const [selectedTab, setSelectedTab] = useState<string>(fallbackNeighborhoods[0].id);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const { t, isRTL } = useLanguage();
  
  // Fetch bike types and bikes from database
  const { data: bikeTypes, isLoading: isLoadingTypes } = useBikeTypes();
  const { data: bikes, isLoading: isLoadingBikes } = useBikes();

  const location = searchParams.get("location") || "";
  const pickupDate = searchParams.get("pickup") || "";
  const endDate = searchParams.get("end") || "";

  // Fetch locations from database (only from available cities)
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('service_locations')
          .select('id, name, city_id, service_cities!inner(is_available)')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter only locations from available cities
          type LocRow = { id: string; name: string; service_cities?: { is_available?: boolean } | null };
          const availableLocations = (data as LocRow[]).filter((loc) => loc.service_cities?.is_available === true);
          if (availableLocations.length > 0) {
            const mappedLocations = availableLocations.map((loc) => ({
              id: loc.id,
              name: loc.name
            }));
            setNeighborhoods(mappedLocations);
            // Set initial tab to first available location
            if (!location) {
              setSelectedTab(mappedLocations[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        // Keep fallback neighborhoods on error
      }
    };
    
    fetchLocations();
  }, []);

  // Initialize dates from URL
  useEffect(() => {
    if (pickupDate && endDate) {
      setDateRange({
        from: new Date(pickupDate),
        to: new Date(endDate)
      });
    }
  }, [pickupDate, endDate]);

  // Set initial tab from URL location
  useEffect(() => {
    if (location) {
      const neighborhood = neighborhoods.find(n => n.name === location);
      if (neighborhood) {
        setSelectedTab(neighborhood.id);
      }
    }
  }, [location]);

  // Get current neighborhood name
  const currentNeighborhood = neighborhoods.find(n => n.id === selectedTab)?.name || neighborhoods[0].name;

  // Transform database bikes to match expected format for display
  const motorbikes = useMemo(() => {
    if (!bikes || !bikeTypes) return [];
    
    return bikes
      .filter(bike => bike.location === currentNeighborhood)
      .map((bike) => {
        const bikeType = bike.bike_type || bikeTypes.find(t => t.id === bike.bike_type_id);
        
        if (!bikeType) return null;
        
        return {
          id: bike.id,
          name: bikeType?.name || "Unknown",
          type: bikeType?.name || "Unknown",
          location: bike.location,
          price: Number(bikeType?.daily_price || 0),
          rating: Number(bikeType?.rating || 5),
          image: getBikeImageUrl(bikeType?.main_image_url || "sanya-main"),
          features: Array.isArray(bikeType?.features) ? bikeType.features : [],
          quantity: bikeQuantities[bikeType?.name] || 10
        };
      })
      .filter(bike => bike !== null);
  }, [bikes, bikeTypes, currentNeighborhood]);

  // Group bikes by type
  const groupedBikes = useMemo(() => {
    const groups: Record<string, typeof motorbikes> = {};
    motorbikes.forEach(bike => {
      if (!groups[bike.type]) {
        groups[bike.type] = [];
      }
      groups[bike.type].push(bike);
    });
    return groups;
  }, [motorbikes]);

  const handleBikeSelect = (bikeId: string) => {
    const dates = dateRange?.from && dateRange?.to
      ? `?pickup=${format(dateRange.from, "yyyy-MM-dd")}&end=${format(dateRange.to, "yyyy-MM-dd")}`
      : "";
    navigate(`/bike/${bikeId}${dates}`);
  };

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    const neighborhood = neighborhoods.find(n => n.id === tabId);
    if (neighborhood) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("location", neighborhood.name);
      setSearchParams(newParams);
    }
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("pickup", format(range.from, "yyyy-MM-dd"));
      newParams.set("end", format(range.to, "yyyy-MM-dd"));
      setSearchParams(newParams);
    } else if (!range) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("pickup");
      newParams.delete("end");
      setSearchParams(newParams);
    }
  };
  
  if (isLoadingTypes || isLoadingBikes) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-black text-foreground mb-3">{t('listings.title')}</h1>
            <p className="text-lg text-muted-foreground">{t('listings.loading')}</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-7xl mx-auto space-y-8">
            {[1, 2].map((i) => (
              <BikeTypeSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Back to Homepage Button */}
      <div className="container mx-auto px-4 pt-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('listings.backToHomepage')}
        </Button>
      </div>
      
      {/* Hero-style Header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1 className="text-3xl md:text-5xl font-black text-foreground mb-3">
              {t('listings.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('listings.subtitle')}
            </p>
          </div>

          {/* Location Tabs */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPinIcon className="h-5 w-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">{t('listings.selectLocation')}</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {neighborhoods.map((neighborhood) => (
                <button
                  key={neighborhood.id}
                  onClick={() => handleTabChange(neighborhood.id)}
                  className={cn(
                    "px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 border-2",
                    selectedTab === neighborhood.id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  {neighborhood.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">{t('listings.selectDates')}</h2>
            </div>
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={handleDateChange}
              maxDays={30}
              showPriceBreakdown={false}
            />
          </div>

          {/* More Cities Coming Soon */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {t('listings.moreCitiesComingSoon')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bike Types Grid */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
        {Object.keys(groupedBikes).length === 0 ? (
          <EmptyState
            icon={Bike}
            title={t('listings.noMotorbikesTitle')}
            description={t('listings.noMotorbikesDesc').replace('{location}', currentNeighborhood)}
            actionLabel={t('listings.tryAnotherNeighborhood')}
            onAction={() => {
              const currentIndex = neighborhoods.findIndex(n => n.id === selectedTab);
              const nextIndex = (currentIndex + 1) % neighborhoods.length;
              handleTabChange(neighborhoods[nextIndex].id);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedBikes).map(([bikeType, bikesOfType]) => {
              const firstBike = bikesOfType[0];
              const quantity = firstBike?.quantity || 0;
              
              return (
                <Card
                  key={bikeType}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-xl border-2 overflow-hidden",
                    selectedBike === firstBike?.id
                      ? "border-primary shadow-lg scale-[1.02]"
                      : "border-transparent hover:border-primary/20"
                  )}
                  onClick={() => handleBikeSelect(firstBike?.id)}
                >
                  <CardContent className="p-0">
                    {/* Bike Image with Quantity Badge */}
                    <div className="relative aspect-[4/3] bg-white p-4 flex items-center justify-center">
                      <Badge 
                        variant="secondary" 
                        className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-sm font-bold px-3 py-1 bg-background/90 backdrop-blur-sm`}
                      >
                        {quantity} {t('listings.available')}
                      </Badge>
                      <img
                        src={firstBike?.image}
                        alt={bikeType}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* Bike Details */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-foreground text-xl">
                          {bikeType}
                        </h3>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="text-sm font-semibold text-foreground">
                            {firstBike?.rating}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{currentNeighborhood}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-2xl font-black text-foreground">
                          {firstBike?.price} DH<span className="text-sm font-normal text-muted-foreground">{t('hero.perDay')}</span>
                        </p>
                        <Button 
                          variant="hero"
                          className="min-h-[44px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBikeSelect(firstBike?.id);
                          }}
                        >
                          {t('hero.bookNow')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </div>

    </div>
  );
};

export default Listings;
