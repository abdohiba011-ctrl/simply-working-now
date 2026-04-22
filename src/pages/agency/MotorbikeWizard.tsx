import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, ImagePlus, X, GripVertical, Calendar as CalIcon,
  Plus, Trash2, Eye, AlertCircle, Check,
} from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { agencyBikes, neighborhoods } from "@/data/agencyMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["Basics", "Photos", "Pricing & Availability", "Requirements", "Review & Publish"];
const BRANDS = ["Yamaha", "Honda", "Kawasaki", "Suzuki", "Peugeot", "Kymco", "BMW", "Ducati", "SYM", "Piaggio", "Vespa"];
const YEARS = Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => new Date().getFullYear() - i);
const ENGINE_CHIPS = ["<50cc", "50-125", "126-250", "251-500", "500+"] as const;
const GEAR_OPTS = ["Jacket", "Gloves", "Lock", "Phone mount", "Top case"];

type Lang = "en" | "fr" | "ar";

interface SeasonRange { id: string; from: string; to: string; uplift: number; }

const MotorbikeWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = useMemo(() => agencyBikes.find((b) => b.id === id), [id]);
  const [step, setStep] = useState(0);

  // Step 1
  const [titles, setTitles] = useState<Record<Lang, string>>({ en: editing?.name || "", fr: "", ar: "" });
  const [category, setCategory] = useState(editing?.category || "scooter");
  const [brand, setBrand] = useState(editing?.brand || "");
  const [model, setModel] = useState(editing?.model || "");
  const [year, setYear] = useState<number>(editing?.year || YEARS[0]);
  const [engineChip, setEngineChip] = useState<typeof ENGINE_CHIPS[number]>("50-125");
  const [transmission, setTransmission] = useState<"manual" | "automatic" | "semi">(editing?.transmission || "automatic");
  const [descs, setDescs] = useState<Record<Lang, string>>({ en: editing?.description || "", fr: "", ar: "" });
  const [licensePlate, setLicensePlate] = useState(editing?.licensePlate || "");
  const [color, setColor] = useState(editing?.color || "");
  const [mileage, setMileage] = useState<number>(editing?.odometer || 0);

  // Step 2
  const [photos, setPhotos] = useState<string[]>(editing?.photos || []);
  const [photoUrl, setPhotoUrl] = useState("");
  const [altText, setAltText] = useState("");

  // Step 3
  const [pricePerDay, setPricePerDay] = useState<number>(editing?.pricePerDay || 150);
  const [weeklyDiscount, setWeeklyDiscount] = useState<number>(10);
  const [monthlyDiscount, setMonthlyDiscount] = useState<number>(20);
  const [deposit, setDeposit] = useState<number>(500);
  const [minDays, setMinDays] = useState<number>(1);
  const [maxDays, setMaxDays] = useState<number>(30);
  const [advanceWindow, setAdvanceWindow] = useState<number>(90);
  const [seasons, setSeasons] = useState<SeasonRange[]>([]);
  const [delivery, setDelivery] = useState({
    free: true, airport: false, airportFee: 100, hotel: false, hotelFee: 50, selfPickupOnly: false,
  });

  // Step 4
  const [minAge, setMinAge] = useState<"16" | "18" | "20" | "21">("18");
  const [licenseType, setLicenseType] = useState<"none" | "standard" | "A1" | "A">("standard");
  const [licenseExp, setLicenseExp] = useState<"none" | "6m" | "1y" | "2y">("none");
  const [docs, setDocs] = useState<Record<string, boolean>>({ id: true, passport: false, license: true, intl: false });
  const [helmetsProvided, setHelmetsProvided] = useState(true);
  const [helmetCount, setHelmetCount] = useState<number>(2);
  const [gear, setGear] = useState<string[]>(["Lock"]);

  const titleEn = titles.en.trim();
  const canNext = useMemo(() => {
    if (step === 0) return !!titleEn && !!brand && !!model;
    if (step === 1) return photos.length >= 3;
    if (step === 2) return pricePerDay > 0 && deposit >= 0 && minDays >= 1;
    return true;
  }, [step, titleEn, brand, model, photos.length, pricePerDay, deposit, minDays]);

  const addPhoto = () => {
    if (!photoUrl.trim()) return;
    if (photos.length >= 10) {
      toast.error("Maximum 10 photos");
      return;
    }
    setPhotos((p) => [...p, photoUrl.trim()]);
    setPhotoUrl("");
  };
  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));
  const movePhoto = (from: number, to: number) => {
    setPhotos((p) => {
      const copy = [...p];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };
  const addSeason = () =>
    setSeasons((s) => [...s, { id: `s${Date.now()}`, from: "", to: "", uplift: 20 }]);

  const publish = (asDraft = false) => {
    toast.success(editing ? "Listing updated" : asDraft ? "Saved as draft" : "Listing published 🎉");
    navigate("/agency/motorbikes");
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate("/agency/motorbikes")} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back to motorbikes
            </button>
            <h1 className="text-3xl font-bold tracking-tight">
              {editing ? `Edit ${editing.name}` : "Add a motorbike"}
            </h1>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden")}>
                  <div className={cn("h-full bg-primary transition-all", i < step ? "w-full" : i === step ? "w-1/2" : "w-0")} />
                </div>
                <span className={cn("text-[11px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{i + 1}. {label}</span>
              </div>
            </div>
          ))}
        </div>

        <Card className="p-6">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label>Title</Label>
                <Tabs defaultValue="en" className="mt-2">
                  <TabsList>
                    <TabsTrigger value="en">EN</TabsTrigger>
                    <TabsTrigger value="fr">FR</TabsTrigger>
                    <TabsTrigger value="ar">AR</TabsTrigger>
                  </TabsList>
                  {(["en", "fr", "ar"] as Lang[]).map((l) => (
                    <TabsContent key={l} value={l} className="mt-3">
                      <Input value={titles[l]} onChange={(e) => setTitles((t) => ({ ...t, [l]: e.target.value }))} placeholder={`Title in ${l.toUpperCase()}`} dir={l === "ar" ? "rtl" : "ltr"} />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="sport">Sport</SelectItem>
                      <SelectItem value="cruiser">Cruiser</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="touring">Touring</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="offroad">Off-road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Brand</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. YBR 125" className="mt-2" />
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Engine size</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ENGINE_CHIPS.map((c) => (
                    <button key={c} type="button" onClick={() => setEngineChip(c)} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", engineChip === c ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background hover:bg-muted")}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Transmission</Label>
                <RadioGroup value={transmission} onValueChange={(v) => setTransmission(v as typeof transmission)} className="mt-2 flex gap-6">
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="manual" /> Manual</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="automatic" /> Automatic</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="semi" /> Semi-auto</label>
                </RadioGroup>
              </div>
              <div>
                <Label>Description (max 1000 chars)</Label>
                <Tabs defaultValue="en" className="mt-2">
                  <TabsList>
                    <TabsTrigger value="en">EN</TabsTrigger>
                    <TabsTrigger value="fr">FR</TabsTrigger>
                    <TabsTrigger value="ar">AR</TabsTrigger>
                  </TabsList>
                  {(["en", "fr", "ar"] as Lang[]).map((l) => (
                    <TabsContent key={l} value={l} className="mt-3">
                      <Textarea value={descs[l]} onChange={(e) => setDescs((d) => ({ ...d, [l]: e.target.value.slice(0, 1000) }))} rows={4} dir={l === "ar" ? "rtl" : "ltr"} />
                      <p className="mt-1 text-right text-xs text-muted-foreground">{descs[l].length}/1000</p>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>License plate (private)</Label>
                  <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="12345-A-1" className="mt-2" />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blue" className="mt-2" />
                </div>
                <div>
                  <Label>Current mileage (km)</Label>
                  <Input type="number" value={mileage} onChange={(e) => setMileage(Number(e.target.value))} className="mt-2" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Photos (3–10 required)</Label>
                <p className="mt-1 text-xs text-muted-foreground">Auto-resized to 1920px WebP @ quality 85. First photo is the cover.</p>
              </div>
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Drag & drop photos or paste an image URL</p>
                <div className="mx-auto mt-4 flex max-w-md gap-2">
                  <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
                  <Button type="button" onClick={addPhoto}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                </div>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {photos.map((url, i) => (
                    <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      {i === 0 && <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Cover</span>}
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => i > 0 && movePhoto(i, i - 1)} disabled={i === 0}><ChevronLeft className="h-3 w-3" /></Button>
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => i < photos.length - 1 && movePhoto(i, i + 1)} disabled={i === photos.length - 1}><ChevronRight className="h-3 w-3" /></Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removePhoto(i)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Alt text (optional, AI-generated)</Label>
                <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="A blue Yamaha YBR 125 parked on a sunny street…" className="mt-2" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base price per day (MAD)</Label>
                  <Input type="number" value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} className="mt-2" />
                </div>
                <div>
                  <Label>Deposit (caution)</Label>
                  <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="mt-2" />
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> Collected by you at pickup, not held by Motonita.
                  </p>
                </div>
                <div>
                  <Label>Weekly discount (%)</Label>
                  <Input type="number" value={weeklyDiscount} onChange={(e) => setWeeklyDiscount(Number(e.target.value))} className="mt-2" />
                </div>
                <div>
                  <Label>Monthly discount (%)</Label>
                  <Input type="number" value={monthlyDiscount} onChange={(e) => setMonthlyDiscount(Number(e.target.value))} className="mt-2" />
                </div>
                <div>
                  <Label>Min rental (days)</Label>
                  <Input type="number" value={minDays} onChange={(e) => setMinDays(Number(e.target.value))} className="mt-2" />
                </div>
                <div>
                  <Label>Max rental (days)</Label>
                  <Input type="number" value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} className="mt-2" />
                </div>
                <div>
                  <Label>Advance booking window (days, max 180)</Label>
                  <Input type="number" max={180} value={advanceWindow} onChange={(e) => setAdvanceWindow(Math.min(180, Number(e.target.value)))} className="mt-2" />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalIcon className="h-4 w-4 text-primary" />
                    <Label className="text-sm">Availability calendar</Label>
                  </div>
                  <Button size="sm" variant="outline">Open full calendar</Button>
                </div>
                <p className="text-xs text-muted-foreground">Paint days as Available, Booked, Blocked, or Maintenance. Defaults to all available.</p>
              </div>

              <details className="rounded-xl border bg-card p-4">
                <summary className="cursor-pointer font-medium">Seasonal pricing</summary>
                <div className="mt-3 space-y-3">
                  {seasons.map((s, i) => (
                    <div key={s.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">From</Label>
                        <Input type="date" value={s.from} onChange={(e) => setSeasons((arr) => arr.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} className="mt-1" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">To</Label>
                        <Input type="date" value={s.to} onChange={(e) => setSeasons((arr) => arr.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} className="mt-1" />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">% uplift</Label>
                        <Input type="number" value={s.uplift} onChange={(e) => setSeasons((arr) => arr.map((x, j) => j === i ? { ...x, uplift: Number(e.target.value) } : x))} className="mt-1" />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setSeasons((arr) => arr.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addSeason}><Plus className="mr-1 h-4 w-4" /> Add season</Button>
                </div>
              </details>

              <div className="rounded-xl border bg-card p-4">
                <Label className="text-sm">Delivery options</Label>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Free delivery within neighborhood</span>
                    <Switch checked={delivery.free} onCheckedChange={(v) => setDelivery((d) => ({ ...d, free: v }))} />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm">Airport delivery</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={delivery.airportFee} disabled={!delivery.airport} onChange={(e) => setDelivery((d) => ({ ...d, airportFee: Number(e.target.value) }))} className="w-24" />
                      <span className="text-xs text-muted-foreground">MAD</span>
                      <Switch checked={delivery.airport} onCheckedChange={(v) => setDelivery((d) => ({ ...d, airport: v }))} />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm">Hotel delivery</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={delivery.hotelFee} disabled={!delivery.hotel} onChange={(e) => setDelivery((d) => ({ ...d, hotelFee: Number(e.target.value) }))} className="w-24" />
                      <span className="text-xs text-muted-foreground">MAD</span>
                      <Switch checked={delivery.hotel} onCheckedChange={(v) => setDelivery((d) => ({ ...d, hotel: v }))} />
                    </div>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Self pickup only</span>
                    <Switch checked={delivery.selfPickupOnly} onCheckedChange={(v) => setDelivery((d) => ({ ...d, selfPickupOnly: v }))} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <Label>Minimum age</Label>
                <RadioGroup value={minAge} onValueChange={(v) => setMinAge(v as typeof minAge)} className="mt-2 flex gap-6">
                  {(["16", "18", "20", "21"] as const).map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm"><RadioGroupItem value={a} /> {a}</label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label>License type required</Label>
                <Select value={licenseType} onValueChange={(v) => setLicenseType(v as typeof licenseType)}>
                  <SelectTrigger className="mt-2 w-[260px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="A1">Permis A1</SelectItem>
                    <SelectItem value="A">Permis A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min license experience</Label>
                <Select value={licenseExp} onValueChange={(v) => setLicenseExp(v as typeof licenseExp)}>
                  <SelectTrigger className="mt-2 w-[260px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="6m">6 months</SelectItem>
                    <SelectItem value="1y">1 year</SelectItem>
                    <SelectItem value="2y">2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Documents needed at pickup</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { key: "id", label: "National ID" },
                    { key: "passport", label: "Passport" },
                    { key: "license", label: "Driver's license" },
                    { key: "intl", label: "International permit" },
                  ].map((d) => (
                    <label key={d.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={docs[d.key]} onCheckedChange={(v) => setDocs((p) => ({ ...p, [d.key]: !!v }))} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-card p-4">
                <div>
                  <Label className="text-sm">Helmets provided</Label>
                  {helmetsProvided && (
                    <p className="text-xs text-muted-foreground mt-1">How many?</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {helmetsProvided && (
                    <Input type="number" value={helmetCount} onChange={(e) => setHelmetCount(Number(e.target.value))} className="w-20" min={0} max={4} />
                  )}
                  <Switch checked={helmetsProvided} onCheckedChange={setHelmetsProvided} />
                </div>
              </div>
              <div>
                <Label>Gear included</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GEAR_OPTS.map((g) => {
                    const on = gear.includes(g);
                    return (
                      <button key={g} type="button" onClick={() => setGear((cur) => on ? cur.filter((x) => x !== g) : [...cur, g])} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}>
                        {on && <Check className="mr-1 inline h-3 w-3" />}{g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preview as renters will see it</p>
              </div>
              <Card className="overflow-hidden">
                {photos[0] && <img src={photos[0]} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <h3 className="text-xl font-bold">{titleEn || "Untitled"}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{brand} {model} · {category} · {year}</p>
                  <p className="mt-3 text-2xl font-bold">{pricePerDay} <span className="text-sm font-normal text-muted-foreground">MAD/day</span></p>
                  {descs.en && <p className="mt-3 text-sm">{descs.en}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-1">Min {minDays}d</span>
                    <span className="rounded bg-muted px-2 py-1">Deposit {deposit} MAD</span>
                    <span className="rounded bg-muted px-2 py-1">License {licenseType}</span>
                    {helmetsProvided && <span className="rounded bg-muted px-2 py-1">{helmetCount} helmets</span>}
                  </div>
                </div>
              </Card>
              {editing && (
                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
                  <p>Editing a live listing. Existing bookings will keep their original terms.</p>
                </div>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <Button variant="ghost" onClick={() => step === 0 ? navigate("/agency/motorbikes") : setStep((s) => s - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => publish(true)}>Save as draft</Button>
                <Button onClick={() => publish(false)}>{editing ? "Update listing" : "Publish listing"}</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeWizard;
