import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { Webhook } from "lucide-react";

const Integrations = () => {
  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={Webhook}
          title="Integrations coming soon"
          description="Connect Google Calendar, WhatsApp Business, accounting tools and more. Available soon based on your subscription."
        />
      </div>
    </AgencyLayout>
  );
};

export default Integrations;
