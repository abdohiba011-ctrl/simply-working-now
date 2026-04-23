import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageCircle } from "lucide-react";

const Messages = () => {
  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={MessageCircle}
          title="Messages coming soon"
          description="In-app messaging with renters will be enabled here. For now, contact details are visible in each booking."
        />
      </div>
    </AgencyLayout>
  );
};

export default Messages;
