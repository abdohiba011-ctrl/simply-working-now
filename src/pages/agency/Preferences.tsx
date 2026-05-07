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
