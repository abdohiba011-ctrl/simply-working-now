import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const events = [
  { key: "new_booking", label: "New booking" },
  { key: "booking_confirmed", label: "Booking confirmed" },
  { key: "booking_cancelled", label: "Booking cancelled" },
  { key: "new_message", label: "New message" },
  { key: "low_wallet", label: "Low wallet balance" },
  { key: "verification", label: "Verification update" },
  { key: "subscription", label: "Subscription renewal" },
  { key: "payout", label: "Payout complete" },
  { key: "review", label: "Review received" },
];

const channels = ["email", "sms", "push", "inapp"] as const;
const channelLabel = { email: "Email", sms: "SMS", push: "Push", inapp: "In-app" };

const defaults: Record<string, Record<string, boolean>> = {
  new_booking: { email: true, sms: true, push: true, inapp: true },
  booking_confirmed: { email: true, sms: false, push: true, inapp: true },
  booking_cancelled: { email: true, sms: true, push: true, inapp: true },
  new_message: { email: false, sms: false, push: true, inapp: true },
  low_wallet: { email: true, sms: true, push: true, inapp: true },
  verification: { email: true, sms: false, push: false, inapp: true },
  subscription: { email: true, sms: false, push: false, inapp: true },
  payout: { email: true, sms: false, push: true, inapp: true },
  review: { email: false, sms: false, push: true, inapp: true },
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
