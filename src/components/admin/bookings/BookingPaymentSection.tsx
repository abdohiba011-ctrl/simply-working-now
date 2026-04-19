import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Loader2,
  Banknote,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import type { BookingPayment } from "@/hooks/useBookingPayments";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface BookingPaymentSectionProps {
  payments: BookingPayment[];
  isLoading: boolean;
  totalPrice: number;
  totalPaid: number;
  paymentStatus: string;
  onRecordPayment: (method: string, amount: number, notes?: string) => Promise<void>;
  onMarkAsPaid: () => Promise<void>;
}

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    case 'partially_paid':
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
    case 'failed':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Refunded</Badge>;
    default:
      return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>;
  }
};

const getTransactionStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-warning" />;
  }
};

export const BookingPaymentSection = ({ 
  payments, 
  isLoading, 
  totalPrice,
  totalPaid,
  paymentStatus,
  onRecordPayment,
  onMarkAsPaid
}: BookingPaymentSectionProps) => {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const amountDue = totalPrice - totalPaid;
  const isFullyPaid = amountDue <= 0;

  const handleMarkAsPaid = async () => {
    setIsMarkingPaid(true);
    try {
      await onMarkAsPaid();
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
              <CardDescription className="mt-1">
                Track payment status and transactions
              </CardDescription>
            </div>
            {getPaymentStatusBadge(paymentStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold">{totalPrice} DH</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount Paid</p>
              <p className="text-lg font-bold text-success">{totalPaid} DH</p>
            </div>
            <div className="col-span-2 border-t pt-2">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className={`text-lg font-bold ${amountDue > 0 ? 'text-warning' : 'text-success'}`}>
                {amountDue} DH
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isFullyPaid && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setShowRecordModal(true)}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Record Cash
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid}
              >
                {isMarkingPaid ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark as Paid
              </Button>
            </div>
          )}

          {/* Transactions List */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transactions</h4>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getTransactionStatusIcon(payment.status)}
                      <div>
                        <p className="font-medium capitalize">{payment.method}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'MMM d, HH:mm')}
                          {payment.recorded_by_name && ` • ${payment.recorded_by_name}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">{payment.amount} DH</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2 py-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted/50 animate-pulse rounded-lg" />
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentModal
        open={showRecordModal}
        onOpenChange={setShowRecordModal}
        amountDue={amountDue}
        onSubmit={onRecordPayment}
      />
    </>
  );
};
