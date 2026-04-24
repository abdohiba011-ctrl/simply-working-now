import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyWallet } from "@/hooks/useAgencyData";
import { openHostedPayment, preOpenPaymentWindow } from "@/lib/openHostedPayment";

const PRESETS = [100, 500, 1000, 2500, 5000];

const Wallet = () => {
  const { wallet, loading, refresh } = useAgencyWallet();
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [iban, setIban] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [processing, setProcessing] = useState(false);

  const balance = Number(wallet?.balance || 0);

  const handleTopup = async () => {
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    setProcessing(true);
    const preOpened = preOpenPaymentWindow();
    try {
      const { data, error } = await supabase.functions.invoke("youcanpay-create-token", {
        body: { purpose: "wallet_topup", amount, currency: "MAD" },
      });
      if (error) throw error;
      if (data?.payment_url) {
        const result = openHostedPayment(data.payment_url, preOpened);
        if (!result.ok) {
          toast.error("Your browser blocked the payment window. Please allow popups.");
        } else if (result.method === "new-tab" || result.method === "pre-opened") {
          toast.success("Payment opened in a new tab.");
        }
        return;
      }
      if (preOpened && !preOpened.closed) preOpened.close();
      toast.error("Could not initialize payment");
    } catch (e: any) {
      if (preOpened && !preOpened.closed) preOpened.close();
      toast.error(e.message || "Failed to start top up");
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount <= 0) return toast.error("Enter a valid amount");
    if (withdrawAmount > balance) return toast.error("Amount exceeds balance");
    if (!iban.trim()) return toast.error("Enter your IBAN");
    setProcessing(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("agency_withdrawal_requests").insert({
        user_id: u.user.id,
        amount: withdrawAmount,
        bank_iban: iban,
        bank_account_label: accountLabel || null,
      });
      if (error) throw error;
      toast.success("Withdrawal request submitted");
      setWithdrawOpen(false);
      setIban("");
      setAccountLabel("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current balance</p>
          <p className="mt-2 text-5xl font-bold tracking-tight">
            {loading ? "—" : balance.toLocaleString()}
            <span className="ml-2 text-2xl text-muted-foreground">MAD</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setTopupOpen(true)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Top up
            </Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)} disabled={balance <= 0}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Request withdrawal
            </Button>
          </div>
          {balance < 100 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">
                Low balance. Each confirmed booking deducts a service fee — top up to keep accepting reservations.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up wallet</DialogTitle>
            <DialogDescription>You will be redirected to YouCanPay to complete the payment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Amount (MAD)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p} type="button" size="sm" variant="outline" onClick={() => setAmount(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={handleTopup} disabled={processing}>
              {processing ? "Redirecting…" : `Pay ${amount} MAD`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request withdrawal</DialogTitle>
            <DialogDescription>Funds will be transferred to your bank account after admin review.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Amount (MAD)</Label>
              <Input type="number" min={1} max={balance} value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input placeholder="MA64 …" value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
            <div>
              <Label>Account label (optional)</Label>
              <Input placeholder="My business account" value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={processing}>
              {processing ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

export default Wallet;
