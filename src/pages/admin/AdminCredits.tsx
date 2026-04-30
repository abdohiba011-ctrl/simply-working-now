import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Gift, RefreshCw, Search } from "lucide-react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Credit {
  id: string;
  user_id: string;
  amount_mad: number;
  reason: string | null;
  source_booking_id: string | null;
  used_on_booking_id: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

const safe = (s: string | null) => {
  if (!s) return "—";
  try { return format(parseISO(s), "dd MMM yyyy"); } catch { return s; }
};

const AdminCredits = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [issueOpen, setIssueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ user_id: "", amount: "50", reason: "" });

  const fetchCredits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("motonita_credits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setCredits((data ?? []) as Credit[]);
  };

  useEffect(() => { fetchCredits(); }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return credits.filter((c) => {
      if (filter === "used" && !c.used_at) return false;
      if (filter === "unused" && (c.used_at || new Date(c.expires_at).getTime() < now)) return false;
      if (filter === "expired" && (c.used_at || new Date(c.expires_at).getTime() >= now)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.user_id.toLowerCase().includes(q) && !(c.reason || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [credits, filter, search]);

  const issue = async () => {
    if (!form.user_id || !form.amount || !form.reason) {
      toast.error("All fields required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("issue_motonita_credit", {
      _user_id: form.user_id,
      _amount_mad: Number(form.amount),
      _reason: form.reason,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Credit issued");
    setIssueOpen(false);
    setForm({ user_id: "", amount: "50", reason: "" });
    fetchCredits();
  };

  const statusBadge = (c: Credit) => {
    if (c.used_at) return <Badge variant="secondary">Used</Badge>;
    if (new Date(c.expires_at).getTime() < Date.now()) return <Badge variant="destructive">Expired</Badge>;
    return <Badge>Active</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="h-6 w-6" /> Motonita Credits
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track issued credits, refunds, and goodwill grants.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCredits} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Issue credit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Issue Motonita Credit</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Renter user_id (UUID)</Label>
                    <Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="00000000-…" />
                  </div>
                  <div>
                    <Label>Amount (MAD)</Label>
                    <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Goodwill — pickup miscommunication" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={busy}>Cancel</Button>
                  <Button onClick={issue} disabled={busy}>Issue</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>All credits</CardTitle>
                <CardDescription>{filtered.length} of {credits.length} shown</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unused">Active (unused)</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by user_id or reason" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No credits</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issued</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-muted-foreground">{safe(c.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{c.user_id.slice(0, 8)}…</TableCell>
                        <TableCell className="font-medium">{c.amount_mad} MAD</TableCell>
                        <TableCell className="max-w-xs truncate">{c.reason || "—"}</TableCell>
                        <TableCell className="text-xs">{safe(c.expires_at)}</TableCell>
                        <TableCell>{statusBadge(c)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCredits;
