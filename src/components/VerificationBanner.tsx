import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Clock, ArrowRight, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { VerificationStatus } from "@/components/VerificationStatusBadge";

export const VerificationBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified, verification_status")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        if (profile.is_verified) {
          setStatus("verified");
        } else if (profile.verification_status === "pending_review") {
          setStatus("pending_review");
        } else if (profile.verification_status === "submitted") {
          setStatus("submitted");
        } else if (profile.verification_status === "rejected") {
          setStatus("rejected");
        } else {
          setStatus("not_started");
        }
      }
      setIsLoading(false);
    };

    checkVerificationStatus();
  }, [user]);

  // Don't show anything if loading, not logged in, or verified
  if (isLoading || !user || status === "verified") {
    return null;
  }

  // Not started or rejected verification
  if (status === "not_started" || status === "rejected") {
    return (
      <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                {status === "rejected" 
                  ? t('verificationStatus.rejectedDesc')
                  : t('verificationStatus.notStartedDesc')
                }
              </p>
            </div>
            <Button
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-white/90 min-h-[44px]"
              onClick={() => navigate("/verification")}
            >
              {t('verificationBanner.verifyNow')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification (submitted or pending_review)
  if (status === "pending_review" || status === "submitted") {
    return (
      <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <p className="text-sm font-medium">
                {t('verificationStatus.pendingReviewDesc')}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-black/30 text-black hover:bg-black/10 min-h-[44px]"
              onClick={() => navigate("/verification")}
            >
              <Eye className="h-4 w-4 mr-1" />
              {t('verificationBanner.seeDetails')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
