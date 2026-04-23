import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SegmentedTabs } from "@/components/agency/SegmentedTabs";

const Profile = lazy(() => import("./Profile"));
const Team = lazy(() => import("./Team"));
const Verification = lazy(() => import("./Verification"));
const Analytics = lazy(() => import("./Analytics"));

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "team", label: "Team" },
  { key: "verification", label: "Verification" },
  { key: "analytics", label: "Analytics" },
];

const AgencyCenter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.hash?.replace("#", "") || "profile";
  const [tab, setTab] = useState(TABS.find((t) => t.key === initial) ? initial : "profile");

  useEffect(() => {
    const h = location.hash?.replace("#", "");
    if (h && TABS.find((t) => t.key === h) && h !== tab) setTab(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const change = (k: string) => {
    setTab(k);
    navigate(`/agency/agency-center#${k}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Agency Center</h1>
      <SegmentedTabs tabs={TABS} value={tab} onChange={change} />
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
        {tab === "profile" && <Profile />}
        {tab === "team" && <Team />}
        {tab === "verification" && <Verification />}
        {tab === "analytics" && <Analytics />}
      </Suspense>
    </div>
  );
};

export default AgencyCenter;
