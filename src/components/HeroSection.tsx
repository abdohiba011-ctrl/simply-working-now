import { useState, useEffect, useRef, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar, MapPin, Check, Bike, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangePicker } from "@/components/DateRangePicker";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-casablanca-mosque.jpg";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";
import { usePricingTiers } from "@/hooks/usePricingTiers";

// Fallback bike images (used while loading or if DB fails) - optimized thumbnails for 200x150 display
import sanyaImg from "@/assets/hero-bikes/sanya-thumb.webp";
import becaneImg from "@/assets/hero-bikes/becane-thumb.webp";
import cappuccinoImg from "@/assets/hero-bikes/cappuccino-thumb.webp";
import orbitImg from "@/assets/hero-bikes/orbit-thumb.webp";
import shImg from "@/assets/hero-bikes/sh-thumb.webp";

// Fallback Casablanca neighborhoods (used while loading)
const fallbackNeighborhoods = ["Tet Mellil", "Mediouna", "Deroua - Berrechid", "Maarif", "Derb Sultan", "Sidi Maarouf", "Anfa", "Ain Diab", "Bouskoura"];

// Fallback bike types (shown while loading)
const fallbackBikeTypes = [{
  id: "sanya",
  name: "Sanya R1000",
  image: sanyaImg,
  price: "59-99 DH/day"
}, {
  id: "becane",
  name: "Becane 33",
  image: becaneImg,
  price: "59-99 DH/day"
}, {
  id: "cappuccino",
  name: "Cappuccino S",
  image: cappuccinoImg,
  price: "59-99 DH/day"
}, {
  id: "orbit",
  name: "SYM Orbit II 50cc",
  image: orbitImg,
  price: "59-99 DH/day"
}, {
  id: "sh",
  name: "SH",
  image: shImg,
  price: "59-99 DH/day"
}];

