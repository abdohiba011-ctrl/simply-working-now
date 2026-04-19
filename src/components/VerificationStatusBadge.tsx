import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export type VerificationStatus = 
  | "not_started" 
  | "submitted" 
  | "pending_review" 
  | "verified" 
  | "rejected";

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export const VerificationStatusBadge = ({ 
  status, 
  className,
  showIcon = true,
  size = "md"
}: VerificationStatusBadgeProps) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  };

  const config: Record<VerificationStatus, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
    className: string;
  }> = {
    not_started: {
      label: t('verificationStatus.notStarted'),
      variant: "outline",
      icon: <AlertTriangle className={iconSizes[size]} />,
      className: "border-muted-foreground/50 text-muted-foreground"
    },
    submitted: {
      label: t('verificationStatus.submitted'),
      variant: "secondary",
      icon: <Clock className={cn(iconSizes[size], "animate-pulse")} />,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
    },
    pending_review: {
      label: t('verificationStatus.pendingReview'),
      variant: "secondary",
      icon: <Clock className={cn(iconSizes[size], "animate-pulse")} />,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
    },
    verified: {
      label: t('verificationStatus.verified'),
      variant: "default",
      icon: <CheckCircle className={iconSizes[size]} />,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
    },
    rejected: {
      label: t('verificationStatus.rejected'),
      variant: "destructive",
      icon: <XCircle className={iconSizes[size]} />,
      className: "bg-destructive/10 text-destructive border-destructive/30"
    }
  };

  const { label, icon, className: statusClassName } = config[status] || config.not_started;

  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center",
        sizeClasses[size],
        statusClassName,
        className
      )}
    >
      {showIcon && icon}
      {label}
    </Badge>
  );
};

// Helper hook to get verification status message
export const useVerificationMessage = (status: VerificationStatus) => {
  const { t } = useLanguage();

  const messages: Record<VerificationStatus, { title: string; description: string }> = {
    not_started: {
      title: t('verificationStatus.notStartedTitle'),
      description: t('verificationStatus.notStartedDesc')
    },
    submitted: {
      title: t('verificationStatus.submittedTitle'),
      description: t('verificationStatus.submittedDesc')
    },
    pending_review: {
      title: t('verificationStatus.pendingReviewTitle'),
      description: t('verificationStatus.pendingReviewDesc')
    },
    verified: {
      title: t('verificationStatus.verifiedTitle'),
      description: t('verificationStatus.verifiedDesc')
    },
    rejected: {
      title: t('verificationStatus.rejectedTitle'),
      description: t('verificationStatus.rejectedDesc')
    }
  };

  return messages[status] || messages.not_started;
};
