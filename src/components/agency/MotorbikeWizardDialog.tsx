import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MotorbikeWizardForm } from "./MotorbikeWizardForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing bike id for edit; omit for create. */
  bikeId?: string;
  /** Called after a successful save. */
  onSaved?: (id: string) => void;
}

export const MotorbikeWizardDialog = ({ open, onOpenChange, bikeId, onSaved }: Props) => {
  const handleExit = () => onOpenChange(false);
  const handleSaved = (id: string) => {
    onSaved?.(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Remount form per opening to reset state
        key={`${open ? "1" : "0"}-${bikeId ?? "new"}`}
        className="max-w-3xl p-0 gap-0 h-[90vh] max-h-[90vh] flex flex-col overflow-hidden"
      >
        <MotorbikeWizardForm
          bikeId={bikeId}
          onExit={handleExit}
          onSaved={handleSaved}
          showHeader={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MotorbikeWizardDialog;
