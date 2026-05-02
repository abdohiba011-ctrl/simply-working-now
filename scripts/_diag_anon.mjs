import { createClient } from "@supabase/supabase-js";
const URL = "https://impgemzhqvbxitsxxczm.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcGdlbXpocXZieGl0c3h4Y3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjQyMDYsImV4cCI6MjA5MjIwMDIwNn0.jpqwRJz0jDAlW6VubDxVLQTECBwbnh15LQ5mlbKBp7s";
const sb = createClient(URL, ANON);

const { data: city } = await sb.from("service_cities").select("id").ilike("name","casablanca").maybeSingle();

// 1. bike_types as RentCity does
const r1 = await sb.from("bike_types")
  .select("id,name", { count: "exact" })
  .eq("is_approved", true).eq("approval_status","approved").eq("business_status","active")
  .eq("city_id", city.id);
console.log("1) bike_types Casa:", r1.data?.length, "err:", r1.error?.message);

// 2. bikes_public
const r2 = await sb.from("bikes_public").select("id,bike_type_id,location,available");
console.log("2) bikes_public:", r2.data?.length, "err:", r2.error?.message);

// 3. city_bike_counts
const r3 = await sb.from("city_bike_counts").select("*").eq("name","Casablanca");
console.log("3) city_bike_counts Casa:", r3.data, "err:", r3.error?.message);

// 4. bike_type_images for one seed bike
const r4 = await sb.from("bike_type_images").select("id").eq("bike_type_id","a1111111-1111-1111-1111-111111111111");
console.log("4) bike_type_images Yamaha YBR:", r4.data?.length, "err:", r4.error?.message);

// 5. bike_inventory for seeded owner's bikes
const seedIds = ["a1111111-1111-1111-1111-111111111111","a2222222-2222-2222-2222-222222222222","a3333333-3333-3333-3333-333333333333","a4444444-4444-4444-4444-444444444444","a5555555-5555-5555-5555-555555555555","a6666666-6666-6666-6666-666666666666"];
const r5 = await sb.from("bike_inventory").select("bike_type_id,available_count").in("bike_type_id", seedIds);
console.log("5) bike_inventory seed:", r5.data?.length, r5.data, "err:", r5.error?.message);

// has_role check
const r6 = await sb.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" });
console.log("6) has_role rpc:", r6.data, "err:", r6.error?.message);
