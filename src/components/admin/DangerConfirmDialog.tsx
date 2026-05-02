import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DangerConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Show a reason textarea. If `requireReason` is true, confirm is disabled until filled. */
  withReason?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  /** Called with the (optional) reason text. Awaited so the button shows a loader. */
  onConfirm: (reason?: string) => Promise<void> | void;
  /** Visual tone of the action button. */
  tone?: "destructive" | "warning";
}

/**
 * Reusable confirmation dialog for dangerous admin actions.
 * Prevents accidental clicks, supports a required reason field,
 * and surfaces a loading state on the confirm button.
 */
export const DangerConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  withReason = false,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Briefly explain why you're taking this action…",
  minReasonLength = 10,
  onConfirm,
  tone = "destructive",
}: DangerConfirmDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  const reasonOk =
    !withReason ||
    !requireReason ||
    reason.trim().length >= minReasonLength;

  const handleConfirm = async () => {
    if (!reasonOk || submitting) return;
    try {
      setSubmitting(true);
      await onConfirm(withReason ? reason.trim() : undefined);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-5 w-5",
                tone === "destructive" ? "text-destructive" : "text-warning"
              )}
            />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {withReason && (
          <div className="space-y-2">
            <Label htmlFor="danger-reason">
              {reasonLabel}
              {requireReason && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id="danger-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              disabled={submitting}
            />
            {requireReason && (
              <p className="text-xs text-muted-foreground">
                Min {minReasonLength} characters. This is logged in the audit trail.
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!reasonOk || submitting}
            className={cn(
              tone === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
