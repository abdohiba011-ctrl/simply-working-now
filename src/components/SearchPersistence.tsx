import { useEffect, useState } from "react";
import { X, MapPin, Calendar, Bike, Save, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface SearchData {
  location: string;
  pickupDate: string;
  endDate: string;
  bikeType: string;
}

const cities = ["Casablanca", "Marrakesh", "Rabat", "Fes", "Tangier", "Agadir", "Essaouira", "Chefchaouen", "Meknes", "Ouarzazate", "Tiznit", "Khemisset"];

export const SearchPersistence = () => {
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>();
  const [editBikeType, setEditBikeType] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    try {
      const savedSearch = localStorage.getItem("motonitaSearch");
      if (savedSearch) {
        const parsed = JSON.parse(savedSearch);
        // Validate parsed data structure
        if (parsed && typeof parsed === 'object' && 
            'location' in parsed && 'pickupDate' in parsed && 
            'endDate' in parsed && 'bikeType' in parsed) {
          setSearchData(parsed);
        } else {
          // Clear invalid data
          localStorage.removeItem("motonitaSearch");
        }
      }
    } catch (error) {
      // Clear corrupted data
      console.error('Error parsing saved search data:', error);
      localStorage.removeItem("motonitaSearch");
    }
  }, []);

  const handleClear = () => {
    localStorage.removeItem("motonitaSearch");
    setSearchData(null);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (searchData) {
      setEditLocation(searchData.location);
      setEditBikeType(searchData.bikeType);
      
      // Parse dates for date range picker
      if (searchData.pickupDate && searchData.endDate) {
        setEditDateRange({
          from: new Date(searchData.pickupDate),
          to: new Date(searchData.endDate)
        });
      }
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editLocation && editDateRange?.from && editDateRange?.to && editBikeType) {
      const newSearchData = {
        location: editLocation,
        pickupDate: format(editDateRange.from, "yyyy-MM-dd"),
        endDate: format(editDateRange.to, "yyyy-MM-dd"),
        bikeType: editBikeType
      };
      localStorage.setItem("motonitaSearch", JSON.stringify(newSearchData));
      setSearchData(newSearchData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditLocation("");
    setEditDateRange(undefined);
    setEditBikeType("");
  };

  if (!searchData) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 py-3 px-4">
      <div className="container mx-auto">
        {!isEditing ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm">
              {searchData.location && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-semibold">{searchData.location}</span>
                </div>
              )}
              {searchData.pickupDate && searchData.endDate && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-semibold">{searchData.pickupDate} {t('search.to')} {searchData.endDate}</span>
                </div>
              )}
              {searchData.bikeType && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Bike className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-semibold">{searchData.bikeType}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 sm:h-8 gap-1 text-xs sm:text-sm"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline font-medium">{t('search.edit')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 sm:h-8 gap-1 text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline font-medium">{t('search.clear')}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="flex-1 h-9 px-2 rounded-md border-2 border-input bg-background text-foreground text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t('hero.location')}</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex-1 h-9 px-2 rounded-md border-2 border-input bg-background text-foreground text-sm text-left focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {editDateRange?.from && editDateRange?.to
                        ? `${format(editDateRange.from, "MMM dd")} - ${format(editDateRange.to, "MMM dd")}`
                        : t('hero.selectedDates')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={editDateRange}
                      onSelect={setEditDateRange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Bike Type */}
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-primary flex-shrink-0" />
                <select
                  value={editBikeType}
                  onChange={(e) => setEditBikeType(e.target.value)}
                  className="flex-1 h-9 px-2 rounded-md border-2 border-input bg-background text-foreground text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t('hero.bikeType')}</option>
                  <option value="Sport">Sport</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Cruiser">Cruiser</option>
                  <option value="Touring">Touring</option>
                  <option value="Scooter">Scooter</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-sm"
              >
                {t('search.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="h-8 gap-1 text-sm"
              >
                <Save className="h-4 w-4" />
                {t('search.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
