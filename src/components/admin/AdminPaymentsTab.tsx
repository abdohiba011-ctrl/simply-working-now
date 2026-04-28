import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Search, ExternalLink, CreditCard, AlertTriangle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { StuckPaymentsCard } from "./StuckPaymentsCard";
import { toast } from "sonner";

interface YouCanPayment {
  id: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_id: string | null;
  customer_email: string | null;
  booking_id?: string | null;
}

interface BookingPaymentRow {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  method: string | null;
  payment_method: string | null;
  payment_type: string | null;
  status: string;
  provider: string | null;
  recorded_by_name: string | null;
  created_at: string;
  notes: string | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: "bg-success/10 text-success border-success/20",
    completed: "bg-success/10 text-success border-success/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    refunded: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status] || ""}`}>
      {status}
    </Badge>
  );
};

export const AdminPaymentsTab = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"stuck" | "all" | "manual">("stuck");

  // All YouCan payments
  const [ycPayments, setYcPayments] = useState<YouCanPayment[]>([]);
  const [ycLoading, setYcLoading] = useState(false);
  const [ycStatus, setYcStatus] = useState<string>("all");
  const [ycPurpose, setYcPurpose] = useState<string>("all");
  const [ycSearch, setYcSearch] = useState("");

  // Booking payments
  const [bpRows, setBpRows] = useState<BookingPaymentRow[]>([]);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpMethod, setBpMethod] = useState<string>("all");
  const [bpStatus, setBpStatus] = useState<string>("all");

  const loadYc = useCallback(async () => {
    setYcLoading(true);
    let q = supabase
      .from("youcanpay_payments")
      .select("id,purpose,amount,currency,status,created_at,user_id,customer_email,booking_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (ycStatus !== "all") q = q.eq("status", ycStatus);
    if (ycPurpose !== "all") q = q.eq("purpose", ycPurpose);
    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load payments");
    } else {
      setYcPayments((data as YouCanPayment[]) || []);
    }
    setYcLoading(false);
  }, [ycStatus, ycPurpose]);

  const loadBp = useCallback(async () => {
    setBpLoading(true);
    let q = supabase
      .from("booking_payments")
      .select("id,booking_id,amount,currency,method,payment_method,payment_type,status,provider,recorded_by_name,created_at,notes")
      .order("created_at", { ascending: false })
      .limit(200);
    if (bpStatus !== "all") q = q.eq("status", bpStatus);
    if (bpMethod !== "all") q = q.or(`method.eq.${bpMethod},payment_method.eq.${bpMethod}`);
    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load booking payments");
    } else {
      setBpRows((data as BookingPaymentRow[]) || []);
    }
    setBpLoading(false);
  }, [bpStatus, bpMethod]);

  useEffect(() => {
    if (activeView === "all") loadYc();
    if (activeView === "manual") loadBp();
  }, [activeView, loadYc, loadBp]);

  const filteredYc = ycPayments.filter((p) => {
    if (!ycSearch) return true;
    const s = ycSearch.toLowerCase();
    return (
      p.id.toLowerCase().includes(s) ||
      (p.customer_email || "").toLowerCase().includes(s) ||
      (p.booking_id || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList>
          <TabsTrigger value="stuck" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Stuck
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <CreditCard className="h-4 w-4" />
            All payments
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Wallet className="h-4 w-4" />
            Booking payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stuck" className="mt-4">
          <StuckPaymentsCard />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>All YouCan Pay payments</CardTitle>
                  <CardDescription>
                    Online payments collected through YouCan Pay (cards, Cash Plus).
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadYc} disabled={ycLoading}>
                  <RefreshCw className={`h-4 w-4 ${ycLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search id, email, booking…"
                    value={ycSearch}
                    onChange={(e) => setYcSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={ycStatus} onValueChange={setYcStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ycPurpose} onValueChange={setYcPurpose}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All purposes</SelectItem>
                    <SelectItem value="booking_fee">Booking fee</SelectItem>
                    <SelectItem value="wallet_topup">Wallet top-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {ycLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
                </div>
              ) : filteredYc.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">No payments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Booking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredYc.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(p.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {p.amount} {p.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {p.purpose.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs truncate max-w-[200px]">
                            {p.customer_email || p.user_id || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.booking_id ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/bookings/${p.booking_id}`)}
                              >
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Booking payments</CardTitle>
                  <CardDescription>
                    Manual payments recorded against bookings (cash, transfer, refunds, penalties).
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadBp} disabled={bpLoading}>
                  <RefreshCw className={`h-4 w-4 ${bpLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Select value={bpStatus} onValueChange={setBpStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bpMethod} onValueChange={setBpMethod}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {bpLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
                </div>
              ) : bpRows.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">No payments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recorded by</TableHead>
                        <TableHead className="text-right">Booking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bpRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {r.amount} {r.currency}
                          </TableCell>
                          <TableCell className="capitalize text-xs">
                            {r.method || r.payment_method || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {r.payment_type || "payment"}
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs truncate max-w-[150px]">
                            {r.recorded_by_name || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/bookings/${r.booking_id}`)}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
