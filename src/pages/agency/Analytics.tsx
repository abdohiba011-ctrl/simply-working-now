import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { agencyBikes, agencyCustomers, revenuePerWeek } from "@/data/agencyMockData";
import { ResponsiveContainer, LineChart, Line as RLine, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Download, Lightbulb, Lock, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Analytics = () => {
  const plan = useAgencyStore((s) => s.plan);
  const navigate = useNavigate();
  const [range, setRange] = useState("month");
  const locked = plan === "free";

  const dayData = days.map((d, i) => ({ day: d, count: 4 + ((i * 13) % 8) }));
  const bikeData = agencyBikes.slice(0, 6).map((b) => ({ name: b.brand + " " + b.model.split(" ")[0], rev: b.revenueLast30 }));
  const neighborhoodData = ["Maârif", "Anfa", "Gauthier", "Derb Sultan", "Sidi Maârouf"].map((n, i) => ({ neighborhood: n, count: 5 + ((i * 7) % 12) }));

  return (
    <AgencyLayout>
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Performance insights for your fleet.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> CSV</Button>
            <Button variant="outline" size="sm" className="gap-2"><FileText className="h-3.5 w-3.5" /> PDF</Button>
          </div>
        </div>

        <div className={cn(locked && "pointer-events-none select-none blur-sm")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total revenue" value="38,420 MAD" trend="+12%" />
            <Kpi label="Total bookings" value="142" trend="+8%" />
            <Kpi label="Avg rental price" value="270 MAD" trend="-3%" />
            <Kpi label="Occupancy rate" value="68%" trend="+5%" />
            <Kpi label="Repeat customer rate" value="34%" trend="+2%" />
            <Kpi label="Cancellation rate" value="6%" trend="-1%" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-semibold">Revenue over time</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenuePerWeek}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <RLine type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-warning" /> Insights</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="rounded-md bg-muted/50 p-3">Your <b>Yamaha MT-07</b> is booked 80% of days — consider raising price.</li>
                <li className="rounded-md bg-muted/50 p-3">Weekends outperform weekdays by 40% — offer weekday promos.</li>
                <li className="rounded-md bg-muted/50 p-3">Maârif neighborhood drives 38% of pickups — add a second bike there.</li>
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">Bookings by bike</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bikeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">Bookings by day of week</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">Bookings by neighborhood</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={neighborhoodData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="neighborhood" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-3 p-5">
              <h3 className="font-semibold">Top 10 customers</h3>
              <table className="mt-4 w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2 text-left font-medium">Customer</th><th className="py-2 text-right font-medium">Bookings</th><th className="py-2 text-right font-medium">Total spent</th></tr>
                </thead>
                <tbody>
                  {agencyCustomers.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/60">
                      <td className="py-2"><div className="flex items-center gap-2"><img src={c.avatar} alt={c.name} className="h-7 w-7 rounded-full" />{c.name}</div></td>
                      <td className="py-2 text-right">{c.totalBookings}</td>
                      <td className="py-2 text-right tabular-nums">{(c.totalBookings * 280 + i * 120).toLocaleString()} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="max-w-md p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Unlock full analytics</h3>
              <p className="mt-2 text-sm text-muted-foreground">Upgrade to Pro to see revenue trends, customer insights, and more.</p>
              <Button onClick={() => navigate("/agency/subscription")} className="mt-4 gap-2"><Sparkles className="h-4 w-4" /> Upgrade to Pro</Button>
              <Badge variant="outline" className="mt-3">99 MAD / month</Badge>
            </Card>
          </div>
        )}
      </div>
    </AgencyLayout>
  );
};

const Kpi = ({ label, value, trend }: { label: string; value: string; trend: string }) => (
  <Card className="p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
    <p className={cn("mt-1 text-xs", trend.startsWith("+") ? "text-success" : "text-destructive")}>{trend}</p>
  </Card>
);

export default Analytics;
