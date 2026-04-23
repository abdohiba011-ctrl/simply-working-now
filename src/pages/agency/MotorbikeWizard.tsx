import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MotorbikeWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id && id !== "new";
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyPrice, setDailyPrice] = useState<number>(150);
  const [engineCc, setEngineCc] = useState<number>(125);
  const [transmission, setTransmission] = useState("automatic");
  const [fuelType, setFuelType] = useState("petrol");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!editing || !id) return;
    supabase.from("bike_types").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name || "");
        setDescription(data.description || "");
        setDailyPrice(Number(data.daily_price || 0));
        setEngineCc(Number(data.engine_cc || 0));
        setTransmission(data.transmission || "automatic");
        setFuelType(data.fuel_type || "petrol");
        setImageUrl(data.main_image_url || "");
      }
      setLoading(false);
    });
  }, [id, editing]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const payload = {
        name,
        description: description || null,
        daily_price: dailyPrice,
        engine_cc: engineCc,
        transmission,
        fuel_type: fuelType,
        main_image_url: imageUrl || null,
        owner_id: u.user.id,
      };
      if (editing && id) {
        const { error } = await supabase.from("bike_types").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Motorbike updated");
      } else {
        const { error } = await supabase.from("bike_types").insert(payload);
        if (error) throw error;
        toast.success("Motorbike added");
      }
      navigate("/agency/motorbikes");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AgencyLayout><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></AgencyLayout>;

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agency/motorbikes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{editing ? "Edit motorbike" : "Add motorbike"}</h1>
        <Card className="space-y-4 p-6">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yamaha MT-07" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Daily price (MAD)</Label>
              <Input type="number" min={0} value={dailyPrice} onChange={(e) => setDailyPrice(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Engine (cc)</Label>
              <Input type="number" min={0} value={engineCc} onChange={(e) => setEngineCc(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Transmission</Label>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="semi">Semi-auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fuel</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Main image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate("/agency/motorbikes")} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeWizard;
