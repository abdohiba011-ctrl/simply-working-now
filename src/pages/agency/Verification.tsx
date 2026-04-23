import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShieldCheck } from "lucide-react";

const Verification = () => (
  <Card>
    <EmptyState
      icon={ShieldCheck}
      title="Verification flow coming soon"
      description="Upload your business documents (RC, ICE, insurance, RIB) to get verified. Setup is in progress."
    />
  </Card>
);

export default Verification;
