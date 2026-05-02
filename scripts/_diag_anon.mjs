import { createClient } from "@supabase/supabase-js";
const URL = "https://impgemzhqvbxitsxxczm.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcGdlbXpocXZieGl0c3h4Y3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjQyMDYsImV4cCI6MjA5MjIwMDIwNn0.jpqwRJz0jDAlW6VubDxVLQTECBwbnh15LQ5mlbKBp7s";
const sb = createClient(URL, ANON);

const { data: city } = await sb.from("service_cities").select("id,name").ilike("name","casablanca").maybeSingle();
console.log("anon city:", city);

const { data: bt, error: btErr } = await sb.from("bike_types")
  .select("id,name,approval_status,business_status,is_approved,city_id,owner_id")
  .eq("is_approved", true)
  .eq("approval_status","approved")
  .eq("business_status","active");
console.log("anon bike_types count:", bt?.length, "err:", btErr?.message);

const { data: btCity } = await sb.from("bike_types")
  .select("id,name,owner_id")
  .eq("is_approved", true)
  .eq("approval_status","approved")
  .eq("business_status","active")
  .eq("city_id", city?.id);
console.log("anon bike_types in casa:", btCity?.length, btCity);

const { data: bp, error: bpErr } = await sb.from("bikes_public").select("*").limit(20);
console.log("anon bikes_public count:", bp?.length, "err:", bpErr?.message);

const { data: cbc, error: cbcErr } = await sb.from("city_bike_counts").select("*");
console.log("anon city_bike_counts:", cbc, "err:", cbcErr?.message);

// Auth login
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: "renter@test.com", password: "Renter123" });
console.log("login err:", authErr?.message);

const { data: bt2 } = await sb.from("bike_types")
  .select("id,name,owner_id")
  .eq("is_approved", true)
  .eq("approval_status","approved")
  .eq("business_status","active")
  .eq("city_id", city?.id);
console.log("AUTH bike_types in casa:", bt2?.length);
