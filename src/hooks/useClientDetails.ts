import { useState, useEffect, useCallback } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ============= TYPES =============
export type AccountStatus = "ACTIVE" | "BLOCKED" | "SUSPENDED";
export type KYCStatus = "VERIFIED" | "PENDING" | "REVERIFY_REQUESTED" | "REJECTED" | "NOT_STARTED";
export type PhoneStatus = "VERIFIED" | "NOT_VERIFIED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type BookingStatus = "PENDING" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PAID" | "UNPAID" | "FAILED" | "REFUNDED";
export type NoteCategory = "Support" | "Risk" | "Payment" | "Booking" | "KYC";
export type TimelineEventType = "ADMIN_ACTION" | "BOOKING" | "KYC" | "TRUST" | "NOTE" | "SYSTEM";

export interface ClientData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  lastActiveAt: string | null;
  accountStatus: AccountStatus;
  kycStatus: KYCStatus;
  phoneStatus: PhoneStatus;
  riskLevel: RiskLevel;
  trustScore: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  totalSpend: number;
  refundsCount: number;
  paymentFailedCount: number;
  avgRentalDuration: number;
  lastBookingAt: string | null;
  // KYC docs - now with signed URLs
  frontIdUrl: string | null;
  backIdUrl: string | null;
  selfieUrl: string | null;
  // ID Card Number
  idCardNumber: string | null;
}

export interface ClientFileData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  downloadCount: number;
}

export interface FileDownloadRecord {
  id: string;
  fileId: string;
  downloadedBy: string;
  downloadedByName: string;
  downloadedAt: string;
}

export interface BookingData {
  id: string;
  motorbikeName: string;
  city: string;
  pickupLocation: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  createdAt: string;
}

export interface TrustEventData {
  id: string;
  datetime: string;
  delta: number;
  reason: string;
  actor: string;
  relatedBookingId: string | null;
}

export interface NoteData {
  id: string;
  category: NoteCategory;
  text: string;
  createdBy: string;
  createdAt: string;
  isPinned: boolean;
}

export interface TimelineEventData {
  id: string;
  type: TimelineEventType;
  label: string;
  description: string;
  actor: string;
  actorType: string;
  datetime: string;
  relatedId?: string;
}

const mapVerificationStatus = (status: string | null, isVerified: boolean | null): KYCStatus => {
  if (isVerified) return "VERIFIED";
  if (status === "pending_review") return "PENDING";
  if (status === "reverify_requested") return "REVERIFY_REQUESTED";
  if (status === "rejected") return "REJECTED";
  return "NOT_STARTED";
};

const mapBookingStatus = (status: string | null): BookingStatus => {
  const statusMap: Record<string, BookingStatus> = {
    pending: "PENDING",
    confirmed: "CONFIRMED",
    ongoing: "ONGOING",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    refunded: "REFUNDED",
  };
  return statusMap[status?.toLowerCase() || ""] || "PENDING";
};

// Helper to generate signed URLs for private bucket images
const getSignedUrl = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  
  try {
    // If it's already a signed URL or public URL, return as is
    if (path.includes('?token=') || path.includes('/public/')) {
      return path;
    }
    
    // Extract the storage path from the URL or use path directly
    let storagePath = path;
    
    // Handle full URLs from storage
    if (path.includes('/storage/v1/object/')) {
      // Extract path after bucket name
      const matches = path.match(/\/id-documents\/(.+)$/);
      if (matches) {
        storagePath = matches[1];
      }
    } else if (path.includes('id-documents/')) {
      // Handle paths that include bucket name
      storagePath = path.split('id-documents/').pop() || path;
    }
    
    const { data, error } = await supabase.storage
      .from('id-documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return null;
  }
};

