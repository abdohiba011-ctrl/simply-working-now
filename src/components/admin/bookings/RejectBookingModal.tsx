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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, XCircle } from "lucide-react";

interface RejectBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (reasonCode: string, reasonText: string, options: { notifyCustomer: boolean; flagCustomer: boolean }) => Promise<void>;
  isLoading: boolean;
}

const REJECTION_REASONS = [
  { code: 'bike_unavailable', label: 'Bike Unavailable' },
  { code: 'dates_conflict', label: 'Dates Conflict' },
  { code: 'customer_issue', label: 'Customer Issue' },
  { code: 'fraud_suspected', label: 'Fraud Suspected' },
  { code: 'payment_issue', label: 'Payment Issue' },
  { code: 'location_unavailable', label: 'Location Unavailable' },
  { code: 'other', label: 'Other' },
];

export const RejectBookingModal = ({
  open,
  onOpenChange,
  onReject,
  isLoading
}: RejectBookingModalProps) => {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [flagCustomer, setFlagCustomer] = useState(false);

  const handleReject = async () => {
    if (!reasonCode) return;
    await onReject(reasonCode, reasonText, { notifyCustomer, flagCustomer });
    // Reset form
    setReasonCode("");
    setReasonText("");
    setNotifyCustomer(true);
    setFlagCustomer(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setReasonCode("");
    setReasonText("");
    setNotifyCustomer(true);
    setFlagCustomer(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Reject Booking
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Code */}
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label>Additional Details (Optional)</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Provide any additional context..."
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyCustomer"
                checked={notifyCustomer}
                onCheckedChange={(checked) => setNotifyCustomer(checked as boolean)}
              />
              <Label htmlFor="notifyCustomer" className="text-sm">
                Notify customer about rejection
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="flagCustomer"
                checked={flagCustomer}
                onCheckedChange={(checked) => setFlagCustomer(checked as boolean)}
              />
              <Label htmlFor="flagCustomer" className="text-sm text-warning">
                Flag customer for review
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleReject} 
            disabled={!reasonCode || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reject Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
