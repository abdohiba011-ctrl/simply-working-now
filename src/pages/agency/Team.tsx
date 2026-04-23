import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

const Team = () => {
  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={Users}
          title="Team management coming soon"
          description="Invite teammates and assign permissions. This feature will be enabled with the Pro and Business plans."
        />
      </div>
    </AgencyLayout>
  );
};

export default Team;
