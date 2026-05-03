import { useParams, useNavigate } from "react-router-dom";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { MotorbikeWizardForm } from "@/components/agency/MotorbikeWizardForm";

const MotorbikeWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const bikeId = id && id !== "new" ? id : undefined;

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl">
        <MotorbikeWizardForm
          bikeId={bikeId}
          onExit={() => navigate("/agency/motorbikes")}
          onSaved={() => navigate("/agency/motorbikes")}
        />
      </div>
    </AgencyLayout>
  );
};

export default MotorbikeWizard;
