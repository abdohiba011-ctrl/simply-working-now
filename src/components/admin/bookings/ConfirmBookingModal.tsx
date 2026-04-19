import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Calendar, 
  Bike, 
  MapPin, 
  CreditCard,
  Building2,
  Loader2,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface ConfirmBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    pickup_date: string;
    return_date: string;
    total_price: number;
    bikes?: {
      location: string;
      bike_types: {
        name: string;
      };
    };
    assigned_to_business?: string | null;
    payment_status?: string;
  };
  assignedBusinessName?: string;
  onConfirm: (options: { generateContract: boolean; notifyCustomer: boolean }) => Promise<void>;
  isLoading: boolean;
}

export const ConfirmBookingModal = ({
  open,
  onOpenChange,
  booking,
  assignedBusinessName,
  onConfirm,
  isLoading
}: ConfirmBookingModalProps) => {
  const [generateContract, setGenerateContract] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const handleConfirm = async () => {
    await onConfirm({ generateContract, notifyCustomer });
  };

  const rentalDays = Math.ceil(
    (new Date(booking.return_date).getTime() - new Date(booking.pickup_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Confirm Booking
          </DialogTitle>
          <DialogDescription>
            Review the booking details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{booking.customer_name}</p>
              <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
              <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Dates</p>
                <p className="font-medium">
                  {format(new Date(booking.pickup_date), 'MMM d')} → {format(new Date(booking.return_date), 'MMM d')}
                </p>
                <p className="text-xs text-muted-foreground">({rentalDays} days)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Motorbike</p>
                <p className="font-medium">{booking.bikes?.bike_types?.name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{booking.bikes?.location || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{booking.total_price} DH</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment & Assignment Status */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Payment:</span>
              <Badge 
                variant="outline" 
                className={booking.payment_status === 'paid' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
                }
              >
                {booking.payment_status || 'unpaid'}
              </Badge>
            </div>
            
            {booking.assigned_to_business ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{assignedBusinessName || 'Assigned'}</span>
              </div>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Not Assigned
              </Badge>
            )}
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateContract"
                checked={generateContract}
                onCheckedChange={(checked) => setGenerateContract(checked as boolean)}
              />
              <Label htmlFor="generateContract" className="text-sm">
                Generate contract after confirmation
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyCustomer"
                checked={notifyCustomer}
                onCheckedChange={(checked) => setNotifyCustomer(checked as boolean)}
              />
              <Label htmlFor="notifyCustomer" className="text-sm">
                Notify customer via email
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
