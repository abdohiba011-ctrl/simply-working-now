// Seeds Casa Moto Rent agency + 6 Bouskoura bikes with AI-generated images.
// Idempotent: safe to re-run. Uses service-role for admin ops.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OWNER_EMAIL = "abdrahimbamouh56@gmail.com";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type BikeSpec = {
  name: string;
  category: string;
  engine_cc: number;
  fuel_type: string;
  transmission: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  deposit_amount: number;
  license_required: string;
  min_age: number;
  min_experience_years: number;
  description: string;
  features: string[];
  color: string;
  year: number;
  mileage_km: number;
  top_speed: string;
  fuel_capacity: string;
  seat_height: string;
  weight: string;
  imagePrompts: string[];
  fallbackImages: string[];
};

const BIKES: BikeSpec[] = [
  {
    name: "Honda PCX 125",
    category: "Scooter",
    engine_cc: 125,
    fuel_type: "Petrol",
    transmission: "Automatic",
    daily_price: 180,
    weekly_price: 1100,
    monthly_price: 3800,
    deposit_amount: 2000,
    license_required: "A1",
    min_age: 18,
    min_experience_years: 0,
    color: "Pearl White",
    year: 2024,
    mileage_km: 4200,
    top_speed: "110 km/h",
    fuel_capacity: "8 L",
    seat_height: "764 mm",
    weight: "131 kg",
    description: "The Honda PCX 125 is the perfect city companion — light, smart, and fuel-efficient. Ideal for navigating Casablanca traffic with its smooth automatic transmission and comfortable upright seating position.",
    features: ["Automatic transmission", "LED headlights", "Idle Stop System", "Smart Key", "USB charging", "Under-seat storage 28L"],
    imagePrompts: [
      "Professional studio photo of a 2024 Honda PCX 125 scooter in pearl white, side profile, clean white background, soft studio lighting, high detail, photorealistic",
      "Front 3/4 angle photo of a Honda PCX 125 scooter parked on a sunny Casablanca street, warm golden hour light, photorealistic",
      "Close-up of the digital dashboard and handlebars of a Honda PCX 125 scooter, sharp focus, premium feel, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
      "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=1200&q=80",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80",
    ],
  },
  {
    name: "Yamaha NMAX 155",
    category: "Scooter",
    engine_cc: 155,
    fuel_type: "Petrol",
    transmission: "Automatic",
    daily_price: 220,
    weekly_price: 1350,
    monthly_price: 4600,
    deposit_amount: 2500,
    license_required: "A1",
    min_age: 18,
    min_experience_years: 0,
    color: "Matte Grey",
    year: 2023,
    mileage_km: 6800,
    top_speed: "125 km/h",
    fuel_capacity: "7.1 L",
    seat_height: "765 mm",
    weight: "131 kg",
    description: "Sportier, more powerful, with stunning matte grey finish. The Yamaha NMAX 155 mixes scooter convenience with real motorbike performance. Perfect for daily commuting and weekend escapes.",
    features: ["VVA engine", "Smart Motor Generator", "Traction Control", "Full LED lighting", "Connected dashboard", "Under-seat storage 23L"],
    imagePrompts: [
      "Professional studio photo of a 2023 Yamaha NMAX 155 scooter in matte grey, side profile, clean white background, photorealistic",
      "Action shot of a Yamaha NMAX 155 scooter on a Moroccan coastal road, motion blur background, sharp on bike, photorealistic",
      "Close-up of the LED headlight and front fairing of a Yamaha NMAX 155 in matte grey, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=1200&q=80",
      "https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=1200&q=80",
      "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=1200&q=80",
    ],
  },
  {
    name: "Honda CB500F",
    category: "Standard",
    engine_cc: 500,
    fuel_type: "Petrol",
    transmission: "Manual",
    daily_price: 380,
    weekly_price: 2400,
    monthly_price: 8500,
    deposit_amount: 5000,
    license_required: "A",
    min_age: 21,
    min_experience_years: 1,
    color: "Matte Black",
    year: 2023,
    mileage_km: 8400,
    top_speed: "180 km/h",
    fuel_capacity: "17.1 L",
    seat_height: "789 mm",
    weight: "189 kg",
    description: "A real motorbike for confident riders. The Honda CB500F naked roadster offers great power, excellent handling, and a sporty riding position. Ideal for both city and highway adventures.",
    features: ["Parallel-twin 471cc engine", "ABS standard", "LCD instrument", "Slipper clutch", "Adjustable brake lever", "Steel diamond frame"],
    imagePrompts: [
      "Professional studio photo of a 2023 Honda CB500F naked motorcycle in matte black, side profile, clean white background, photorealistic, high detail",
      "Dynamic photo of a Honda CB500F motorcycle on a winding Atlas mountain road, warm afternoon light, photorealistic",
      "Close-up detail of the engine and fuel tank of a Honda CB500F in matte black, dramatic lighting, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80",
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
      "https://images.unsplash.com/photo-1591216105370-b2cb4cf32b1b?w=1200&q=80",
    ],
  },
  {
    name: "Kawasaki Ninja 400",
    category: "Sport",
    engine_cc: 399,
    fuel_type: "Petrol",
    transmission: "Manual",
    daily_price: 420,
    weekly_price: 2700,
    monthly_price: 9500,
    deposit_amount: 6000,
    license_required: "A",
    min_age: 21,
    min_experience_years: 2,
    color: "Kawasaki Green",
    year: 2024,
    mileage_km: 3200,
    top_speed: "190 km/h",
    fuel_capacity: "14 L",
    seat_height: "785 mm",
    weight: "168 kg",
    description: "Pure sport adrenaline. The Kawasaki Ninja 400 in iconic green delivers aggressive styling, race-derived ergonomics, and a willing engine. Reserved for experienced riders.",
    features: ["Twin-cylinder 399cc engine", "ABS dual-channel", "Assist & Slipper clutch", "LED lighting", "Trellis frame", "Sport ergonomics"],
    imagePrompts: [
      "Professional studio photo of a 2024 Kawasaki Ninja 400 sportbike in iconic Kawasaki green, side profile, clean white background, photorealistic, high detail",
      "Action shot of a Kawasaki Ninja 400 leaning into a corner on a track, motion blur, photorealistic",
      "Close-up front fairing of a Kawasaki Ninja 400 in green showing twin LED headlights, dramatic lighting, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
      "https://images.unsplash.com/photo-1591216105370-b2cb4cf32b1b?w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80",
    ],
  },
  {
    name: "BMW G310 GS",
    category: "Adventure",
    engine_cc: 313,
    fuel_type: "Petrol",
    transmission: "Manual",
    daily_price: 450,
    weekly_price: 2900,
    monthly_price: 10000,
    deposit_amount: 6000,
    license_required: "A2",
    min_age: 21,
    min_experience_years: 1,
    color: "Rallye White/Blue",
    year: 2023,
    mileage_km: 11200,
    top_speed: "143 km/h",
    fuel_capacity: "11 L",
    seat_height: "835 mm",
    weight: "169 kg",
    description: "Adventure-ready. The BMW G310 GS lets you explore Morocco from the Atlas to the Sahara with comfort and confidence. Tall stance, comfy seat, and bulletproof reliability.",
    features: ["Single-cylinder 313cc", "ABS switchable", "Long-travel suspension", "Hand guards", "Skid plate", "Adventure ergonomics"],
    imagePrompts: [
      "Professional studio photo of a 2023 BMW G310 GS adventure motorcycle in rallye white and blue livery, side profile, clean white background, photorealistic",
      "BMW G310 GS adventure motorcycle on a Sahara desert track at sunset, dust kicking up, photorealistic",
      "Close-up of the BMW G310 GS instrument cluster and tall windscreen, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1591216105370-b2cb4cf32b1b?w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80",
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
    ],
  },
  {
    name: "Vespa Primavera 150",
    category: "Scooter",
    engine_cc: 155,
    fuel_type: "Petrol",
    transmission: "Automatic",
    daily_price: 250,
    weekly_price: 1500,
    monthly_price: 5200,
    deposit_amount: 3000,
    license_required: "A1",
    min_age: 18,
    min_experience_years: 0,
    color: "Vintage Beige",
    year: 2024,
    mileage_km: 2100,
    top_speed: "98 km/h",
    fuel_capacity: "8.5 L",
    seat_height: "780 mm",
    weight: "117 kg",
    description: "Italian style icon. The Vespa Primavera 150 brings timeless elegance, premium build quality, and that unmistakable Vespa character to your Casablanca rides.",
    features: ["i-get engine", "ABS front", "LED lighting", "Premium leather seat", "Color TFT display", "Vintage steel body"],
    imagePrompts: [
      "Professional studio photo of a 2024 Vespa Primavera 150 in vintage beige cream color, side profile, clean white background, photorealistic, premium feel",
      "Vespa Primavera 150 in vintage beige parked in front of a Moroccan riad with bougainvillea, warm sunset light, photorealistic",
      "Close-up detail of the round chrome headlight and steel body of a Vespa Primavera 150 in beige, photorealistic",
    ],
    fallbackImages: [
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80",
      "https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=1200&q=80",
      "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=1200&q=80",
    ],
  },
];

