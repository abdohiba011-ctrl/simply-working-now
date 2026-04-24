import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

export default function MockCheckout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const holdId = params.get("hold");
  const bikeName = params.get("bikeName") || "Motorbike";
  const customerName = params.get("name") || "";
  const customerEmail = params.get("email") || "";
  const customerPhone = params.get("phone") || "";
  const deliveryMethod = params.get("delivery") || "pickup";
  const pickupLocation = params.get("location") || "";

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holdId) navigate("/listings");
  }, [holdId, navigate]);

  const handleMockPay = async () => {
    if (!holdId) return;
    setProcessing(true);
    setError(null);

    // Simulate YouCan Pay sandbox latency
    await new Promise((r) => setTimeout(r, 1400));

    const { data: bookingId, error: rpcErr } = await supabase.rpc("promote_hold_to_booking", {
      _hold_id: holdId,
      _customer_name: customerName,
      _customer_email: customerEmail,
      _customer_phone: customerPhone,
      _delivery_method: deliveryMethod,
      _pickup_location: pickupLocation,
    });

    if (rpcErr || !bookingId) {
      setProcessing(false);
      const msg = rpcErr?.message || "Payment failed";
      if (msg.includes("HOLD_EXPIRED")) {
        setError("Your 5-minute hold expired. Please start again.");
      } else if (msg.includes("AUTH_REQUIRED")) {
        setError("Please sign in to complete your booking.");
      } else {
        setError(msg);
      }
      return;
    }

    // Record the mock payment for traceability
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("youcanpay_payments").insert({
      user_id: user?.id,
      amount: 10,
      currency: "MAD",
      status: "paid",
      purpose: "booking_fee",
      related_booking_id: bookingId as string,
      customer_email: customerEmail,
      customer_name: customerName,
      paid_at: new Date().toISOString(),
      transaction_id: `MOCK-${Date.now()}`,
    });

    toast.success("Payment successful! Your booking is confirmed.");
    navigate(`/rent/booking/${bookingId}/success`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mt-3 text-xl font-bold">YouCan Pay (Sandbox)</h1>
              <p className="mt-1 text-xs text-muted-foreground">Mock payment — no real charge</p>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bike</span><span className="font-medium">{bikeName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Booking fee</span><span className="font-medium">10.00 MAD</span></div>
              <div className="my-2 border-t" />
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>10.00 MAD</span></div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>{error}</p>
                  <Button size="sm" variant="outline" onClick={() => navigate(-2)}>Try again</Button>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleMockPay}
              disabled={processing || !!error}
            >
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing payment…</>
              ) : (
                "Pay 10 MAD"
              )}
            </Button>

            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Secure by YouCan Pay · Test mode
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
