import { useNavigate } from "react-router-dom";
import { BadgeCheck, ShieldCheck, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface VerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Path to return to after verification (e.g. /inbox or /booking/:id) */
  returnPath?: string;
}

const Body = ({ onStart }: { onStart: () => void }) => (
  <div className="space-y-5 px-1 pb-2">
    <div className="flex items-center justify-center">
      <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
        <ShieldCheck className="h-8 w-8 text-primary" />
      </div>
    </div>

    <div className="text-center space-y-1.5">
      <h3 className="text-lg font-semibold">You're one step away from chatting with the agency</h3>
      <p className="text-sm text-muted-foreground">
        Verify your account to unlock messaging. Quick, safe, and only takes a minute.
      </p>
    </div>

    <ul className="space-y-2.5 text-sm">
      <li className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <span>Upload your ID card (front & back)</span>
      </li>
      <li className="flex items-start gap-3">
        <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <span>Take a quick selfie holding your ID</span>
      </li>
      <li className="flex items-start gap-3">
        <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <span>An admin reviews within 5 minutes – 24 hours</span>
      </li>
    </ul>

    <Button
      onClick={onStart}
      className="w-full h-12 rounded-full font-semibold"
      variant="hero"
    >
      Verify my account
    </Button>
  </div>
);

export const VerificationDialog = ({
  open,
  onOpenChange,
  returnPath = "/inbox",
}: VerificationDialogProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const start = () => {
    onOpenChange(false);
    navigate(`/verification?next=${encodeURIComponent(returnPath)}`);
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-5 pt-5 pb-6 max-h-[92dvh] overflow-y-auto"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
          <SheetHeader className="sr-only">
            <SheetTitle>Verify your account</SheetTitle>
            <SheetDescription>Required to chat with the agency</SheetDescription>
          </SheetHeader>
          <Body onStart={start} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Verify your account</DialogTitle>
          <DialogDescription>Required to chat with the agency</DialogDescription>
        </DialogHeader>
        <Body onStart={start} />
      </DialogContent>
    </Dialog>
  );
};
