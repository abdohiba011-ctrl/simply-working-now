import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAgencyStore } from "@/stores/useAgencyStore";
import { Eye, FileCheck2, FileX2, Upload, Plus, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const docs = [
  { key: "rc", label: "Registre de Commerce", status: "verified" as const, file: "rc-2024.pdf" },
  { key: "ice", label: "ICE certificate", status: "verified" as const, file: "ice-cert.pdf" },
  { key: "insurance", label: "Insurance certificate", status: "verified" as const, file: "axa-2025.pdf" },
  { key: "rib", label: "Bank RIB / IBAN attestation", status: "review" as const, file: "rib-attijari.pdf" },
  { key: "cin", label: "Owner's CIN", status: "rejected" as const, reason: "Photo blurry, please re-upload", file: "cin-front.jpg" },
];

const langs = ["French", "Arabic", "English", "Spanish", "Italian"];

const Profile = () => {
  const agency = useAgencyStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bio, setBio] = useState("Casablanca's friendliest motorbike rental — Yamaha, Honda, Peugeot. Free helmets, pickup at Maârif & Anfa.");

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agency profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Information renters and Motonita see about your agency.</p>
        </div>

        <Tabs defaultValue="business">
          <TabsList>
            <TabsTrigger value="business">Business info</TabsTrigger>
            <TabsTrigger value="address">Address & Locations</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
            <TabsTrigger value="public">Public profile</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="mt-6">
            <Card className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Agency name" defaultValue={agency.name} />
              <Field label="Legal form" type="select" options={["SARL", "SARLAU", "Auto-entrepreneur", "Individual"]} defaultValue="SARL" />
              <Field label="RC number" defaultValue="123456" />
              <Field label="ICE" defaultValue="002345678000045" />
              <Field label="VAT number (optional)" defaultValue="" />
              <Field label="Phone" defaultValue="+212 522 11 22 33" />
              <Field label="Email" defaultValue="contact@casa-moto.ma" />
              <Field label="Website" defaultValue="https://casa-moto.ma" />
              <div className="sm:col-span-2 flex justify-end"><Button onClick={() => toast.success("Business info saved")}>Save changes</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="address" className="mt-6 space-y-4">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Primary location</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Address" defaultValue="123 Rue Tahar Sebti" />
                <Field label="Neighborhood" defaultValue="Maârif" />
                <Field label="City" defaultValue="Casablanca" />
                <Field label="Postal code" defaultValue="20100" />
              </div>
              <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4" /> Map pin (mock)
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Additional locations</h3>
                <Badge variant="outline">Business plan only</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Upgrade to add multiple physical locations.</p>
              <Button variant="outline" disabled className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add location</Button>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
            <Card className="divide-y divide-border">
              {docs.map((d) => (
                <div key={d.key} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.label}</span>
                      <DocStatus status={d.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.file}{d.status === "rejected" && d.reason ? ` — ${d.reason}` : ""}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2"><Upload className="h-3.5 w-3.5" /> {d.status === "rejected" ? "Re-upload" : "Replace"}</Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="public" className="mt-6">
            <Card className="space-y-5 p-6">
              <div>
                <Label>Bio (multilingual)</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Years in business" defaultValue="5" />
                <div>
                  <Label>Languages spoken</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {langs.map((l) => (
                      <Badge key={l} variant={["French", "Arabic", "English"].includes(l) ? "default" : "outline"} className="cursor-pointer">{l}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Operating hours</Label>
                <div className="grid gap-2 text-sm">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="flex items-center gap-3">
                      <Switch defaultChecked={d !== "Sun"} />
                      <span className="w-12 text-muted-foreground">{d}</span>
                      <span className="text-muted-foreground">{d === "Sun" ? "Closed" : "09:00 — 19:00"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="bg-success/15 text-success">Response time &lt; 30 min</Badge>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2"><Eye className="h-4 w-4" /> Preview public profile</Button>
                <Button onClick={() => toast.success("Public profile updated")}>Save</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Public profile preview</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="h-32 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5" />
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">CM</div>
              <div>
                <h3 className="text-xl font-bold">{agency.name}</h3>
                <p className="text-sm text-muted-foreground"><Globe className="inline h-3 w-3" /> Casablanca · 5 years on Motonita</p>
              </div>
            </div>
            <p className="text-sm">{bio}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-success/15 text-success">✓ Verified</Badge>
              <Badge variant="outline">FR · AR · EN</Badge>
              <Badge variant="outline">Response &lt; 30 min</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AgencyLayout>
  );
};

const Field = ({ label, defaultValue, type = "text", options }: { label: string; defaultValue?: string; type?: "text" | "select"; options?: string[] }) => (
  <div>
    <Label>{label}</Label>
    {type === "select" ? (
      <Select defaultValue={defaultValue}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    ) : (
      <Input defaultValue={defaultValue} />
    )}
  </div>
);

const DocStatus = ({ status }: { status: "verified" | "review" | "rejected" | "uploaded" | "not_started" }) => {
  const map = {
    verified: { label: "Verified", cls: "bg-success/15 text-success border-success/30", icon: FileCheck2 },
    review: { label: "Under review", cls: "bg-warning/15 text-warning border-warning/30", icon: FileCheck2 },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: FileX2 },
    uploaded: { label: "Uploaded", cls: "bg-muted text-muted-foreground border-border", icon: FileCheck2 },
    not_started: { label: "Not started", cls: "bg-muted text-muted-foreground border-border", icon: Upload },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", s.cls)}><Icon className="h-3 w-3" /> {s.label}</span>;
};

export default Profile;
