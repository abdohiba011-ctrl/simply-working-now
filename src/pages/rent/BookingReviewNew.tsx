import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useBike } from "@/hooks/useBikes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format, parseISO } from "date-fns";
import { Loader2, Clock, ShieldCheck, AlertTriangle, MapPin } from "lucide-react";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { toast } from "sonner";

const HOLD_DURATION_MS = 5 * 60 * 1000;

export default function BookingReviewNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const bikeId = params.get("bikeId") || "";
  const pickup = params.get("pickup") || "";
  const ret = params.get("end") || "";
  const deliveryMethod = params.get("deliveryMethod") || "pickup";
  const deliveryLocation = params.get("location") || "";

  const { data: bike, isLoading } = useBike(bikeId);

  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [creatingHold, setCreatingHold] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedDeposit, setAgreedDeposit] = useState(false);
  const [agreedRules, setAgreedRules] = useState(false);

  const [now, setNow] = useState(Date.now());

  // Redirect to auth if not signed in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isAuthenticated, navigate]);

  // Pre-fill from profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setName(data.name || user.email?.split("@")[0] || "");
        setEmail(data.email || user.email || "");
        setPhone(data.phone || "");
      }
    };
    loadProfile();
  }, [user]);

  // Create the hold
  useEffect(() => {
    const create = async () => {
      if (!bikeId || !pickup || !ret || !user) return;
      setCreatingHold(true);
      setHoldError(null);
      const { data, error } = await supabase.rpc("create_bike_hold", {
        _bike_id: bikeId,
        _pickup: pickup,
        _return: ret,
      });
      setCreatingHold(false);
      if (error) {
        const msg = error.message;
        if (msg.includes("BIKE_ALREADY_BOOKED")) setHoldError("Sorry, this bike was just booked for these dates.");
        else if (msg.includes("BIKE_HELD_BY_OTHER")) setHoldError("Someone else is currently checking out this bike. Try again in 5 minutes.");
        else if (msg.includes("INVALID_DATES")) setHoldError("Invalid dates.");
        else setHoldError(msg);
        return;
      }
      const row = (data as any)?.[0];
      if (row) {
        setHoldId(row.hold_id);
        setHoldExpiresAt(new Date(row.expires_at));
      }
    };
    if (isAuthenticated) create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bikeId, pickup, ret, user?.id, isAuthenticated]);

  // Countdown tick
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const msLeft = holdExpiresAt ? holdExpiresAt.getTime() - now : 0;
  const expired = holdExpiresAt && msLeft <= 0;
  const mins = Math.max(0, Math.floor(msLeft / 60000));
  const secs = Math.max(0, Math.floor((msLeft % 60000) / 1000));

  const days = useMemo(() => {
    if (!pickup || !ret) return 0;
    return Math.max(1, differenceInDays(parseISO(ret), parseISO(pickup)));
  }, [pickup, ret]);

  const dailyPrice = Number(bike?.bike_type?.daily_price ?? 0);
  const rentalSubtotal = days * dailyPrice;
  const platformFee = 10;

  const allChecked = agreedTerms && agreedDeposit && agreedRules;
  const canPay = allChecked && !expired && !!holdId && name.trim() && email.trim() && phone.trim();

  const handleProceed = () => {
    if (!canPay || !holdId || !bike) return;
    const qs = new URLSearchParams({
      hold: holdId,
      bikeName: bike.bike_type?.name || "",
      name, email, phone,
      delivery: deliveryMethod,
      location: deliveryLocation,
    });
    navigate(`/rent/checkout?${qs.toString()}`);
  };

  if (isLoading || creatingHold) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (holdError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-12">
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-bold">Bike unavailable</h2>
              <p className="text-sm text-muted-foreground">{holdError}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Back</Button>
                <Button className="flex-1" onClick={() => navigate("/rent/casablanca")}>Browse other bikes</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!bike?.bike_type) return null;

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-12">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 lg:py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Review your booking</h1>
        <p className="mb-6 text-sm text-muted-foreground">Confirm details and pay the 10 MAD platform fee to secure your bike.</p>

        {/* Countdown banner */}
        {holdExpiresAt && (
          <div className={`mb-6 flex items-center gap-3 rounded-lg border p-3 text-sm ${
            expired ? "border-destructive/30 bg-destructive/10 text-destructive"
            : msLeft < 60_000 ? "border-orange-300 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200"
            : "border-primary/30 bg-primary/10 text-foreground"
          }`}>
            <Clock className="h-4 w-4 shrink-0" />
            {expired ? (
              <span>Your hold expired. <button className="underline" onClick={() => window.location.reload()}>Try again</button></span>
            ) : (
              <span>Bike held for you · <strong className="tabular-nums">{mins}:{String(secs).padStart(2, "0")}</strong> remaining</span>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Required agreements</h2>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/40">
                  <Checkbox checked={agreedTerms} onCheckedChange={(v) => setAgreedTerms(!!v)} className="mt-0.5" />
                  <span>I agree to Motonita's <a href="/terms" target="_blank" className="text-primary underline">Terms & Conditions</a> and <a href="/privacy-policy" target="_blank" className="text-primary underline">Privacy Policy</a>.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/40">
                  <Checkbox checked={agreedDeposit} onCheckedChange={(v) => setAgreedDeposit(!!v)} className="mt-0.5" />
                  <span>I understand the agency may require a refundable security deposit of <strong>{Number(bike.bike_type.deposit_amount ?? 0)} MAD</strong> at pickup, held off-platform.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/40">
                  <Checkbox checked={agreedRules} onCheckedChange={(v) => setAgreedRules(!!v)} className="mt-0.5" />
                  <span>I have a valid driving license{bike.bike_type.license_required && bike.bike_type.license_required !== "none" ? ` (${bike.bike_type.license_required})` : ""} and meet the minimum age of {bike.bike_type.min_age ?? 18}.</span>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex gap-3">
                  <img
                    src={getBikeImageUrl(bike.bike_type.main_image_url)}
                    alt={bike.bike_type.name}
                    className="h-20 w-20 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight">{bike.bike_type.name}</h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{bike.location}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup</span><span>{format(parseISO(pickup), "dd MMM yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Return</span><span>{format(parseISO(ret), "dd MMM yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{days} day{days > 1 ? "s" : ""}</span></div>
                </div>

                <div className="space-y-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Rental ({days} × {dailyPrice} MAD)</span><span>{rentalSubtotal} MAD</span></div>
                  <div className="text-[11px] text-muted-foreground">Paid directly to the agency at pickup</div>
                  <div className="my-2 border-t" />
                  <div className="flex items-baseline justify-between font-semibold"><span>Platform fee (now)</span><span className="text-base">{platformFee} MAD</span></div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canPay}
                  onClick={handleProceed}
                >
                  Pay {platformFee} MAD & secure bike
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3 w-3" /> Refundable if agency declines
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Total now</div>
            <div className="text-lg font-bold">{platformFee} MAD</div>
          </div>
          <Button size="lg" disabled={!canPay} onClick={handleProceed}>Pay & secure</Button>
        </div>
      </div>
    </div>
  );
}
