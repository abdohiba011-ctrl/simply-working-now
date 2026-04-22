import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";

const TITLES: Record<string, string> = {
  motorbikes: "Motorbikes",
  messages: "Messages",
  calendar: "Calendar",
  wallet: "Wallet",
  transactions: "Transactions",
  subscription: "Subscription",
  invoices: "Invoices",
  profile: "Agency Profile",
  team: "Team",
  verification: "Verification",
  analytics: "Analytics",
  preferences: "Preferences",
  notifications: "Notifications",
  integrations: "Integrations",
  help: "Help & Support",
};

const Placeholder = () => {
  const { pathname } = useLocation();
  const slug = pathname.split("/").pop() || "";
  const title = TITLES[slug] || "Coming soon";

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <div className="mt-8 rounded-xl border bg-card shadow-sm">
          <EmptyState
            icon={Construction}
            title="Coming soon"
            description="This section of the agency dashboard is under construction. We're polishing it and will ship it shortly."
          />
        </div>
      </div>
    </AgencyLayout>
  );
};

export default Placeholder;
