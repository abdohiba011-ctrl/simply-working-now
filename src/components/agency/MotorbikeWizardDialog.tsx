import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const handleExit = () => onOpenChange(false);
  const handleSaved = (id: string) => {
    onSaved?.(id);
    onOpenChange(false);
  };

  const form = (
    <MotorbikeWizardForm
      key={`${open ? "1" : "0"}-${bikeId ?? "new"}`}
      bikeId={bikeId}
      onExit={handleExit}
      onSaved={handleSaved}
      showHeader={false}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] max-h-[92dvh] rounded-t-2xl p-0 gap-0 flex flex-col overflow-hidden"
        >
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default MotorbikeWizardDialog;
