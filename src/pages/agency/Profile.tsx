import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useAgencyData";
import { LogoUploader } from "@/components/agency/LogoUploader";
import { WorkingHoursEditor } from "@/components/agency/WorkingHoursEditor";
import {
  DEFAULT_WORKING_HOURS,
  normalizeWorkingHours,
  type WorkingHours,
  DAY_KEYS,
} from "@/lib/workingHours";

const Profile = () => {
  const { userId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof) {
        setBusinessName(prof.business_name || "");
        setBusinessEmail(prof.business_email || "");
        setBusinessPhone(prof.business_phone || "");
        setBusinessAddress(prof.business_address || "");
        setBusinessLogoUrl(prof.business_logo_url || null);

        const { data: ag } = await supabase
          .from("agencies")
          .select("id, working_hours")
          .eq("profile_id", prof.id)
          .maybeSingle();
        if (ag) {
          setAgencyId(ag.id);
          setWorkingHours(normalizeWorkingHours(ag.working_hours));
        }
      }
      setLoading(false);
    })();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    // Validate working hours
    for (const k of DAY_KEYS) {
      const d = workingHours[k];
      if (d.open && d.from >= d.to) {
        toast.error(`${k}: end time must be after start time`);
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName,
        business_email: businessEmail,
        business_phone: businessPhone,
        business_address: businessAddress,
        business_logo_url: businessLogoUrl,
      })
      .eq("user_id", userId);
    let whErr: any = null;
    if (agencyId) {
      const r = await supabase
        .from("agencies")
        .update({ working_hours: workingHours as any })
        .eq("id", agencyId);
      whErr = r.error;
    }
    setSaving(false);
    if (error || whErr) toast.error((error || whErr)!.message);
    else toast.success("Profile updated");
  };

  const handleLogoChange = async (url: string | null) => {
    setBusinessLogoUrl(url);
    if (!userId) return;
    await supabase.from("profiles").update({ business_logo_url: url }).eq("user_id", userId);
  };

  if (loading)
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
    );

  return (
    <div className="space-y-6">
      <Card className="space-y-6 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Business profile</h2>

        <div className="grid gap-2">
          <Label>Logo</Label>
          {userId && (
            <LogoUploader
              userId={userId}
              value={businessLogoUrl}
              onChange={handleLogoChange}
            />
          )}
        </div>

        <div className="grid gap-2">
          <Label>Business name</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Business email</Label>
            <Input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Business phone</Label>
            <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Address</Label>
          <Textarea
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            rows={2}
          />
        </div>
      </Card>

      {agencyId && (
        <Card className="p-4 sm:p-6">
          <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
