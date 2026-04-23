import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { mockResendVerification } from "@/lib/mockAuth";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPlaceholder() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await mockResendVerification(user?.email ?? "");
      toast.success("Verification email sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#9FE870" }}>
          <MailCheck className="h-6 w-6" style={{ color: "#163300" }} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#163300" }}>
            Verify your email
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            We sent a verification link to{" "}
            <span className="font-medium" style={{ color: "#163300" }}>
              {user?.email ?? "your email"}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={resend}
            disabled={sending}
            className="h-10"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {sending ? "Sending..." : "Resend verification email"}
          </Button>
          <Button variant="ghost" onClick={logout} className="h-9 text-sm">
            Use a different account
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
