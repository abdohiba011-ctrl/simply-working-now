import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";

interface PricingBreakdown {
  daily_rate?: number;
  days?: number;
  subtotal?: number;
  discount?: number;
  discount_percentage?: number;
  delivery_fee?: number;
  service_fee?: number;
  deposit?: number;
  tax?: number;
}

interface BookingPriceBreakdownProps {
  totalPrice: number;
  dailyRate: number;
  rentalDays: number;
  pricingBreakdown?: PricingBreakdown | null;
  amountPaid: number;
  deliveryMethod?: string;
}

export const BookingPriceBreakdown = ({
  totalPrice,
  dailyRate,
  rentalDays,
  pricingBreakdown,
  amountPaid,
  deliveryMethod
}: BookingPriceBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const subtotal = pricingBreakdown?.subtotal || (dailyRate * rentalDays);
  const discount = pricingBreakdown?.discount || 0;
  const deliveryFee = pricingBreakdown?.delivery_fee || (deliveryMethod === 'delivery' ? 50 : 0);
  const serviceFee = pricingBreakdown?.service_fee || 0;
  const deposit = pricingBreakdown?.deposit || 0;
  const tax = pricingBreakdown?.tax || 0;
  const amountDue = totalPrice - amountPaid;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Price Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Basic Summary - Always Visible */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Daily Rate</span>
            <span>{dailyRate} DH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span>{rentalDays} days</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{totalPrice} DH</span>
          </div>
        </div>

        {/* Expandable Breakdown */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8">
              <span className="text-xs">View Breakdown</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="text-sm space-y-1.5 bg-muted/50 rounded-lg p-3">
              {/* Subtotal */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {dailyRate} DH × {rentalDays} days
                </span>
                <span>{subtotal} DH</span>
              </div>

              {/* Discount */}
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>
                    Discount
                    {pricingBreakdown?.discount_percentage && ` (${pricingBreakdown.discount_percentage}%)`}
                  </span>
                  <span>-{discount} DH</span>
                </div>
              )}

              {/* Delivery Fee */}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{deliveryFee} DH</span>
                </div>
              )}

              {/* Service Fee (admin only) */}
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>{serviceFee} DH</span>
                </div>
              )}

              {/* Tax */}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{tax} DH</span>
                </div>
              )}

              {/* Deposit */}
              {deposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span>{deposit} DH</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-1.5 flex justify-between font-semibold">
                <span>Total Due</span>
                <span>{totalPrice} DH</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="text-sm space-y-1.5 border-t pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-success">{amountPaid} DH</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Remaining</span>
                <span className={amountDue > 0 ? 'text-warning' : 'text-success'}>
                  {amountDue} DH
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
