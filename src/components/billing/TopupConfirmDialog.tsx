import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, CreditCard } from "lucide-react";

const PRESETS = [50, 100, 200, 500];

interface TopupConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  currentBalance: number;
  currency: string;
  submitting: boolean;
  onConfirm: () => void;
  pendingPaymentUrl?: string | null;
}

export function TopupConfirmDialog({
  open,
  onOpenChange,
  amount,
  onAmountChange,
  currentBalance,
  currency,
  submitting,
  onConfirm,
  pendingPaymentUrl,
}: TopupConfirmDialogProps) {
  const [step, setStep] = useState<"amount" | "confirm">("amount");

  useEffect(() => {
    if (open) setStep("amount");
  }, [open]);

  const num = Number(amount);
  const valid = !!num && num >= 10;
  const newBalance = currentBalance + (valid ? num : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "amount" ? "Top up your credits" : "Confirm top-up"}
          </DialogTitle>
        </DialogHeader>

        {step === "amount" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={Number(amount) === p ? "default" : "outline"}
                  onClick={() => onAmountChange(String(p))}
                >
                  {p} MAD
                </Button>
              ))}
            </div>
            <div>
              <Label>Amount (MAD)</Label>
              <Input
                type="number"
                min={10}
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="100"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum 10 MAD. Paid via YouCan Pay (card or Cash Plus).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <Row label="Amount" value={`${num.toFixed(2)} ${currency}`} bold />
              <Row label="Payment method" value="YouCan Pay (Card or Cash Plus)" />
              <Row
                label="Credits added after success"
                value={`+${num.toFixed(2)} ${currency}`}
                accent
              />
              <div className="my-1 border-t" />
              <Row label="Current balance" value={`${currentBalance.toFixed(2)} ${currency}`} />
              <Row
                label="New balance"
                value={`${newBalance.toFixed(2)} ${currency}`}
                bold
              />
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Non-refundable platform top-up. Credits never expire and can be used to pay
                booking fees and other platform charges.
              </span>
            </div>
            <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
              <div className="mb-1 font-semibold text-primary">Sandbox test mode</div>
              <div className="text-muted-foreground">
                Use card <span className="font-mono">4242 4242 4242 4242</span>, any future
                expiry, any CVC. To simulate a failure, use{" "}
                <span className="font-mono">4000 0000 0000 0002</span>.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "amount" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!valid}>
                Review
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("amount")} disabled={submitting}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={onConfirm} disabled={submitting || !valid}>
                {submitting ? "Redirecting…" : "Confirm & pay"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          bold ? "font-semibold" : "",
          accent ? "text-primary font-semibold" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
