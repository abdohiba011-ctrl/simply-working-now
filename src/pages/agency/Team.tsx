import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { teamMembers, TeamMember } from "@/data/agencyFinanceMock";
import { Check, ChevronDown, MoreHorizontal, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabel = { owner: "Owner", manager: "Manager", staff: "Staff", readonly: "Read-only" };
const matrix = [
  { perm: "View bookings", roles: { owner: true, manager: true, staff: true, readonly: true } },
  { perm: "Confirm/reject bookings", roles: { owner: true, manager: true, staff: true, readonly: false } },
  { perm: "Reply to messages", roles: { owner: true, manager: true, staff: true, readonly: false } },
  { perm: "Add/edit motorbikes", roles: { owner: true, manager: true, staff: true, readonly: false } },
  { perm: "View analytics", roles: { owner: true, manager: true, staff: false, readonly: true } },
  { perm: "Manage wallet & billing", roles: { owner: true, manager: false, staff: false, readonly: false } },
  { perm: "Invite & remove team", roles: { owner: true, manager: false, staff: false, readonly: false } },
];

const Team = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [active, setActive] = useState<TeamMember | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team</h1>
            <p className="mt-1 text-sm text-muted-foreground">Invite teammates and assign granular permissions.</p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Invite member</Button>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Member</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Last active</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.id} onClick={() => setActive(m)} className="cursor-pointer border-b border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} alt={m.name} className="h-9 w-9 rounded-full object-cover" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === "owner" ? "default" : "outline"}>{roleLabel[m.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(m.lastActive), "dd MMM, HH:mm")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.status === "active" ? "secondary" : m.status === "invited" ? "outline" : "destructive"} className="capitalize">{m.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <Collapsible open={showMatrix} onOpenChange={setShowMatrix}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between text-left">
                <span className="text-sm font-medium">Permissions matrix</span>
                <ChevronDown className={cn("h-4 w-4 transition", showMatrix && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 text-left font-medium">Permission</th>
                    {(["owner", "manager", "staff", "readonly"] as const).map((r) => (
                      <th key={r} className="px-2 py-2 text-center font-medium">{roleLabel[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.perm} className="border-b border-border/60">
                      <td className="py-2 pr-4">{row.perm}</td>
                      {(["owner", "manager", "staff", "readonly"] as const).map((r) => (
                        <td key={r} className="px-2 py-2 text-center">
                          {row.roles[r] ? <Check className="mx-auto h-4 w-4 text-success" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input placeholder="Jane Doe" /></div>
            <div><Label>Email</Label><Input type="email" placeholder="jane@agency.ma" /></div>
            <div><Label>Phone</Label><Input placeholder="+212 6…" /></div>
            <div><Label>Role</Label>
              <Select defaultValue="staff">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="readonly">Read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Welcome message (optional)</Label><Textarea placeholder="Welcome aboard!" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setInviteOpen(false); toast.success("Invite sent via email + SMS"); }}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-[400px]">
          <SheetHeader><SheetTitle>Member activity</SheetTitle></SheetHeader>
          {active && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <img src={active.avatar} alt={active.name} className="h-12 w-12 rounded-full" />
                <div>
                  <p className="font-semibold">{active.name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel[active.role]} · {active.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent actions</p>
                {[
                  "Confirmed booking #8312",
                  "Replied to Sophie M.",
                  "Edited Yamaha YBR125 pricing",
                  "Marked Honda CG125 unavailable",
                ].map((a, i) => (
                  <div key={i} className="rounded-md border border-border/60 p-2 text-xs">
                    <p>{a}</p>
                    <p className="mt-0.5 text-muted-foreground">{format(new Date(Date.now() - (i + 1) * 3600000), "dd MMM, HH:mm")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AgencyLayout>
  );
};

export default Team;
