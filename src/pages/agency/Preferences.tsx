import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const Preferences = () => {
  const [autoConfirm, setAutoConfirm] = useState(false);

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">Personalize your dashboard experience.</p>
        </div>

        <Card className="space-y-5 p-6">
          <Row label="Language">
            <Select defaultValue="en">
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="ar">🇲🇦 العربية</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Currency display">
            <Select defaultValue="MAD">
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MAD">MAD (default)</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Timezone">
            <Select defaultValue="casa">
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="casa">Africa/Casablanca</SelectItem>
                <SelectItem value="paris">Europe/Paris</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Date format">
            <Select defaultValue="dmy">
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Theme">
            <div className="flex items-center gap-2">
              <Select defaultValue="light" disabled>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">Dark — coming soon</Badge>
            </div>
          </Row>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-semibold">Booking defaults</h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label>Auto-confirm bookings</Label>
              <p className="mt-1 text-xs text-muted-foreground">When on, bookings are confirmed automatically without manual review.</p>
              {autoConfirm && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Enabling deducts 50 MAD automatically for every booking without manual review.</span>
                </div>
              )}
            </div>
            <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
          </div>
          <Row label="Default advance booking window (days)">
            <Input type="number" defaultValue={90} className="w-32" />
          </Row>
          <Row label="Default minimum rental duration (days)">
            <Input type="number" defaultValue={1} className="w-32" />
          </Row>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => toast.success("Preferences saved")}>Save preferences</Button>
        </div>
      </div>
    </AgencyLayout>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <Label>{label}</Label>
    {children}
  </div>
);

export default Preferences;
