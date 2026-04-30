import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface BookingPayload {
  id: string;
  assigned_to_business: string | null;
  status: string;
  customer_name: string;
  admin_status: string;
}

interface BikeTypePayload {
  id: string;
  name: string;
  approval_status: string;
  owner_id: string | null;
  is_approved: boolean;
}

export const useAdminNotifications = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isBusiness = hasRole("business");

  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Admin notifications for new bike submissions
    if (isAdmin) {
      const bikeTypesChannel = supabase
        .channel("admin-bike-types")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bike_types",
            filter: "approval_status=eq.pending",
          },
          (payload: RealtimePostgresChangesPayload<BikeTypePayload>) => {
            const newBike = payload.new as BikeTypePayload;
            if (newBike && newBike.approval_status === "pending") {
              toast.info("New Bike Submission", {
                description: `A new bike "${newBike.name}" has been submitted for approval.`,
                action: {
                  label: "Review",
                  onClick: () => window.location.href = `/admin/fleet/${newBike.id}`,
                },
              });
            }
          }
        )
        .subscribe();

      channels.push(bikeTypesChannel);

      // Admin notifications for new verification submissions
      const verificationsChannel = supabase
        .channel("admin-verifications")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: "verification_status=eq.pending_review",
          },
          (payload: RealtimePostgresChangesPayload<{ id: string; name: string | null; verification_status: string }>) => {
            const newProfile = payload.new as { id: string; name: string | null; verification_status: string };
            const oldProfile = payload.old as { verification_status: string };
            if (
              newProfile?.verification_status === "pending_review" &&
              oldProfile?.verification_status !== "pending_review"
            ) {
              toast.info("New Verification Submitted", {
                description: `${newProfile.name || "A user"} submitted ID verification for review.`,
                action: {
                  label: "Review",
                  onClick: () => (window.location.href = `/admin/verifications/${newProfile.id}`),
                },
              });
            }
          }
        )
        .subscribe();

      channels.push(verificationsChannel);

      // Admin notifications for new agency shop verification submissions
      const agenciesChannel = supabase
        .channel("admin-agency-verifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agencies",
            filter: "verification_status=eq.pending_review",
          },
          (
            payload: RealtimePostgresChangesPayload<{
              id: string;
              business_name: string | null;
              verification_status: string;
            }>
          ) => {
            const next = payload.new as {
              business_name: string | null;
              verification_status: string;
            };
            if (next?.verification_status === "pending_review") {
              toast.info("New Agency Verification", {
                description: `${next.business_name || "An agency"} submitted shop verification.`,
                action: {
                  label: "Review",
                  onClick: () =>
                    (window.location.href = "/admin/agencies/verifications"),
                },
              });
            }
          }
        )
        .subscribe();

      channels.push(agenciesChannel);

      // Admin notifications for new per-unit motorbike submissions
      const bikesChannel = supabase
        .channel("admin-bikes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bikes",
            filter: "approval_status=eq.pending",
          },
          () => {
            toast.info("New Motorbike Pending Approval", {
              description: "A new motorbike was added and is awaiting review.",
              action: {
                label: "Review",
                onClick: () =>
                  (window.location.href = "/admin/bikes/approvals"),
              },
            });
          }
        )
        .subscribe();

      channels.push(bikesChannel);
    }

    // Business notifications for booking assignments and bike approvals
    if (isBusiness) {
      // Booking assignments
      const bookingsChannel = supabase
        .channel("business-bookings")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
          },
          (payload: RealtimePostgresChangesPayload<BookingPayload>) => {
            const newBooking = payload.new as BookingPayload;
            const oldBooking = payload.old as BookingPayload;
            
            // Check if this booking was just assigned to current user
            if (
              newBooking.assigned_to_business === user.id &&
              oldBooking.assigned_to_business !== user.id
            ) {
              toast.success("New Booking Assigned", {
                description: `Booking from ${newBooking.customer_name} has been assigned to you.`,
                action: {
                  label: "View",
                  onClick: () => window.location.href = `/business/bookings/${newBooking.id}`,
                },
              });
            }
          }
        )
        .subscribe();

      // Bike type approvals/rejections
      const bikeApprovalsChannel = supabase
        .channel("business-bike-approvals")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bike_types",
          },
          (payload: RealtimePostgresChangesPayload<BikeTypePayload>) => {
            const newBike = payload.new as BikeTypePayload;
            const oldBike = payload.old as BikeTypePayload;
            
            // Check if this is the owner's bike and status changed
            if (newBike.owner_id === user.id && oldBike.approval_status === "pending") {
              if (newBike.approval_status === "approved") {
                toast.success("Bike Approved!", {
                  description: `Your bike "${newBike.name}" has been approved and is now live.`,
                });
              } else if (newBike.approval_status === "rejected") {
                toast.error("Bike Rejected", {
                  description: `Your bike "${newBike.name}" was not approved. Please review and resubmit.`,
                });
              }
            }
          }
        )
        .subscribe();

      channels.push(bookingsChannel, bikeApprovalsChannel);
    }

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, isAdmin, isBusiness]);
};

export default useAdminNotifications;