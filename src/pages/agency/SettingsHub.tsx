import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SegmentedTabs } from "@/components/agency/SegmentedTabs";

const Preferences = lazy(() => import("./Preferences"));
const NotificationSettings = lazy(() => import("./NotificationSettings"));
const Integrations = lazy(() => import("./Integrations"));
const Help = lazy(() => import("./Help"));

const TABS = [
  { key: "preferences", label: "Preferences" },
  { key: "notifications", label: "Notifications" },
  { key: "integrations", label: "Integrations" },
  { key: "help", label: "Help & Support" },
];

const SettingsHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.hash?.replace("#", "") || "preferences";
  const [tab, setTab] = useState(TABS.find((t) => t.key === initial) ? initial : "preferences");

  useEffect(() => {
    const h = location.hash?.replace("#", "");
    if (h && TABS.find((t) => t.key === h) && h !== tab) setTab(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const change = (k: string) => {
    setTab(k);
    navigate(`/agency/settings#${k}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <SegmentedTabs tabs={TABS} value={tab} onChange={change} />
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
        {tab === "preferences" && <Preferences />}
        {tab === "notifications" && <NotificationSettings />}
        {tab === "integrations" && <Integrations />}
        {tab === "help" && <Help />}
      </Suspense>
    </div>
  );
};

export default SettingsHub;
