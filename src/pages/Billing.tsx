import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, CreditCard, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRenterWallet } from "@/hooks/useRenterWallet";
import { supabase } from "@/integrations/supabase/client";
import { openHostedPayment, preOpenPaymentWindow } from "@/lib/openHostedPayment";

const PRESETS = [50, 100, 200, 500];

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { balance, currency, isLoading, transactions, refetch, refetchTransactions } = useRenterWallet();

  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState<string>("100");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "topup" | "fee" | "refund">("all");
  const [search, setSearch] = useState("");

  // Profile / billing info
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string; address: string }>({
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, email, phone, address")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || "",
        });
      }
    })();
  }, [user]);

  // Handle return from YouCan Pay
  useEffect(() => {
    const yc = params.get("topup");
    if (yc === "success") {
      toast.success("Top up successful — credits added to your account");
      refetch();
      refetchTransactions();
      params.delete("topup");
      setParams(params, { replace: true });
    } else if (yc === "error") {
      toast.error("Top up could not be completed. Please try again.");
      params.delete("topup");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTx = useMemo(() => {
    let list = transactions;
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          (t.type || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [transactions, filter, search]);

  const submitTopup = async () => {
    const num = Number(amount);
    if (!num || num < 10) {
      toast.error("Minimum top up is 10 MAD");
      return;
    }
    setSubmitting(true);
    const preOpened = preOpenPaymentWindow();
    try {
      const { data, error } = await supabase.functions.invoke("youcanpay-create-token", {
        body: {
          purpose: "renter_topup",
          amount: num,
          currency: "MAD",
          customer_email: profile.email || user?.email,
          customer_name: profile.name,
          success_path: "/billing?topup=success",
          error_path: "/billing?topup=error",
        },
      });
      if (error || !data?.payment_url) {
        if (preOpened) preOpened.close();
        throw new Error(error?.message || "Failed to start payment");
      }
      const result = openHostedPayment(data.payment_url, preOpened);
      if (!result.ok) {
        toast.error("Could not open the payment page. Please disable popup blockers and try again.");
      } else {
        setTopupOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Top up failed");
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
      })
      .eq("id", user.id);
    setProfileSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Billing info saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Credits</h1>
            <p className="text-sm text-muted-foreground">Manage your credits, top up your account, and view transactions.</p>
          </div>
          <Button onClick={() => setTopupOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Top up credits
          </Button>
        </div>

        <Tabs defaultValue="credits" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="methods">Payment methods</TabsTrigger>
            <TabsTrigger value="info">Billing info</TabsTrigger>
          </TabsList>

          {/* Credits */}
          <TabsContent value="credits" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" /> Current balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-12 w-40" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{balance.toFixed(2)}</span>
                    <span className="text-lg text-muted-foreground">{currency}</span>
                  </div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  Use credits to pay booking fees and other platform charges.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAmount(String(p));
                        setTopupOpen(true);
                      }}
                    >
                      + {p} MAD
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="text-base">Transactions</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "topup", "fee", "refund"] as const).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={filter === f ? "default" : "outline"}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "All" : f === "topup" ? "Top-ups" : f === "fee" ? "Fees" : "Refunds"}
                    </Button>
                  ))}
                  <div className="relative ml-auto w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search…"
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTx.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No transactions yet</div>
                ) : (
                  <div className="divide-y">
                    {filteredTx.map((t) => {
                      const positive = Number(t.amount) >= 0;
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                positive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{t.type}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {t.status}
                                </Badge>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {t.description || t.reference || "—"} · {new Date(t.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${positive ? "text-primary" : ""}`}>
                              {positive ? "+" : ""}
                              {Number(t.amount).toFixed(2)} {t.currency}
                            </div>
                            {t.balance_after != null && (
                              <div className="text-xs text-muted-foreground">
                                Bal: {Number(t.balance_after).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment methods */}
          <TabsContent value="methods" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Payment methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Top-ups are processed via <strong>YouCan Pay</strong> using your bank card or <strong>Cash Plus</strong>.
                  No card details are stored on Motonita — every payment is handled securely on YouCan Pay's hosted page.
                </p>
                <Button onClick={() => setTopupOpen(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Top up now
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing info */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4" /> Billing information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Billing address</Label>
                  <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={saveProfile} disabled={profileSaving}>
                    {profileSaving ? "Saving…" : "Save billing info"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up your credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={Number(amount) === p ? "default" : "outline"}
                  onClick={() => setAmount(String(p))}
                >
                  {p} MAD
                </Button>
              ))}
            </div>
            <div>
              <Label>Amount (MAD)</Label>
              <Input
                type="number"
                min={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
              />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 10 MAD. Paid via YouCan Pay (card or Cash Plus).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTopupOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitTopup} disabled={submitting}>
              {submitting ? "Redirecting…" : "Continue to payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
