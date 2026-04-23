import { useMemo, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agencyTransactions, savedBankAccounts } from "@/data/agencyFinanceMock";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PRESETS = [100, 500, 1000, 2500, 5000];
const BONUS: Record<number, number> = { 1000: 50, 2500: 200, 5000: 500 };

const Wallet = () => {
  const balance = useAgencyStore((s) => s.walletBalance);
  const setBalance = useAgencyStore((s) => s.setWalletBalance);

  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState("youcanpay");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [withdrawAccount, setWithdrawAccount] = useState(savedBankAccounts[0].id);

  const bonus = BONUS[amount] ?? 0;
  const credited = amount + bonus;

  const handleTopup = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setBalance(balance + credited);
    setProcessing(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTopupOpen(false);
      toast.success(`Wallet topped up with ${credited} MAD${bonus ? ` (incl. ${bonus} MAD bonus)` : ""}`);
    }, 1200);
  };

  const handleWithdraw = () => {
    if (withdrawAmount < 100 || withdrawAmount > balance) {
      toast.error("Invalid amount");
      return;
    }
    setBalance(balance - withdrawAmount);
    setWithdrawOpen(false);
    toast.success("Withdrawal processed within 3 business days.");
  };

  const filteredTx = useMemo(
    () => filterType === "all" ? agencyTransactions : agencyTransactions.filter((t) => t.type === filterType),
    [filterType]
  );

  const lowBalance = balance < 100;
  const zeroBalance = balance <= 0;

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your Motonita wallet — top up, withdraw, and review transactions.</p>
        </div>

        {(lowBalance || zeroBalance) && (
          <div className={cn("flex items-start gap-3 rounded-xl border p-4", zeroBalance ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5")}>
            <AlertTriangle className={cn("h-5 w-5 shrink-0", zeroBalance ? "text-destructive" : "text-warning")} />
            <div className="flex-1 text-sm">
              <p className="font-medium">{zeroBalance ? "Wallet empty — pending bookings paused" : "Low balance"}</p>
              <p className="text-muted-foreground">{zeroBalance ? "We can't deduct booking fees. Top up to resume confirmations." : "You may miss confirmed bookings. Top up now."}</p>
            </div>
            <Button size="sm" onClick={() => setTopupOpen(true)}>Top up</Button>
          </div>
        )}

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Available balance</p>
          <div className="mt-2 text-5xl font-bold tracking-tight text-foreground">
            {balance.toLocaleString()} <span className="text-2xl text-muted-foreground">MAD</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Available to spend on booking confirmations.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setTopupOpen(true)} className="gap-2">
              <ArrowDownToLine className="h-4 w-4" /> Top up wallet
            </Button>
            <Button size="default" variant="outline" onClick={() => setWithdrawOpen(true)} className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="font-semibold">Transaction history</h2>
              <p className="text-xs text-muted-foreground">All wallet activity</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="topup">Top-ups</SelectItem>
                  <SelectItem value="booking_fee">Booking fees</SelectItem>
                  <SelectItem value="refund">Refunds</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="bonus">Bonuses</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-2"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(tx.date), "dd MMM, HH:mm")}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{tx.type.replace("_", " ")}</span></td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className={cn("px-4 py-3 text-right font-medium tabular-nums", tx.amount >= 0 ? "text-success" : "text-destructive")}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount} MAD
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{tx.runningBalance} MAD</td>
                    <td className="px-4 py-3">
                      <Badge variant={tx.status === "completed" ? "secondary" : tx.status === "pending" ? "outline" : "destructive"} className="capitalize">{tx.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Download className="h-3 w-3" /> PDF</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Top-up modal */}
      <Dialog open={topupOpen} onOpenChange={(o) => { if (!processing) setTopupOpen(o); }}>
        <DialogContent className="max-w-md">
          {success ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold">Payment successful</h3>
              <p className="mt-1 text-sm text-muted-foreground">{credited} MAD credited to your wallet.</p>
            </div>
          ) : processing ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Processing payment via YouCan Pay…</p>
              <p className="mt-1 text-xs text-muted-foreground">Don't close this window.</p>
            </div>
          ) : (
            <>
              <DialogHeader><DialogTitle>Top up wallet</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-xs">Choose amount (MAD)</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => setAmount(p)} className={cn("rounded-full border px-4 py-1.5 text-sm transition", amount === p ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted")}>
                        {p}{BONUS[p] ? <span className="ml-1 text-[10px] text-success">+{BONUS[p]}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="custom" className="text-xs">Custom amount</Label>
                  <Input id="custom" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={50} />
                </div>
                <div>
                  <Label className="text-xs">Payment method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youcanpay">Moroccan card (YouCan Pay)</SelectItem>
                      <SelectItem value="intl">International card</SelectItem>
                      <SelectItem value="cashplus">Cash Plus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">You'll pay</span><span className="font-medium">{amount} MAD</span></div>
                  {bonus > 0 && <div className="flex justify-between text-success"><span>Bonus</span><span>+{bonus} MAD</span></div>}
                  <div className="mt-2 flex justify-between border-t border-border pt-2"><span className="font-medium">Credits received</span><span className="font-bold">{credited} MAD</span></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setTopupOpen(false)}>Cancel</Button>
                <Button onClick={handleTopup}>Pay {amount} MAD</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Withdraw funds</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Available: <span className="font-semibold text-foreground">{balance} MAD</span> · Min 100 MAD</p>
            <div>
              <Label className="text-xs">Destination account</Label>
              <Select value={withdrawAccount} onValueChange={setWithdrawAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {savedBankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label} — ****{a.last4}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount (MAD)</Label>
              <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} min={100} max={balance} />
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">Withdrawals are processed within 3 business days.</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdraw}>Confirm withdrawal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

export default Wallet;