interface BikeTypeDisplay {
  id: string;
  name: string;
  image: string;
  price: string;
}
export const HeroSection = memo(() => {
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [bikeType, setBikeType] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [formErrors, setFormErrors] = useState<{ bike?: boolean; location?: boolean; dates?: boolean }>({});
  const [isOtherLocation, setIsOtherLocation] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [customLocationDetail, setCustomLocationDetail] = useState("");
  const bikeSelectionRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { data: pricingTiers } = usePricingTiers();

  // Fetch locations from database (cached, available cities only)
  const { data: neighborhoods = fallbackNeighborhoods } = useQuery({
    queryKey: ['hero-service-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_locations')
        .select('id, name, city_id, service_cities!inner(is_available)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      type LocRow = { name: string; service_cities?: { is_available?: boolean } | null };
      const available = (data as LocRow[] | null)?.filter(l => l.service_cities?.is_available === true) ?? [];
      return available.length > 0 ? available.map(l => l.name) : fallbackNeighborhoods;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Calculate price range from pricing tiers
  const priceRange = useMemo(() => {
    if (!pricingTiers || pricingTiers.length === 0) {
      return "59-99 DH/day";
    }
    const prices = pricingTiers.map(t => t.daily_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return `${minPrice}-${maxPrice} DH/day`;
  }, [pricingTiers]);

  // Fetch bike types from database (cached, no realtime on landing)
  const { data: bikeTypes = fallbackBikeTypes } = useQuery({
    queryKey: ['hero-bike-types', priceRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bike_types')
        .select('id, name, main_image_url, daily_price')
        .eq('is_original', true)
        .eq('is_approved', true)
        .order('name');
      if (error) throw error;
      if (!data || data.length === 0) return fallbackBikeTypes;
      return data.map(bike => ({
        id: bike.id,
        name: bike.name,
        image: resolveBikeImageUrl(bike.main_image_url),
        price: priceRange,
      })) as BikeTypeDisplay[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Check if user is blocked
  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!user) {
        setIsBlocked(false);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('is_frozen')
        .eq('id', user.id)
        .single();
      
      setIsBlocked(data?.is_frozen || false);
    };
    
    checkBlockedStatus();
  }, [user]);
  // Restore search data from localStorage on mount
  useEffect(() => {
    const savedSearch = localStorage.getItem("motoriSearch");
    if (savedSearch) {
      try {
        const data = JSON.parse(savedSearch);
        if (data.bikeType) setBikeType(data.bikeType);
        if (data.location) setLocation(data.location);
        if (data.pickupDate && data.endDate) {
          setDateRange({
            from: new Date(data.pickupDate),
            to: new Date(data.endDate)
          });
        }
      } catch (e) {
        console.error("Failed to parse saved search data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCityIndex(prev => (prev + 1) % neighborhoods.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setFormErrors({});
    
    // Check if user is blocked
    if (isBlocked) {
      toast.error(t('hero.blockedMessage'), {
        description: t('hero.contactSupport')
      });
      return;
    }
    
    // Collect all validation errors
    const errors: { bike?: boolean; location?: boolean; dates?: boolean } = {};
    
    if (!location && !isOtherLocation) {
      errors.location = true;
    } else if (isOtherLocation && (!customCity.trim() || !customLocationDetail.trim())) {
      errors.location = true;
    }
    if (!dateRange?.from || !dateRange?.to) {
      errors.dates = true;
    }
    
    // If there are errors, show them and scroll to first error
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      if (errors.location) {
        toast.error(t('hero.noLocationError'), {
          description: t('hero.noLocationDesc')
        });
        requestAnimationFrame(() => {
          locationRef.current?.focus();
        });
      } else if (errors.dates) {
        toast.error(t('hero.noDatesError'), {
          description: t('hero.noDatesDesc')
        });
        requestAnimationFrame(() => {
          dateRef.current?.click();
        });
      }
      return;
    }
    const pickupDate = format(dateRange.from, "yyyy-MM-dd");
    const endDate = format(dateRange.to, "yyyy-MM-dd");

    // Determine final location value
    const finalLocation = isOtherLocation 
      ? `${customCity.trim()} - ${customLocationDetail.trim()}`
      : location;

    // Save search data to localStorage
    const searchData = {
      location: finalLocation,
      pickupDate,
      endDate,
      bikeType
    };
    localStorage.setItem("motoriSearch", JSON.stringify(searchData));

    // Navigate directly to bike details page for the selected bike type
    // First, we need to find a bike of that type in the selected location
    const {
      supabase
    } = await import("@/integrations/supabase/client");
    const {
      data: bikes
    } = await supabase.from("bikes").select("id, bike_type_id, bike_type:bike_types(name)").eq("location", finalLocation).eq("available", true);
    if (bikes && bikes.length > 0) {
      // Find bike matching the selected type
      const matchingBike = bikes.find(b => b.bike_type?.name === bikeType);
      if (matchingBike) {
        navigate(`/bike/${matchingBike.id}?pickup=${pickupDate}&end=${endDate}`);
        return;
      }
    }

    // Fallback to listings if no specific bike found
    navigate(`/listings?bikeType=${encodeURIComponent(bikeType)}&location=${encodeURIComponent(finalLocation)}&pickup=${pickupDate}&end=${endDate}`);
  };

  // Memoize bike types to prevent unnecessary re-renders
  const memoizedBikeTypes = useMemo(() => bikeTypes, [bikeTypes]);

  return <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay - using img for LCP discovery */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="" 
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-black/15" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto text-center mb-12 animate-fade-in">
          
          <h1 className="text-white mb-6 leading-tight font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl px-4">{t('hero.title')}</h1>
          <div className="h-16 flex items-center justify-center">
            <div className="relative inline-block">
              <p className="relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-foreground bg-primary rounded-2xl shadow-lg transition-all duration-500 animate-scale-in py-2 sm:py-3 px-6 sm:px-8 mx-0 text-center">
                {t('hero.inLocation')} {neighborhoods[currentCityIndex]}
              </p>
            </div>
          </div>
          <p className="text-white/90 text-base sm:text-lg mt-4 font-semibold">{t('hero.subtitle')}</p>
        </div>

        {/* Search Card */}
        <Card className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 shadow-2xl bg-gradient-to-br from-background/95 to-card/95 backdrop-blur-md border-2 border-primary/20 animate-slide-up">
          {/* Blocked User Alert */}
          {isBlocked && (
            <Alert className="mb-6 bg-destructive border-destructive">
              <AlertTriangle className="h-4 w-4 text-white" />
              <AlertDescription className="text-white">
                {t('hero.blockedMessage')} 
                <a href="mailto:contact@motori.ma" className="underline ml-1 font-medium text-white">{t('hero.contactSupport')}</a>
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Location and Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className={`flex items-center gap-2 font-semibold ${formErrors.location ? 'text-destructive' : 'text-foreground'}`}>
                  <MapPin className="h-4 w-4" />
                  {t('hero.location')} {formErrors.location && <span className="text-sm font-normal">(Required)</span>}
                </Label>
                <select 
                  ref={locationRef} 
                  id="location" 
                  value={isOtherLocation ? "other" : location} 
                  onChange={e => { 
                    const value = e.target.value;
                    if (value === 'other') {
                      setIsOtherLocation(true);
                      setLocation('');
                    } else {
                      setIsOtherLocation(false);
                      setLocation(value);
                      setCustomCity('');
                      setCustomLocationDetail('');
                    }
                    setFormErrors(prev => ({ ...prev, location: false })); 
                  }} 
                  className={`w-full h-12 px-4 pr-10 rounded-lg border-2 bg-background text-foreground hover:bg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] ${formErrors.location ? 'border-destructive ring-2 ring-destructive/30' : ''}`} 
                  required 
                  aria-label="Select your location"
                >
                  <option value="">{t('hero.selectNeighborhood')}</option>
                  {neighborhoods.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
                  <option value="other">{t('hero.otherLocation')}</option>
                </select>
                
                {/* Custom location fields when "Other" is selected */}
                {isOtherLocation && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-fade-in">
                    <Input
                      placeholder={t('hero.enterCityName')}
                      value={customCity}
                      onChange={(e) => {
                        setCustomCity(e.target.value);
                        setFormErrors(prev => ({ ...prev, location: false }));
                      }}
                      className={`h-12 ${formErrors.location && !customCity.trim() ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                    />
                    <Input
                      placeholder={t('hero.enterLocationDetail')}
                      value={customLocationDetail}
                      onChange={(e) => {
                        setCustomLocationDetail(e.target.value);
                        setFormErrors(prev => ({ ...prev, location: false }));
                      }}
                      className={`h-12 ${formErrors.location && !customLocationDetail.trim() ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                    />
                  </div>
                )}
              </div>

              {/* Date Range - Using unified DateRangePicker */}
              <div className="space-y-2">
                <Label className={`flex items-center gap-2 font-semibold ${formErrors.dates ? 'text-destructive' : 'text-foreground'}`}>
                  <Calendar className="h-4 w-4" />
                  {t('hero.selectedDates')} {formErrors.dates && <span className="text-sm font-normal">(Required)</span>}
                </Label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateChange={(range) => {
                    setDateRange(range);
                    setFormErrors(prev => ({ ...prev, dates: false }));
                  }}
                  maxDays={30}
                  showPriceBreakdown={false}
                  placeholder={t('hero.selectDatesPlaceholder')}
                  triggerClassName={`h-12 ${formErrors.dates ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button type="submit" variant="hero" size="xl" className="w-full sm:w-auto sm:min-w-[280px] flex items-center justify-center gap-3 text-lg font-bold shadow-xl hover:shadow-2xl transition-all group">
                <Bike className="h-6 w-6 group-hover:scale-110 transition-transform" />
                {t('hero.bookNow')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>;
});

HeroSection.displayName = 'HeroSection';