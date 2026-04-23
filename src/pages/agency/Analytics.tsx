import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";

const Analytics = () => {
  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={BarChart3}
          title="Analytics coming soon"
          description="Revenue, occupancy and customer insights will appear here once you start receiving real bookings."
        />
      </div>
    </AgencyLayout>
  );
};

export default Analytics;
