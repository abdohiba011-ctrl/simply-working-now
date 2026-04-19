import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BlockedUserModal } from "./BlockedUserModal";

interface BlockedUserCheckProps {
  children: React.ReactNode;
}

export const BlockedUserCheck = ({ children }: BlockedUserCheckProps) => {
  const { user, isAuthenticated } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsBlocked(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_frozen, frozen_reason')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.is_frozen) {
          setIsBlocked(true);
          setBlockReason(data.frozen_reason);
        } else {
          setIsBlocked(false);
          setBlockReason(null);
        }
      } catch (error) {
        console.error('Error checking blocked status:', error);
        setIsBlocked(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkBlockedStatus();
  }, [user, isAuthenticated]);

  if (isChecking) {
    return null;
  }

  if (isBlocked) {
    return <BlockedUserModal reason={blockReason} />;
  }

  return <>{children}</>;
};
