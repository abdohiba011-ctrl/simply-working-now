import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

/**
 * Small banner shown to agency owners in their dashboard.
 * Reads the agency's verification_status and displays a hint that
 * motorbikes won't be visible to renters until the shop is verified.
 */
export const AgencyVerificationBanner = () => {
  const [state, setState] = useState<
    "loading" | "verified" | "pending" | "rejected" | "not_started"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) setState("not_started");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!profile?.id) {
        if (!cancelled) setState("not_started");
        return;
      }
      const { data: agency } = await supabase
        .from("agencies")
        .select("verification_status,is_verified")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      if (!agency) return setState("not_started");
      if (agency.is_verified) return setState("verified");
      const s = agency.verification_status;
      if (s === "pending_review" || s === "pending") return setState("pending");
      if (s === "rejected") return setState("rejected");
      setState("not_started");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading" || state === "verified") return null;

  const config = {
    pending: {
      icon: Clock,
      title: "Shop verification pending",
      body: "Your motorbikes won't appear in renter search until your shop is verified by Motonita admins. This usually takes 24–48h.",
      tone: "border-amber-300 bg-amber-50 text-amber-900",
    },
    rejected: {
      icon: AlertTriangle,
      title: "Shop verification rejected",
      body: "Please review your documents and resubmit. Listings stay hidden until your shop is verified.",
      tone: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    not_started: {
      icon: ShieldCheck,
      title: "Verify your shop to start receiving bookings",
      body: "Submit your business documents so renters can see your motorbikes. Approved listings still need a final per-bike admin approval.",
      tone: "border-amber-300 bg-amber-50 text-amber-900",
    },
  }[state];

  const Icon = config.icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${config.tone}`}
    >
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{config.title}</p>
        <p className="text-sm mt-0.5">{config.body}</p>
      </div>
      <Link
        to="/agency/verification"
        className="text-sm font-semibold underline whitespace-nowrap self-center"
      >
        Open verification
      </Link>
    </div>
  );
};

export default AgencyVerificationBanner;
