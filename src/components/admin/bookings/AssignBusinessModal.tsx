import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  MapPin, 
  CheckCircle,
  Loader2,
  Building2,
  Phone,
  Mail,
  Briefcase
} from "lucide-react";

interface BusinessUser {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  business_type?: string | null;
}

interface AssignBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businesses: BusinessUser[];
  onAssign: (businessId: string, businessName: string) => Promise<void>;
  isLoading: boolean;
  bookingLocation?: string;
}

export const AssignBusinessModal = ({
  open,
  onOpenChange,
  businesses,
  onAssign,
  isLoading,
  bookingLocation
}: AssignBusinessModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessUser | null>(null);

  const filteredBusinesses = businesses.filter(business => {
    const query = searchQuery.toLowerCase();
    return (
      business.name?.toLowerCase().includes(query) ||
      business.email?.toLowerCase().includes(query) ||
      business.address?.toLowerCase().includes(query)
    );
  });

  const handleAssign = async () => {
    if (!selectedBusiness) return;
    await onAssign(selectedBusiness.id, selectedBusiness.name || selectedBusiness.email || 'Business');
    setSelectedBusiness(null);
    setSearchQuery("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedBusiness(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assign to Business
          </DialogTitle>
          <DialogDescription>
            Select a business partner to handle this booking.
            {bookingLocation && (
              <span className="flex items-center gap-1 mt-1 text-foreground">
                <MapPin className="h-3 w-3" /> Booking Location: {bookingLocation}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Business List */}
          <ScrollArea className="h-[300px] pr-4">
            {filteredBusinesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No businesses found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBusinesses.map((business) => (
                  <Card
                    key={business.id}
                    className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedBusiness?.id === business.id 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : ''
                    }`}
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {business.name || 'Unnamed Business'}
                          </p>
                          {selectedBusiness?.id === business.id && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                          {business.email && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {business.email}
                            </p>
                          )}
                          {business.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {business.phone}
                            </p>
                          )}
                          {business.address && (
                            <p className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {business.address}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {business.business_type && (
                          <Badge variant="outline" className="text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {business.business_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Business Preview */}
          {selectedBusiness && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium">
                Selected: {selectedBusiness.name || selectedBusiness.email}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedBusiness || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Business
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
