import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPlaceholder() {
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#163300" }}>
            Forgot password
          </h1>
          <p className="text-sm" style={{ color: "rgba(22,51,0,0.7)" }}>
            Password reset is coming next. For now, return to login.
          </p>
        </div>
        <Button asChild className="h-10 w-full" style={{ backgroundColor: "#9FE870", color: "#163300" }}>
          <Link to="/login">Back to login</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
