import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const events = [
  { key: "new_booking", label: "New booking" },
  { key: "new_message", label: "New message" },
];

const channels = ["email", "sms"] as const;
const channelLabel = { email: "Email", sms: "SMS" };

const defaults: Record<string, Record<string, boolean>> = {
  new_booking: { email: true, sms: true },
  new_message: { email: true, sms: false },
};

const NotificationSettings = () => {
  const [matrix, setMatrix] = useState(defaults);

  const toggle = (event: string, channel: string) => {
    setMatrix((prev) => ({ ...prev, [event]: { ...prev[event], [channel]: !prev[event][channel] } }));
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose how you want to be notified for each event.</p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  {channels.map((c) => (
                    <th key={c} className="px-4 py-3 text-center font-medium">{channelLabel[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.key} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{e.label}</td>
                    {channels.map((c) => (
                      <td key={c} className="px-4 py-3 text-center">
                        <Switch checked={matrix[e.key][c]} onCheckedChange={() => toggle(e.key, c)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => toast.success("Notification preferences saved")}>Save preferences</Button>
        </div>
      </div>
    </AgencyLayout>
  );
};

export default NotificationSettings;
