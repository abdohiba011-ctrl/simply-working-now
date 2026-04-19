import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { CalendarIcon, Loader2, Bike, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogContentSkeleton } from "@/components/ui/bike-skeleton";

interface CreateBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  onSuccess: () => void;
}

interface BikeType {
  id: string;
  name: string;
  daily_price: number;
  main_image_url: string;
  city_id: string | null;
}

interface City {
  id: string;
  name: string;
  is_available: boolean;
}

interface Location {
  id: string;
  name: string;
  city_id: string | null;
}

export const CreateBookingDialog = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  onSuccess,
}: CreateBookingDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [bikes, setBikes] = useState<{ id: string; bike_type_id: string }[]>([]);
  
  // Form state
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedBikeType, setSelectedBikeType] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  
  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch available cities
      const { data: citiesData } = await supabase
        .from("service_cities")
        .select("id, name, is_available")
        .eq("is_available", true)
        .order("name");
      
      setCities(citiesData || []);
      
      // Fetch all bike types
      const { data: bikeTypesData } = await supabase
        .from("bike_types")
        .select("id, name, daily_price, main_image_url, city_id")
        .eq("is_approved", true)
        .order("name");
      
      setBikeTypes(bikeTypesData || []);
      
      // Fetch all locations
      const { data: locationsData } = await supabase
        .from("service_locations")
        .select("id, name, city_id")
        .eq("is_active", true)
        .order("name");
      
      setLocations(locationsData || []);
      
      // Fetch all bikes
      const { data: bikesData } = await supabase
        .from("bikes")
        .select("id, bike_type_id")
        .eq("available", true);
      
      setBikes(bikesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter bike types by selected city
  const filteredBikeTypes = selectedCity
    ? bikeTypes.filter(bt => bt.city_id === selectedCity || !bt.city_id)
    : bikeTypes;
  
  // Filter locations by selected city
  const filteredLocations = selectedCity
    ? locations.filter(loc => loc.city_id === selectedCity)
    : locations;
  
  // Calculate pricing
  const selectedBike = bikeTypes.find(bt => bt.id === selectedBikeType);
  const days = pickupDate && returnDate ? differenceInDays(returnDate, pickupDate) + 1 : 0;
  const totalPrice = selectedBike ? selectedBike.daily_price * days : 0;
  
  const handleSubmit = async () => {
    // Validation
    if (!selectedCity) {
      toast.error("Please select a city");
      return;
    }
    if (!selectedBikeType) {
      toast.error("Please select a motorbike");
      return;
    }
    if (!pickupDate || !returnDate) {
      toast.error("Please select pickup and return dates");
      return;
    }
    if (deliveryMethod === "pickup" && !selectedLocation) {
      toast.error("Please select a pickup location");
      return;
    }
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    
    // Find an available bike of this type
    const availableBike = bikes.find(b => b.bike_type_id === selectedBikeType);
    if (!availableBike) {
      toast.error("No available bikes of this type");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const locationName = deliveryMethod === "pickup"
        ? locations.find(l => l.id === selectedLocation)?.name || ""
        : deliveryAddress;
      
      const { error } = await supabase.from("bookings").insert({
        user_id: clientId,
        bike_id: availableBike.id,
        customer_name: clientName || "Unknown",
        customer_email: clientEmail || "",
        customer_phone: clientPhone || "",
        pickup_date: format(pickupDate, "yyyy-MM-dd"),
        return_date: format(returnDate, "yyyy-MM-dd"),
        total_price: totalPrice,
        delivery_method: deliveryMethod,
        delivery_location: locationName,
        status: "confirmed",
        booking_status: "confirmed",
        admin_status: "processed",
        admin_notes: "Created manually by admin",
      });
      
      if (error) throw error;
      
      toast.success("Booking created successfully");
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error("Error creating booking:", error);
      toast.error(getErrMsg(error) || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setSelectedCity("");
    setSelectedBikeType("");
    setSelectedLocation("");
    setPickupDate(undefined);
    setReturnDate(undefined);
    setDeliveryMethod("pickup");
    setDeliveryAddress("");
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Booking for Client</DialogTitle>
          <DialogDescription>
            Create a new booking for {clientName || "this client"}.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <DialogContentSkeleton />
        ) : (
          <div className="space-y-4 py-4">
            {/* City Selection */}
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Bike Type Selection */}
            <div className="space-y-2">
              <Label>Motorbike</Label>
              <Select 
                value={selectedBikeType} 
                onValueChange={setSelectedBikeType}
                disabled={!selectedCity}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCity ? "Select motorbike" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredBikeTypes.map((bike) => (
                    <SelectItem key={bike.id} value={bike.id}>
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4" />
                        {bike.name} - {bike.daily_price} DH/day
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pickupDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pickupDate}
                      onSelect={(date) => {
                        setPickupDate(date);
                        if (date && (!returnDate || returnDate < date)) {
                          setReturnDate(addDays(date, 1));
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !returnDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      disabled={(date) => 
                        date < new Date() || 
                        (pickupDate ? date < pickupDate : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Delivery Method */}
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select 
                value={deliveryMethod} 
                onValueChange={(v) => setDeliveryMethod(v as "pickup" | "delivery")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup from Location</SelectItem>
                  <SelectItem value="delivery">Delivery to Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Location or Address */}
            {deliveryMethod === "pickup" ? (
              <div className="space-y-2">
                <Label>Pickup Location</Label>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  disabled={!selectedCity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCity ? "Select location" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {location.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter delivery address"
                />
              </div>
            )}
            
            {/* Price Summary */}
            {selectedBike && days > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Daily Rate:</span>
                  <span>{selectedBike.daily_price} DH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duration:</span>
                  <span>{days} day(s)</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{totalPrice} DH</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
