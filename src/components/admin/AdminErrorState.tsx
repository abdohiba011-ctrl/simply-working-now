import { useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface AdminErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  showBack?: boolean;
  backTo?: string;
}

/**
 * Admin-scoped error state. Never redirects to the public homepage.
 * Provides Retry + safe Back-to-admin navigation.
 */
export const AdminErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this page. Please try again.",
  error,
  onRetry,
  showBack = true,
  backTo = "/admin/panel",
}: AdminErrorStateProps) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const errMsg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error
          ? JSON.stringify(error, null, 2)
          : null;

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            {showBack && (
              <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to admin
              </Button>
            )}
          </div>
          {errMsg && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Technical details
              </button>
              {showDetails && (
                <pre className="mt-2 text-left text-[11px] bg-muted/40 border border-border rounded-md p-3 overflow-auto max-h-48">
                  {errMsg}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