// Helper to generate signed URLs for client-files bucket
const getClientFileSignedUrl = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  
  try {
    if (path.includes('?token=') || path.includes('/public/')) {
      return path;
    }
    
    let storagePath = path;
    if (path.includes('/storage/v1/object/')) {
      const matches = path.match(/\/client-files\/(.+)$/);
      if (matches) {
        storagePath = matches[1];
      }
    } else if (path.includes('client-files/')) {
      storagePath = path.split('client-files/').pop() || path;
    }
    
    const { data, error } = await supabase.storage
      .from('client-files')
      .createSignedUrl(storagePath, 3600);
    
    if (error) {
      console.error('Failed to generate client file signed URL:', error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error('Error generating client file signed URL:', err);
    return null;
  }
};

export const useClientDetails = (clientId: string | undefined) => {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [trustEvents, setTrustEvents] = useState<TrustEventData[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventData[]>([]);
  const [files, setFiles] = useState<ClientFileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all client data
  const fetchClientData = useCallback(async () => {
    if (!clientId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setError("Client not found");
        setIsLoading(false);
        return;
      }

      // Fetch bookings for this client
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          pickup_date,
          return_date,
          total_price,
          status,
          booking_status,
          delivery_location,
          created_at,
          bike_id,
          bikes!inner(
            bike_type_id,
            bike_types!inner(
              name,
              city_id,
              service_cities(name)
            )
          )
        `)
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Calculate stats
      const bookingsList = bookingsData || [];
      const completedBookings = bookingsList.filter(
        (b) => b.booking_status === "completed" || b.status === "completed"
      ).length;
      const cancelledBookings = bookingsList.filter(
        (b) => b.booking_status === "cancelled" || b.status === "cancelled"
      ).length;
      const totalSpend = bookingsList
        .filter((b) => b.booking_status === "completed" || b.status === "completed")
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
      const lastBooking = bookingsList[0];

      // Generate signed URLs for ID documents (private bucket)
      const [frontIdSignedUrl, backIdSignedUrl, selfieSignedUrl] = await Promise.all([
        getSignedUrl(profileData.id_front_image_url),
        getSignedUrl(profileData.id_back_image_url),
        getSignedUrl(profileData.selfie_with_id_url),
      ]);

      // Map profile data
      const mappedClient: ClientData = {
        id: profileData.id,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        avatarUrl: profileData.avatar_url,
        joinedAt: profileData.created_at,
        lastActiveAt: profileData.last_active_at || profileData.updated_at,
        accountStatus: profileData.is_frozen ? "BLOCKED" : "ACTIVE",
        kycStatus: mapVerificationStatus(profileData.verification_status, profileData.is_verified),
        phoneStatus: profileData.phone_verified ? "VERIFIED" : "NOT_VERIFIED",
        riskLevel: "LOW", // We can compute this later
        trustScore: profileData.trust_score ?? 5,
        totalBookings: bookingsList.length,
        completedBookings,
        cancelledBookings,
        noShows: 0, // Would need additional tracking
        totalSpend,
        refundsCount: bookingsList.filter((b) => b.status === "refunded").length,
        paymentFailedCount: 0, // Would need additional tracking
        avgRentalDuration: 0, // Would need calculation
        lastBookingAt: lastBooking?.created_at || null,
        frontIdUrl: frontIdSignedUrl,
        backIdUrl: backIdSignedUrl,
        selfieUrl: selfieSignedUrl,
        idCardNumber: profileData.id_card_number,
      };

      // Fetch client files with download counts
      const { data: filesData, error: filesError } = await supabase
        .from("client_files")
        .select("*")
        .eq("user_id", clientId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!filesError && filesData) {
        // Fetch download counts for each file
        const fileIds = filesData.map((f) => f.id);
        const { data: downloadCounts } = await supabase
          .from("client_file_downloads")
          .select("file_id")
          .in("file_id", fileIds);
        
        const countMap = new Map<string, number>();
        downloadCounts?.forEach((d) => {
          countMap.set(d.file_id, (countMap.get(d.file_id) || 0) + 1);
        });

        const mappedFiles: ClientFileData[] = filesData.map((f) => ({
          id: f.id,
          fileName: f.file_name,
          fileUrl: f.file_url,
          fileType: f.file_type,
          fileSize: f.file_size || 0,
          uploadedBy: f.uploaded_by,
          uploadedByName: f.uploaded_by_name || "Admin",
          uploadedAt: f.created_at,
          downloadCount: countMap.get(f.id) || 0,
        }));
        setFiles(mappedFiles);
      }

      // Map bookings
      const mappedBookings: BookingData[] = bookingsList.map((b) => ({
        id: b.id,
        motorbikeName: b.bikes?.bike_types?.name || "Unknown Bike",
        city: b.bikes?.bike_types?.service_cities?.name || "Unknown City",
        pickupLocation: b.delivery_location || "Pickup",
        startDate: b.pickup_date,
        endDate: b.return_date,
        price: b.total_price || 0,
        deposit: 0, // Would need additional field
        paymentStatus: "PAID" as PaymentStatus, // Would need payment tracking
        bookingStatus: mapBookingStatus(b.booking_status || b.status),
        createdAt: b.created_at,
      }));

      setClient(mappedClient);
      setBookings(mappedBookings);

      // Fetch trust events
      const { data: trustData, error: trustError } = await supabase
        .from("client_trust_events")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (!trustError && trustData) {
        setTrustEvents(
          trustData.map((t) => ({
            id: t.id,
            datetime: t.created_at,
            delta: t.delta,
            reason: t.reason,
            actor: t.actor_name || "System",
            relatedBookingId: t.related_booking_id,
          }))
        );
      }

      // Fetch notes - simplified query without foreign key join
      const { data: notesData, error: notesError } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (notesError) {
        console.error("Notes fetch error:", notesError);
      }

      if (!notesError && notesData) {
        // Fetch admin names separately if needed
        const creatorIds = [...new Set(notesData.map(n => n.created_by))];
        const { data: creators } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", creatorIds);
        
        const creatorMap = new Map(creators?.map(c => [c.id, c.name]) || []);
        
        setNotes(
          notesData.map((n) => ({
            id: n.id,
            category: (n.category as NoteCategory) || "Support",
            text: n.note_description,
            createdBy: creatorMap.get(n.created_by) || "Admin",
            createdAt: n.created_at,
            isPinned: n.is_pinned || false,
          }))
        );
      }

      // Fetch timeline events
      const { data: timelineData, error: timelineError } = await supabase
        .from("client_timeline_events")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (!timelineError && timelineData) {
        setTimelineEvents(
          timelineData.map((t) => ({
            id: t.id,
            type: t.event_type as TimelineEventType,
            label: t.label,
            description: t.description,
            actor: t.actor_name || "System",
            actorType: t.actor_type,
            datetime: t.created_at,
            relatedId: t.related_id || undefined,
          }))
        );
      }
    } catch (err: unknown) {
      console.error("Error fetching client data:", err);
      setError(getErrMsg(err) || "Failed to load client data");
      toast.error("Failed to load client data");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Real-time subscription for client profile changes (e.g., verification status)
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-profile-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${clientId}`,
        },
        async (payload) => {
          type ProfileRow = {
            name?: string | null; email?: string | null; phone?: string | null;
            avatar_url?: string | null; last_active_at?: string | null;
            is_frozen?: boolean | null; verification_status?: string | null;
            is_verified?: boolean | null; phone_verified?: boolean | null;
            trust_score?: number | null;
            id_front_image_url?: string | null; id_back_image_url?: string | null;
            selfie_with_id_url?: string | null;
          };
          const updated = payload.new as ProfileRow;
          
          // Generate new signed URLs for updated images
          const [frontIdSignedUrl, backIdSignedUrl, selfieSignedUrl] = await Promise.all([
            getSignedUrl(updated.id_front_image_url ?? undefined),
            getSignedUrl(updated.id_back_image_url ?? undefined),
            getSignedUrl(updated.selfie_with_id_url ?? undefined),
          ]);
          
          setClient((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              name: updated.name ?? prev.name,
              email: updated.email ?? prev.email,
              phone: updated.phone ?? prev.phone,
              avatarUrl: updated.avatar_url ?? prev.avatarUrl,
              lastActiveAt: updated.last_active_at ?? prev.lastActiveAt,
              accountStatus: updated.is_frozen ? "BLOCKED" : "ACTIVE",
              kycStatus: mapVerificationStatus(updated.verification_status ?? undefined, updated.is_verified ?? undefined),
              phoneStatus: updated.phone_verified ? "VERIFIED" : "NOT_VERIFIED",
              trustScore: updated.trust_score ?? prev.trustScore,
              frontIdUrl: frontIdSignedUrl ?? prev.frontIdUrl,
              backIdUrl: backIdSignedUrl ?? prev.backIdUrl,
              selfieUrl: selfieSignedUrl ?? prev.selfieUrl,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  // Real-time subscription for bookings changes
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-bookings-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${clientId}`,
        },
        (payload) => {
          // Refetch bookings data when any change occurs
          fetchClientData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchClientData]);

  // ============= ACTION HANDLERS =============

  const addTimelineEvent = async (event: {
    type: TimelineEventType;
    label: string;
    description: string;
    relatedId?: string;
  }) => {
    if (!clientId || !user) return;

    try {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("client_timeline_events").insert({
        user_id: clientId,
        event_type: event.type,
        title: event.label || event.type,
        label: event.label,
        description: event.description,
        actor_type: "Admin",
        actor_id: user.id,
        actor_name: adminProfile?.name || "Admin",
        related_id: event.relatedId,
      } as never);

      if (error) throw error;

      // Refresh timeline
      const { data: newEvent } = await supabase
        .from("client_timeline_events")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newEvent) {
        setTimelineEvents((prev) => [
          {
            id: newEvent.id,
            type: newEvent.event_type as TimelineEventType,
            label: newEvent.label,
            description: newEvent.description,
            actor: newEvent.actor_name || "Admin",
            actorType: newEvent.actor_type,
            datetime: newEvent.created_at,
            relatedId: newEvent.related_id || undefined,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Failed to add timeline event:", err);
    }
  };

  const sendNotification = async (title: string, message: string) => {
    if (!clientId) return;

    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: clientId,
        title,
        message,
        type: "info",
      });

      if (error) throw error;

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Notification Sent",
        description: `Notification "${title}" sent to client.`,
      });

      toast.success("Notification sent successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to send notification");
      return false;
    }
  };

  const blockUnblockUser = async (block: boolean, reason: string) => {
    if (!clientId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_frozen: block,
          frozen_reason: block ? reason : null,
        })
        .eq("id", clientId);

      if (error) throw error;

      setClient((prev) =>
        prev ? { ...prev, accountStatus: block ? "BLOCKED" : "ACTIVE" } : null
      );

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: block ? "Account Blocked" : "Account Unblocked",
        description: `Account ${block ? "blocked" : "unblocked"}. Reason: ${reason}`,
      });

      toast.success(`Account ${block ? "blocked" : "unblocked"} successfully`);
      return true;
    } catch (err: unknown) {
      toast.error(`Failed to ${block ? "block" : "unblock"} user`);
      return false;
    }
  };

  // NEW: Verify user directly
  const verifyUser = async (reason: string) => {
    if (!clientId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "verified",
          is_verified: true,
        })
        .eq("id", clientId);

      if (error) throw error;

      setClient((prev) =>
        prev ? { ...prev, kycStatus: "VERIFIED" } : null
      );

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: clientId,
        title: "Account Verified",
        message: "Your identity has been verified. You can now rent motorbikes.",
        type: "success",
      });

      await addTimelineEvent({
        type: "KYC",
        label: "Account Verified",
        description: `Account verified by admin. Reason: ${reason}`,
      });

      toast.success("User verified successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to verify user");
      return false;
    }
  };

  const requestReverification = async (reason: string) => {
    if (!clientId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: "reverify_requested",
          is_verified: false,
        })
        .eq("id", clientId);

      if (error) throw error;

      setClient((prev) =>
        prev ? { ...prev, kycStatus: "REVERIFY_REQUESTED" } : null
      );

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: clientId,
        title: "Re-verification Required",
        message: `Your account requires re-verification. Reason: ${reason}`,
        type: "warning",
      });

      await addTimelineEvent({
        type: "KYC",
        label: "Re-verification Requested",
        description: `Re-verification requested. Reason: ${reason}`,
      });

      toast.success("Re-verification request sent");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to request re-verification");
      return false;
    }
  };

  const adjustTrustScore = async (
    delta: number,
    reason: string,
    relatedBookingId?: string
  ) => {
    if (!clientId || !client || !user) return;

    const newScore = Math.max(0, Math.min(10, client.trustScore + delta));

    try {
      // Get admin name
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ trust_score: newScore })
        .eq("id", clientId);

      if (profileError) throw profileError;

      // Insert trust event
      const { error: eventError } = await supabase
        .from("client_trust_events")
        .insert({
          user_id: clientId,
          event_type: 'trust_adjustment',
          delta,
          reason,
          actor_id: user.id,
          actor_name: adminProfile?.name || "Admin",
          related_booking_id: relatedBookingId || null,
        } as never);

      if (eventError) throw eventError;

      setClient((prev) => (prev ? { ...prev, trustScore: newScore } : null));

      // Refresh trust events
      const { data: newEvent } = await supabase
        .from("client_trust_events")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newEvent) {
        setTrustEvents((prev) => [
          {
            id: newEvent.id,
            datetime: newEvent.created_at,
            delta: newEvent.delta,
            reason: newEvent.reason,
            actor: newEvent.actor_name || "Admin",
            relatedBookingId: newEvent.related_booking_id,
          },
          ...prev,
        ]);
      }

      await addTimelineEvent({
        type: "TRUST",
        label: `Trust Points ${delta > 0 ? "Added" : "Removed"}`,
        description: `${delta > 0 ? "+" : ""}${delta} trust point(s). Reason: ${reason}${relatedBookingId ? `. Related booking: ${relatedBookingId}` : ""}`,
      });

      toast.success(`Trust score updated to ${newScore}/10`);
      return true;
    } catch (err: unknown) {
      toast.error("Failed to adjust trust score");
      return false;
    }
  };

  const addNote = async (category: NoteCategory, text: string, isPinned: boolean) => {
    if (!clientId || !user) return;

    try {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("user_notes")
        .insert({
          user_id: clientId,
          created_by: user.id,
          note: text,
          note_title: category,
          note_description: text,
          category,
          is_pinned: isPinned,
        } as never)
        .select()
        .single();

      if (error) throw error;

      setNotes((prev) => [
        {
          id: data.id,
          category,
          text,
          createdBy: adminProfile?.name || "Admin",
          createdAt: data.created_at,
          isPinned,
        },
        ...prev,
      ]);

      await addTimelineEvent({
        type: "NOTE",
        label: "Note Added",
        description: `${category} note added.`,
      });

      toast.success("Note added successfully");
      return true;
    } catch (err: unknown) {
      console.error("Failed to add note:", err);
      toast.error("Failed to add note");
      return false;
    }
  };

  const toggleNotePin = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    try {
      const { error } = await supabase
        .from("user_notes")
        .update({ is_pinned: !note.isPinned })
        .eq("id", noteId);

      if (error) throw error;

      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
      );

      toast.success("Note pin status updated");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to update note");
      return false;
    }
  };

  const deleteNote = async (noteId: string, reason: string) => {
    try {
      const { error } = await supabase.from("user_notes").delete().eq("id", noteId);

      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));

      await addTimelineEvent({
        type: "NOTE",
        label: "Note Deleted",
        description: `Note deleted. Reason: ${reason}`,
      });

      toast.success("Note deleted successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to delete note");
      return false;
    }
  };

  // ============= NEW ACTION HANDLERS =============

  const updateClientName = async (newName: string) => {
    if (!clientId) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: newName })
        .eq("id", clientId);

      if (error) throw error;

      setClient((prev) => (prev ? { ...prev, name: newName } : null));

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Name Updated",
        description: `Client name updated to "${newName}"`,
      });

      toast.success("Name updated successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to update name");
      return false;
    }
  };

  const updateClientAvatar = async (file: File | null) => {
    if (!clientId) return false;

    try {
      if (file === null) {
        // Remove avatar
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", clientId);

        if (error) throw error;

        setClient((prev) => (prev ? { ...prev, avatarUrl: null } : null));

        await addTimelineEvent({
          type: "ADMIN_ACTION",
          label: "Avatar Removed",
          description: "Client profile photo removed by admin",
        });

        toast.success("Avatar removed successfully");
        return true;
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}_${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", clientId);

      if (updateError) throw updateError;

      setClient((prev) => (prev ? { ...prev, avatarUrl } : null));

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Avatar Updated",
        description: "Client profile photo updated by admin",
      });

      toast.success("Avatar updated successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to update avatar");
      return false;
    }
  };

  const updateIdCardNumber = async (idNumber: string) => {
    if (!clientId) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ id_card_number: idNumber || null })
        .eq("id", clientId);

      if (error) throw error;

      setClient((prev) => (prev ? { ...prev, idCardNumber: idNumber || null } : null));

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "ID Number Updated",
        description: `Client ID card number updated`,
      });

      toast.success("ID number updated successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to update ID number");
      return false;
    }
  };

  const addFile = async (file: File) => {
    if (!clientId || !user) return false;

    try {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the file URL
      const { data: urlData } = supabase.storage
        .from("client-files")
        .getPublicUrl(filePath);

      // Insert record
      const { data, error: insertError } = await supabase
        .from("client_files")
        .insert({
          user_id: clientId,
          file_name: file.name,
          file_url: filePath,
          file_type: fileExt || "unknown",
          file_size: file.size,
          uploaded_by: user.id,
          uploaded_by_name: adminProfile?.name || "Admin",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFiles((prev) => [
        {
          id: data.id,
          fileName: data.file_name,
          fileUrl: data.file_url,
          fileType: data.file_type,
          fileSize: data.file_size || 0,
          uploadedBy: data.uploaded_by,
          uploadedByName: data.uploaded_by_name || "Admin",
          uploadedAt: data.created_at,
          downloadCount: 0,
        },
        ...prev,
      ]);

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "File Uploaded",
        description: `File "${file.name}" uploaded by admin`,
      });

      toast.success("File uploaded successfully");
      return true;
    } catch (err: unknown) {
      console.error("Failed to upload file:", err);
      toast.error("Failed to upload file");
      return false;
    }
  };

  // Bulk file upload
  const addFiles = async (fileList: File[]): Promise<{ success: number; failed: number }> => {
    if (!clientId || !user) return { success: 0, failed: fileList.length };

    let successCount = 0;
    let failedCount = 0;

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    for (const file of fileList) {
      try {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${clientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("client-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert record
        const { data, error: insertError } = await supabase
          .from("client_files")
          .insert({
            user_id: clientId,
            file_name: file.name,
            file_url: filePath,
            file_type: fileExt || "unknown",
            file_size: file.size,
            uploaded_by: user.id,
            uploaded_by_name: adminProfile?.name || "Admin",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setFiles((prev) => [
          {
            id: data.id,
            fileName: data.file_name,
            fileUrl: data.file_url,
            fileType: data.file_type,
            fileSize: data.file_size || 0,
            uploadedBy: data.uploaded_by,
            uploadedByName: data.uploaded_by_name || "Admin",
            uploadedAt: data.created_at,
            downloadCount: 0,
          },
          ...prev,
        ]);

        successCount++;
      } catch (err: unknown) {
        console.error(`Failed to upload file ${file.name}:`, err);
        failedCount++;
      }
    }

    if (successCount > 0) {
      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Files Uploaded",
        description: `${successCount} file(s) uploaded by admin`,
      });
    }

    if (successCount > 0 && failedCount === 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`${successCount} uploaded, ${failedCount} failed`);
    } else {
      toast.error("Failed to upload files");
    }

    return { success: successCount, failed: failedCount };
  };

  // Get signed URL for file preview
  const getFilePreviewUrl = async (fileId: string): Promise<string | null> => {
    const fileData = files.find((f) => f.id === fileId);
    if (!fileData) return null;
    return getClientFileSignedUrl(fileData.fileUrl);
  };

  const deleteFile = async (fileId: string, reason: string) => {
    if (!clientId) return false;

    try {
      const fileToDelete = files.find((f) => f.id === fileId);
      
      // Soft delete - update with deleted_at and reason
      const { error } = await supabase
        .from("client_files")
        .update({
          deleted_at: new Date().toISOString(),
          delete_reason: reason,
        })
        .eq("id", fileId);

      if (error) throw error;

      setFiles((prev) => prev.filter((f) => f.id !== fileId));

      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "File Deleted",
        description: `File "${fileToDelete?.fileName}" deleted. Reason: ${reason}`,
      });

      toast.success("File deleted successfully");
      return true;
    } catch (err: unknown) {
      toast.error("Failed to delete file");
      return false;
    }
  };

  const downloadFile = async (fileId: string) => {
    const fileData = files.find((f) => f.id === fileId);
    if (!fileData || !user) return;

    try {
      const signedUrl = await getClientFileSignedUrl(fileData.fileUrl);
      if (!signedUrl) throw new Error("Failed to get download URL");

      // Track the download
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      await supabase.from("client_file_downloads").insert({
        file_id: fileId,
        downloaded_by: user.id,
        downloaded_by_name: adminProfile?.name || "Admin",
      });

      // Update local download count
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, downloadCount: f.downloadCount + 1 } : f
        )
      );

      // Open in new tab or trigger download
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = fileData.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      toast.error("Failed to download file");
    }
  };

  // Bulk download files
  const downloadFilesInBulk = async (fileIds: string[]) => {
    if (!user || fileIds.length === 0) return { success: 0, failed: 0 };

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    let successCount = 0;
    let failedCount = 0;

    for (const fileId of fileIds) {
      const fileData = files.find((f) => f.id === fileId);
      if (!fileData) {
        failedCount++;
        continue;
      }

      try {
        const signedUrl = await getClientFileSignedUrl(fileData.fileUrl);
        if (!signedUrl) throw new Error("Failed to get download URL");

        // Track the download
        await supabase.from("client_file_downloads").insert({
          file_id: fileId,
          downloaded_by: user.id,
          downloaded_by_name: adminProfile?.name || "Admin",
        });

        // Trigger download
        const link = document.createElement("a");
        link.href = signedUrl;
        link.download = fileData.fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        successCount++;

        // Small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err: unknown) {
        console.error(`Failed to download file ${fileId}:`, err);
        failedCount++;
      }
    }

    // Update local download counts
    setFiles((prev) =>
      prev.map((f) =>
        fileIds.includes(f.id) ? { ...f, downloadCount: f.downloadCount + 1 } : f
      )
    );

    if (successCount > 0) {
      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Files Downloaded",
        description: `${successCount} file(s) downloaded by admin`,
      });
    }

    if (successCount > 0 && failedCount === 0) {
      toast.success(`${successCount} file(s) downloaded`);
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`${successCount} downloaded, ${failedCount} failed`);
    } else if (failedCount > 0) {
      toast.error("Failed to download files");
    }

    return { success: successCount, failed: failedCount };
  };

  // Bulk delete files
  const deleteFilesInBulk = async (fileIds: string[], reason: string) => {
    if (!clientId || fileIds.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failedCount = 0;
    const deletedFileNames: string[] = [];

    for (const fileId of fileIds) {
      try {
        const fileToDelete = files.find((f) => f.id === fileId);
        
        const { error } = await supabase
          .from("client_files")
          .update({
            deleted_at: new Date().toISOString(),
            delete_reason: reason,
          })
          .eq("id", fileId);

        if (error) throw error;

        if (fileToDelete) {
          deletedFileNames.push(fileToDelete.fileName);
        }
        successCount++;
      } catch (err: unknown) {
        console.error(`Failed to delete file ${fileId}:`, err);
        failedCount++;
      }
    }

    // Update local state
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));

    if (successCount > 0) {
      await addTimelineEvent({
        type: "ADMIN_ACTION",
        label: "Files Deleted",
        description: `${successCount} file(s) deleted. Reason: ${reason}`,
      });
    }

    if (successCount > 0 && failedCount === 0) {
      toast.success(`${successCount} file(s) deleted`);
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`${successCount} deleted, ${failedCount} failed`);
    } else if (failedCount > 0) {
      toast.error("Failed to delete files");
    }

    return { success: successCount, failed: failedCount };
  };

  // Get file download history
  const getFileDownloadHistory = async (fileId: string): Promise<FileDownloadRecord[]> => {
    try {
      const { data, error } = await supabase
        .from("client_file_downloads")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        fileId: d.file_id,
        downloadedBy: d.downloaded_by,
        downloadedByName: d.downloaded_by_name || "Admin",
        downloadedAt: d.created_at,
      }));
    } catch (err) {
      console.error("Failed to fetch download history:", err);
      return [];
    }
  };

  return {
    client,
    bookings,
    trustEvents,
    notes,
    timelineEvents,
    files,
    isLoading,
    error,
    refetch: fetchClientData,
    // Actions
    sendNotification,
    blockUnblockUser,
    verifyUser,
    requestReverification,
    adjustTrustScore,
    addNote,
    toggleNotePin,
    deleteNote,
    // New actions
    updateClientName,
    updateClientAvatar,
    updateIdCardNumber,
    addFile,
    addFiles,
    deleteFile,
    downloadFile,
    getFilePreviewUrl,
    // Bulk actions
    downloadFilesInBulk,
    deleteFilesInBulk,
    getFileDownloadHistory,
  };
};
