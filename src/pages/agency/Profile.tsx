import { useEffect, useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useAgencyData";

const Profile = () => {
  const { userId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data) {
        setBusinessName(data.business_name || "");
        setBusinessEmail(data.business_email || "");
        setBusinessPhone(data.business_phone || "");
        setBusinessAddress(data.business_address || "");
        setBusinessLogoUrl(data.business_logo_url || "");
      }
      setLoading(false);
    });
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      business_name: businessName,
      business_email: businessEmail,
      business_phone: businessPhone,
      business_address: businessAddress,
      business_logo_url: businessLogoUrl || null,
    }).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Business profile</h2>
      <div className="grid gap-2">
        <Label>Business name</Label>
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Business email</Label>
          <Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Business phone</Label>
          <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Address</Label>
        <Textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-2">
        <Label>Logo URL</Label>
        <Input value={businessLogoUrl} onChange={(e) => setBusinessLogoUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </Card>
  );
};

export default Profile;
