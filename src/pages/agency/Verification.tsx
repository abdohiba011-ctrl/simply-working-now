import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { verificationSteps, VerifStatus } from "@/data/agencyFinanceMock";
import { ChevronDown, Upload, CheckCircle2, AlertCircle, Clock, ShieldCheck, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusMap: Record<VerifStatus, { label: string; cls: string; icon: typeof Upload }> = {
  not_started: { label: "Not started", cls: "bg-muted text-muted-foreground", icon: Upload },
  uploaded: { label: "Uploaded", cls: "bg-blue-500/15 text-blue-600", icon: Upload },
  review: { label: "Under review", cls: "bg-warning/15 text-warning", icon: Clock },
  verified: { label: "Verified", cls: "bg-success/15 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

const Verification = () => {
  const [steps, setSteps] = useState(verificationSteps);
  const completed = steps.filter((s) => s.status === "verified").length;
  const total = steps.length;
  const allDone = completed === total;

  const handleUpload = (key: string) => {
    setSteps((prev) => prev.map((s) => s.key === key ? { ...s, status: "uploaded", fileName: "uploaded.pdf" } : s));
    toast.success("Document uploaded — under review");
  };

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verified agencies appear in search results and earn renter trust.</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">{completed} of {total} steps complete</p>
            </div>
            {allDone && <ShieldCheck className="h-10 w-10 text-success" />}
          </div>
          <Progress value={(completed / total) * 100} className="mt-4" />
        </Card>

        {allDone && (
          <Card className="border-success/30 bg-success/5 p-6 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-success" />
            <h3 className="mt-3 text-lg font-bold">Your verified badge is now live!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Renters now see a green checkmark next to your agency.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share on Facebook</Button>
              <Button size="sm" variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share on Instagram</Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {steps.map((s, i) => (
            <StepItem key={s.key} step={s} index={i + 1} onUpload={() => handleUpload(s.key)} />
          ))}
        </div>
      </div>
    </AgencyLayout>
  );
};

const StepItem = ({ step, index, onUpload }: { step: typeof verificationSteps[0]; index: number; onUpload: () => void }) => {
  const [open, setOpen] = useState(step.status === "rejected" || step.status === "not_started");
  const meta = statusMap[step.status];
  const Icon = meta.icon;

  return (
    <Card className={cn("overflow-hidden", step.status === "verified" && "border-success/30")}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-4 p-4 text-left">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold", step.status === "verified" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {step.status === "verified" ? <CheckCircle2 className="h-5 w-5" /> : index}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{step.title}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", meta.cls)}>
                  <Icon className="h-3 w-3" /> {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/60 p-4">
          {step.status === "rejected" && (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Rejected: {step.rejectionReason || "Document not accepted"}
            </div>
          )}
          {step.fileName && step.status !== "rejected" && (
            <p className="mb-3 text-xs text-muted-foreground">Current file: <span className="font-medium text-foreground">{step.fileName}</span></p>
          )}
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 p-6">
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop a file or click to upload</p>
            <Button size="sm" onClick={onUpload} className="mt-3">Choose file</Button>
          </div>
          {step.key === "bank" && (
            <Button variant="outline" size="sm" className="mt-3 w-full">Run 1 MAD micro-test</Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default Verification;
