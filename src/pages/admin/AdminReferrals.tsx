import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";

type Balance = {
  user_id: string;
  total_referrals: number;
  signed_up_count: number;
  booked_count: number;
  approved_count: number;
  rejected_count: number;
  paid_count: number;
  pending_mad: number;
  approved_unpaid_mad: number;
  paid_mad: number;
};

type Profile = { user_id: string; name: string | null; email: string | null; phone: string | null };
type Code = { user_id: string; code: string };
type Payout = {
  id: string; user_id: string; amount_mad: number; status: string;
  payout_method: string | null; payout_reference: string | null;
  week_start: string; week_end: string; notes: string | null;
  created_at: string; paid_at: string | null;
};

const PAYOUT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash_plus", label: "Cash Plus" },
  { value: "manual_cash", label: "Manual cash" },
  { value: "other", label: "Other" },
];

export default function AdminReferrals() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [paidDialog, setPaidDialog] = useState<Payout | null>(null);
  const [paidMethod, setPaidMethod] = useState("bank_transfer");
  const [paidRef, setPaidRef] = useState("");
  const [paidNotes, setPaidNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: bals }, { data: pays }] = await Promise.all([
      supabase.from("referral_balances").select("*"),
      supabase.from("referral_payouts").select("*").order("created_at", { ascending: false }),
    ]);
    const balData = (bals as Balance[]) || [];
    const payData = (pays as Payout[]) || [];
    setBalances(balData);
    setPayouts(payData);

    const userIds = Array.from(new Set([
      ...balData.map((b) => b.user_id),
      ...payData.map((p) => p.user_id),
    ]));
    if (userIds.length > 0) {
      const [{ data: profs }, { data: codeRows }] = await Promise.all([
        supabase.from("profiles").select("user_id,name,email,phone").in("user_id", userIds),
        supabase.from("referral_codes").select("user_id,code").in("user_id", userIds),
      ]);
      const pMap: Record<string, Profile> = {};
      (profs as Profile[] | null)?.forEach((p) => { pMap[p.user_id] = p; });
      setProfiles(pMap);
      const cMap: Record<string, string> = {};
      (codeRows as Code[] | null)?.forEach((c) => { cMap[c.user_id] = c.code; });
      setCodes(cMap);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const overview = useMemo(() => {
    const sum = (k: keyof Balance) => balances.reduce((a, b) => a + Number(b[k] || 0), 0);
    return {
      total: sum("total_referrals"),
      signedUp: sum("signed_up_count"),
      booked: sum("booked_count"),
      approved: sum("approved_count"),
      paid: sum("paid_count"),
      eligibleUsers: balances.filter((b) => Number(b.approved_unpaid_mad) >= 50).length,
    };
  }, [balances]);

  const handleCreatePayout = async (userId: string) => {
    setBusy(userId);
    const { error } = await supabase.rpc("admin_create_referral_payout", { _user_id: userId });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout created");
    load();
  };

  const handleMarkPaid = async () => {
    if (!paidDialog) return;
    if (!paidRef.trim() && !paidNotes.trim()) {
      toast.error("Reference or note is required");
      return;
    }
    setBusy(paidDialog.id);
    const { error } = await supabase.rpc("admin_mark_referral_payout_paid", {
      _payout_id: paidDialog.id,
      _payout_method: paidMethod,
      _payout_reference: paidRef.trim() || null,
      _notes: paidNotes.trim() || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout marked as paid");
    setPaidDialog(null); setPaidRef(""); setPaidNotes(""); setPaidMethod("bank_transfer");
    load();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this pending payout?")) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_cancel_referral_payout", { _payout_id: id, _reason: "Cancelled by admin" });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout cancelled");
    load();
  };

  const eligibleUsers = balances.filter((b) => Number(b.approved_unpaid_mad) >= 50);
  const pendingPayouts = payouts.filter((p) => p.status === "pending");

  const userLabel = (uid: string) => {
    const p = profiles[uid];
    return p?.name || p?.email || uid.slice(0, 8);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading referrals…
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/panel"><ChevronLeft className="h-4 w-4 mr-1" /> Admin</Link>
        </Button>
        <h1 className="text-2xl font-bold">Referrals</h1>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: overview.total },
          { label: "Signed up", value: overview.signedUp },
          { label: "Booked", value: overview.booked },
          { label: "Approved", value: overview.approved },
          { label: "Paid", value: overview.paid },
          { label: "Eligible (≥50)", value: overview.eligibleUsers },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payout queue */}
      <Card>
        <CardHeader><CardTitle>Payout queue (eligible ≥ 50 MAD)</CardTitle></CardHeader>
        <CardContent>
          {eligibleUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users currently eligible.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Approved unpaid (MAD)</TableHead>
                  <TableHead>Approved count</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligibleUsers.map((b) => {
                  const hasPending = pendingPayouts.some((p) => p.user_id === b.user_id);
                  return (
                    <TableRow key={b.user_id}>
                      <TableCell>{userLabel(b.user_id)}</TableCell>
                      <TableCell className="font-semibold">{Number(b.approved_unpaid_mad)}</TableCell>
                      <TableCell>{b.approved_count}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={hasPending || busy === b.user_id}
                          onClick={() => handleCreatePayout(b.user_id)}
                        >
                          {hasPending ? "Pending exists" : "Create payout"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader><CardTitle>Payouts</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Method / Ref</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{userLabel(p.user_id)}</TableCell>
                    <TableCell>{Number(p.amount_mad)} MAD</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "secondary" : "outline"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.week_start} → {p.week_end}</TableCell>
                    <TableCell className="text-xs">
                      {p.payout_method ? `${p.payout_method}${p.payout_reference ? ` · ${p.payout_reference}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      {p.status === "pending" && (
                        <>
                          <Button size="sm" disabled={busy === p.id}
                            onClick={() => { setPaidDialog(p); setPaidMethod("bank_transfer"); setPaidRef(""); setPaidNotes(""); }}>
                            Mark paid
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => handleCancel(p.id)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Referrers */}
      <Card>
        <CardHeader><CardTitle>Referrers</CardTitle></CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Approved unpaid (MAD)</TableHead>
                  <TableHead>Paid (MAD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.user_id}>
                    <TableCell>
                      <div className="font-medium">{profiles[b.user_id]?.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {profiles[b.user_id]?.email}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{codes[b.user_id] || "—"}</TableCell>
                    <TableCell>{b.signed_up_count}</TableCell>
                    <TableCell>{b.booked_count}</TableCell>
                    <TableCell>{b.approved_count}</TableCell>
                    <TableCell className="font-semibold">{Number(b.approved_unpaid_mad)}</TableCell>
                    <TableCell>{Number(b.paid_mad)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mark paid dialog */}
      <Dialog open={!!paidDialog} onOpenChange={(o) => !o && setPaidDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark payout paid — {paidDialog ? Number(paidDialog.amount_mad) : 0} MAD
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Method</Label>
              <Select value={paidMethod} onValueChange={setPaidMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={paidRef} onChange={(e) => setPaidRef(e.target.value)} placeholder="Bank tx id, Cash Plus ref…" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={paidNotes} onChange={(e) => setPaidNotes(e.target.value)} placeholder="Optional note" />
            </div>
            <p className="text-xs text-muted-foreground">Reference or note is required.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialog(null)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={busy === paidDialog?.id}>Confirm paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