const REVIEWERS = [
  { name: "Youssef A.", rating: 5, comment: "Bike was spotless, agency super reactive on chat. Smooth pickup in Bouskoura." },
  { name: "Sophie L.", rating: 5, comment: "Used it for a week around Casablanca. Reliable, fuel-efficient, great experience." },
  { name: "Karim B.", rating: 4, comment: "Good condition, helmet provided, fair deposit. Would rent again." },
  { name: "Emma D.", rating: 5, comment: "Perfect ride, easy booking, pickup took less than 5 minutes. Recommended!" },
  { name: "Mehdi R.", rating: 4, comment: "Solid bike, clean, fair price. Owner was very helpful with route tips." },
  { name: "Léa M.", rating: 5, comment: "Top experience from start to finish. The agency really cares." },
];

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.warn("AI image gen failed:", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const b64 = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return b64 ?? null;
  } catch (e) {
    console.warn("AI image gen exception:", e);
    return null;
  }
}

async function uploadImage(b64DataUrl: string, path: string): Promise<string | null> {
  try {
    const match = b64DataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    const contentType = match[1];
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const { error } = await admin.storage.from("bike-images").upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn("Upload failed:", error.message);
      return null;
    }
    const { data } = admin.storage.from("bike-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("Upload exception:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) Find owner
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const owner = list?.users.find((u) => u.email === OWNER_EMAIL);
    if (!owner) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: `Owner ${OWNER_EMAIL} not found. Create the auth account first, then re-run.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }
    const ownerId = owner.id;

    // 2) Upsert profile
    await admin.from("profiles").upsert(
      {
        id: ownerId,
        email: OWNER_EMAIL,
        name: "Casa Moto Rent",
        business_name: "Casa Moto Rent",
        business_address: "Bouskoura, Casablanca",
        business_phone: "+212 522 000 000",
        business_email: OWNER_EMAIL,
        is_verified: true,
        verification_status: "verified",
        subscription_plan: "pro",
        user_type: "agency",
      },
      { onConflict: "id" },
    );

    // 3) Roles
    for (const role of ["business", "user"]) {
      await admin.from("user_roles").upsert(
        { user_id: ownerId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    }

    // 4) City + neighborhood
    const { data: cityRow } = await admin
      .from("service_cities")
      .select("id")
      .ilike("name", "Casablanca")
      .maybeSingle();
    const cityId = cityRow?.id;

    if (cityId) {
      await admin.from("service_locations").upsert(
        { city_id: cityId, name: "Bouskoura", is_popular: true, is_active: true },
        { onConflict: "city_id,name", ignoreDuplicates: true },
      );
    }

    // 5+6+7) For each bike
    const summary: Array<{ name: string; image_count: number; review_count: number }> = [];

    for (const spec of BIKES) {
      // Upsert bike_type by name+owner
      const { data: existing } = await admin
        .from("bike_types")
        .select("id")
        .eq("name", spec.name)
        .eq("owner_id", ownerId)
        .maybeSingle();

      const payload = {
        name: spec.name,
        description: spec.description,
        daily_price: spec.daily_price,
        weekly_price: spec.weekly_price,
        monthly_price: spec.monthly_price,
        deposit_amount: spec.deposit_amount,
        license_required: spec.license_required,
        min_age: spec.min_age,
        min_experience_years: spec.min_experience_years,
        engine_cc: spec.engine_cc,
        fuel_type: spec.fuel_type,
        transmission: spec.transmission,
        category: spec.category,
        color: spec.color,
        year: spec.year,
        mileage_km: spec.mileage_km,
        top_speed: spec.top_speed,
        fuel_capacity: spec.fuel_capacity,
        seat_height: spec.seat_height,
        weight: spec.weight,
        features: spec.features,
        neighborhood: "Bouskoura",
        owner_id: ownerId,
        city_id: cityId,
        is_approved: true,
        approval_status: "approved",
        availability_status: "available",
        business_status: "active",
      };

      let bikeTypeId: string;
      if (existing?.id) {
        await admin.from("bike_types").update(payload).eq("id", existing.id);
        bikeTypeId = existing.id;
      } else {
        const { data: ins, error } = await admin
          .from("bike_types")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        bikeTypeId = ins.id;
      }

      // Generate + upload 3 images (skip if already has 3)
      const { data: existingImgs } = await admin
        .from("bike_type_images")
        .select("id")
        .eq("bike_type_id", bikeTypeId);
      let imageCount = existingImgs?.length ?? 0;

      if (imageCount < 3) {
        await admin.from("bike_type_images").delete().eq("bike_type_id", bikeTypeId);
        imageCount = 0;
        let mainSet = false;
        for (let i = 0; i < spec.imagePrompts.length; i++) {
          const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const path = `seed/${slug}-${i}.png`;
          let url: string | null = null;
          const generated = await generateImage(spec.imagePrompts[i]);
          if (generated) url = await uploadImage(generated, path);
          if (!url) url = spec.fallbackImages[i];

          await admin.from("bike_type_images").insert({
            bike_type_id: bikeTypeId,
            image_url: url,
            display_order: i,
          });
          imageCount++;
          if (!mainSet) {
            await admin.from("bike_types").update({ main_image_url: url }).eq("id", bikeTypeId);
            mainSet = true;
          }
        }
      }

      // Bikes inventory row
      const { data: existingBike } = await admin
        .from("bikes")
        .select("id")
        .eq("bike_type_id", bikeTypeId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (!existingBike) {
        await admin.from("bikes").insert({
          bike_type_id: bikeTypeId,
          owner_id: ownerId,
          location: "Bouskoura, Casablanca",
          available: true,
          condition: "good",
        });
      }

      // Reviews
      const { data: existingReviews } = await admin
        .from("bike_reviews")
        .select("id")
        .eq("bike_type_id", bikeTypeId);
      let reviewCount = existingReviews?.length ?? 0;
      if (reviewCount < 3) {
        await admin.from("bike_reviews").delete().eq("bike_type_id", bikeTypeId);
        reviewCount = 0;
        const picks = REVIEWERS.slice(0, 3).map((r, idx) => ({
          bike_type_id: bikeTypeId,
          user_id: null,
          reviewer_name: r.name,
          rating: r.rating,
          comment: r.comment,
          created_at: new Date(Date.now() - (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        }));
        await admin.from("bike_reviews").insert(picks);
        reviewCount = 3;
      }

      // Recompute aggregate
      const { data: allReviews } = await admin
        .from("bike_reviews")
        .select("rating")
        .eq("bike_type_id", bikeTypeId);
      const avg =
        allReviews && allReviews.length > 0
          ? allReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / allReviews.length
          : 0;
      await admin
        .from("bike_types")
        .update({ rating: Math.round(avg * 10) / 10, review_count: allReviews?.length ?? 0 })
        .eq("id", bikeTypeId);

      summary.push({ name: spec.name, image_count: imageCount, review_count: reviewCount });
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        agency: { id: ownerId, email: OWNER_EMAIL, business_name: "Casa Moto Rent" },
        city_id: cityId,
        bikes: summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
