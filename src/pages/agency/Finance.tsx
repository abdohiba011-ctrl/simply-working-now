import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SegmentedTabs } from "@/components/agency/SegmentedTabs";

const Wallet = lazy(() => import("./Wallet"));
const Transactions = lazy(() => import("./Transactions"));
const Subscription = lazy(() => import("./Subscription"));
const Invoices = lazy(() => import("./Invoices"));

const TABS = [
  { key: "wallet", label: "Wallet" },
  { key: "transactions", label: "Transactions" },
  { key: "subscription", label: "Subscription" },
  { key: "invoices", label: "Invoices" },
];

const Finance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.hash?.replace("#", "") || "wallet";
  const [tab, setTab] = useState(TABS.find((t) => t.key === initial) ? initial : "wallet");

  useEffect(() => {
    const h = location.hash?.replace("#", "");
    if (h && TABS.find((t) => t.key === h) && h !== tab) setTab(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const change = (k: string) => {
    setTab(k);
    navigate(`/agency/finance#${k}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
      <SegmentedTabs tabs={TABS} value={tab} onChange={change} />
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
        {tab === "wallet" && <Wallet />}
        {tab === "transactions" && <Transactions />}
        {tab === "subscription" && <Subscription />}
        {tab === "invoices" && <Invoices />}
      </Suspense>
    </div>
  );
};

export default Finance;
