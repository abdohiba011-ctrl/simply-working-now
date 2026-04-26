import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Receipt,
  Download,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRenterWallet } from "@/hooks/useRenterWallet";
import { supabase } from "@/integrations/supabase/client";
import { openHostedPayment, preOpenPaymentWindow } from "@/lib/openHostedPayment";
import { BalanceChart } from "@/components/billing/BalanceChart";
import { TransactionFilters } from "@/components/billing/TransactionFilters";
import { TopupConfirmDialog } from "@/components/billing/TopupConfirmDialog";
import {
  applyFilters,
  readFiltersFromParams,
  writeFiltersToParams,
  type BillingFilterState,
} from "@/lib/billingFilters";

const PRESETS = [50, 100, 200, 500];

export default function Billing() {
  const { user, userRoles, isLoading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const { balance, currency, isLoading, transactions, refetch, refetchTransactions } = useRenterWallet();

  // A "renter" in this app = any authenticated user that is not an agency/business or admin.
  // The user_roles enum is: admin | business | user. There is no explicit "renter" role.
  const isRenter = !userRoles?.some((r) => r === "business" || r === "admin");

  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState<string>("100");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);

  // ---- URL-driven tab + filters ----
  const activeTab = params.get("tab") ?? "credits";
  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(params);
    if (tab === "credits") next.delete("tab");
    else next.set("tab", tab);
    setParams(next, { replace: true });
  };

  const filters = useMemo(() => readFiltersFromParams(params), [params]);
  const setFilters = (next: BillingFilterState) => {
    setParams(writeFiltersToParams(params, next), { replace: true });
  };

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
      (async () => {
        await Promise.all([refetch(), refetchTransactions()]);
        // Surface the most recent completed top-up amount
        const { data } = await supabase
          .from("renter_wallet_transactions")
          .select("amount, balance_after, currency")
          .eq("user_id", user?.id || "")
          .eq("type", "topup")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          toast.success(
            `Top-up successful — +${Number(data.amount).toFixed(2)} ${data.currency} added · New balance ${Number(
              data.balance_after,
            ).toFixed(2)} ${data.currency}`,
            { duration: 6000 },
          );
        } else {
          toast.success("Top up successful — credits added to your account");
        }
      })();
      const next = new URLSearchParams(params);
      next.delete("topup");
      setParams(next, { replace: true });
    } else if (yc === "error") {
      toast.error("Top up could not be completed. Please try again.");
      const next = new URLSearchParams(params);
      next.delete("topup");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filteredTx = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);

  const submitTopup = async () => {
    if (!isRenter) {
      toast.error("Only renters can top up credits");
      return;
    }
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
        // Popup blocked (often the case inside the Lovable preview iframe).
        // Surface a clickable link so the user can open the payment page manually.
        setPendingPaymentUrl(data.payment_url);
        toast.message("Click 'Open payment page' to continue", {
          description: "Your browser blocked the automatic redirect.",
        });
      } else {
        setPendingPaymentUrl(null);
        setTopupOpen(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Top up failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async (txId: string) => {
    setDownloadingId(txId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again");

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-receipt`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction_id: txId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed (${res.status})`);
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `motonita-receipt-${txId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not download receipt";
      toast.error(msg);
    } finally {
      setDownloadingId(null);
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

  // Non-renter gate — only show after auth has finished loading
  if (!authLoading && user && !isRenter) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Credits are for renters</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Billing & credits are part of the renter experience. Sign up as a renter to top up
            credits and pay platform booking fees.
          </p>
          <Button className="mt-6" asChild>
            <a href="/auth/signup">Sign up as renter</a>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Credits</h1>
            <p className="text-sm text-muted-foreground">
              Manage your credits, top up your account, and view transactions.
            </p>
          </div>
          <Button onClick={() => setTopupOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Top up credits
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <CardContent className="space-y-6">
                {isLoading ? (
                  <Skeleton className="h-12 w-40" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{balance.toFixed(2)}</span>
                    <span className="text-lg text-muted-foreground">{currency}</span>
                  </div>
                )}

                <BalanceChart
                  transactions={transactions}
                  currentBalance={balance}
                  currency={currency}
                />

                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Use credits to pay booking fees and other platform charges.
                  </p>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="text-base">Transactions</CardTitle>
                <TransactionFilters filters={filters} onChange={setFilters} />
              </CardHeader>
              <CardContent>
                {filteredTx.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {transactions.length === 0
                      ? "No transactions yet"
                      : "No transactions match your filters"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTx.map((t) => {
                      const positive = Number(t.amount) >= 0;
                      const canDownload = t.status === "completed";
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                positive
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {positive ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{t.type}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {t.status}
                                </Badge>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {t.description || t.reference || "—"} ·{" "}
                                {new Date(t.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
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
                            {canDownload && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                disabled={downloadingId === t.id}
                                onClick={() => downloadReceipt(t.id)}
                                title="Download receipt"
                                aria-label="Download receipt"
                              >
                                {downloadingId === t.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
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
                  Top-ups are processed via <strong>YouCan Pay</strong> using your bank card or{" "}
                  <strong>Cash Plus</strong>. No card details are stored on Motonita — every payment
                  is handled securely on YouCan Pay's hosted page, so there are no saved cards to
                  manage here.
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
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Billing address</Label>
                  <Input
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
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

      <TopupConfirmDialog
        open={topupOpen}
        onOpenChange={(o) => {
          setTopupOpen(o);
          if (!o) setPendingPaymentUrl(null);
        }}
        amount={amount}
        onAmountChange={setAmount}
        currentBalance={balance}
        currency={currency}
        submitting={submitting}
        onConfirm={submitTopup}
        pendingPaymentUrl={pendingPaymentUrl}
      />

      <Footer />
    </div>
  );
}
