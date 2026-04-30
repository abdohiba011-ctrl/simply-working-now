import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Bike,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  RotateCcw,
  UserX,
  Copy,
  ShieldCheck,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";
import { format, differenceInDays, isFuture } from "date-fns";
import { useBookingEvents } from "@/hooks/useBookingEvents";
import { useBookingPayments } from "@/hooks/useBookingPayments";
import { 
  BookingTimeline, 
  BookingPaymentSection, 
  BookingPriceBreakdown,
  ConfirmBookingModal,
  AssignBusinessModal,
  RejectBookingModal
} from "@/components/admin/bookings";
import { BookingMessagesCard } from "@/components/admin/bookings/BookingMessagesCard";
import { AdminBookingDetailsSkeleton } from "@/components/ui/admin-skeleton";

interface Booking {
  id: string;
  bike_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  admin_status: string;
  admin_notes: string | null;
  assigned_to_business: string | null;
  assigned_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at?: string;
  delivery_method: string;
  delivery_location: string | null;
  contract_url: string | null;
  signed_contract_url: string | null;
  contract_status: string;
  booking_status: string;
  payment_status: string;
  payment_method: string | null;
  amount_paid: number;
  pricing_breakdown: Record<string, unknown> | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejected_reason_code: string | null;
  rejected_reason_text: string | null;
  bikes?: {
    location: string;
    license_plate: string | null;
    bike_types: {
      name: string;
      main_image_url: string;
      daily_price: number;
    };
  };
}

interface BusinessUser {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  business_type?: string | null;
}

interface BookingNote {
  id: string;
  booking_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface CustomerProfile {
  is_verified: boolean;
  verification_status: string;
  trust_score: number;
}

const AdminBookingDetails = () => {
  const navigate = useNavigate();
  const { id: bookingId } = useParams<{ id: string }>();
  const { isAuthenticated, hasRole, user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerBookingsCount, setCustomerBookingsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUnconfirmDialog, setShowUnconfirmDialog] = useState(false);
  const [showUnrejectDialog, setShowUnrejectDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [assignedBusinessName, setAssignedBusinessName] = useState<string | null>(null);
  
  // Notes state
  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Hooks for timeline and payments
  const { events, isLoading: eventsLoading, addEvent } = useBookingEvents(bookingId);
  const { payments, isLoading: paymentsLoading, recordPayment, totalPaid } = useBookingPayments(bookingId);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate("/auth");
        return;
      }
      const isAdmin = hasRole('admin');
      if (!isAdmin) {
        navigate("/");
        return;
      }
      if (bookingId) {
        fetchBooking();
        fetchBusinessUsers();
        fetchNotes();
      }
    };
    checkAccess();
  }, [isAuthenticated, hasRole, navigate, bookingId]);

  const fetchBooking = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          bikes(
            location,
            license_plate,
            bike_types(name, main_image_url, daily_price)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      
      setBooking(data as Booking);

      // Fetch customer profile info
      if (data?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified, verification_status, trust_score')
          .eq('id', data.user_id)
          .single();
        
        setCustomerProfile(profile);

        // Fetch customer bookings count
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user_id);
        
        setCustomerBookingsCount(count || 0);
      }

      // Fetch assigned business name
      if (data?.assigned_to_business) {
        const { data: businessProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', data.assigned_to_business)
          .single();
        
        setAssignedBusinessName(businessProfile?.name || businessProfile?.email || null);
      }
    } catch (error) {
      toast.error('Failed to load booking details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_notes')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchBusinessUsers = async () => {
    try {
      const { data: businessRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agency');

      if (rolesError) throw rolesError;

      if (businessRoles && businessRoles.length > 0) {
        const userIds = businessRoles.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, phone, address, business_type')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        setBusinessUsers(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching business users:', error);
    }
  };

  const handleAddNote = async () => {
    if (!booking || !newNoteTitle.trim() || !newNoteContent.trim() || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('booking_notes')
        .insert({
          booking_id: booking.id,
          note: newNoteTitle.trim(),
          title: newNoteTitle.trim(),
          content: newNoteContent.trim(),
          created_by: user.id
        });

      if (error) throw error;
      toast.success('Note added successfully');
      setShowAddNoteDialog(false);
      setNewNoteTitle("");
      setNewNoteContent("");
      fetchNotes();
      await addEvent('NOTE_ADDED', undefined, undefined, { title: newNoteTitle.trim() });
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      const { error } = await supabase
        .from('booking_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleConfirm = async (options: { generateContract: boolean; notifyCustomer: boolean }) => {
    if (!booking || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          admin_status: 'confirmed',
          status: 'confirmed',
          booking_status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      await addEvent('CONFIRMED', 
        { admin_status: booking.admin_status },
        { admin_status: 'confirmed' },
        { generate_contract: options.generateContract, notify_customer: options.notifyCustomer }
      );
      
      toast.success('Booking confirmed successfully');
      setShowConfirmDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to confirm booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnconfirm = async () => {
    if (!booking || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          admin_status: 'reviewed',
          status: 'pending',
          booking_status: 'pending',
          unconfirmed_at: new Date().toISOString(),
          unconfirmed_by: user.id,
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      await addEvent('UNCONFIRMED', 
        { admin_status: 'confirmed' },
        { admin_status: 'reviewed' }
      );
      
      toast.success('Booking unconfirmed - reverted to reviewed');
      setShowUnconfirmDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to unconfirm booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async (
    reasonCode: string, 
    reasonText: string, 
    options: { notifyCustomer: boolean; flagCustomer: boolean }
  ) => {
    if (!booking || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          admin_status: 'rejected',
          status: 'cancelled',
          booking_status: 'cancelled',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejected_reason_code: reasonCode,
          rejected_reason_text: reasonText,
          cancellation_reason: reasonText || reasonCode,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      await addEvent('REJECTED', 
        { admin_status: booking.admin_status },
        { admin_status: 'rejected' },
        { reason_code: reasonCode, reason: reasonText, notify_customer: options.notifyCustomer }
      );
      
      toast.success('Booking rejected');
      setShowRejectDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to reject booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnreject = async () => {
    if (!booking) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          admin_status: 'reviewed',
          status: 'pending',
          booking_status: 'pending',
          cancellation_reason: null,
          cancelled_at: null,
          rejected_at: null,
          rejected_by: null,
          rejected_reason_code: null,
          rejected_reason_text: null
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      await addEvent('UNREJECTED', 
        { admin_status: 'rejected' },
        { admin_status: 'reviewed' }
      );
      
      toast.success('Booking unrejected - reverted to reviewed');
      setShowUnrejectDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to unreject booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignToBusiness = async (businessId: string, businessName: string) => {
    if (!booking || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          assigned_to_business: businessId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Send notification to business
      const businessUser = businessUsers.find(b => b.id === businessId);
      if (businessUser?.email) {
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              type: 'booking_assigned',
              recipientEmail: businessUser.email,
              recipientName: businessUser.name || 'Partner',
              data: {
                bookingId: booking.id,
                customerName: booking.customer_name,
                bikeName: booking.bikes?.bike_types?.name || 'Motorbike',
                pickupDate: format(new Date(booking.pickup_date), 'MMMM d, yyyy'),
                returnDate: format(new Date(booking.return_date), 'MMMM d, yyyy'),
                totalPrice: booking.total_price,
                location: booking.bikes?.location || 'N/A'
              }
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

      await addEvent('ASSIGNED', 
        { assigned_to_business: null },
        { assigned_to_business: businessId },
        { business_name: businessName }
      );

      toast.success('Booking assigned to business');
      setShowAssignDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to assign booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!booking) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          assigned_to_business: null,
          assigned_at: null
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      await addEvent('UNASSIGNED', 
        { assigned_to_business: booking.assigned_to_business },
        { assigned_to_business: null }
      );
      
      toast.success('Business assignment removed');
      setShowUnassignDialog(false);
      fetchBooking();
    } catch (error) {
      toast.error('Failed to unassign business');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async (method: string, amount: number, notes?: string) => {
    if (!booking || !user) return;
    try {
      await recordPayment(method, amount, notes);
      
      // Update booking payment status
      const newTotalPaid = totalPaid + amount;
      const newPaymentStatus = newTotalPaid >= booking.total_price ? 'paid' : 
                               newTotalPaid > 0 ? 'partially_paid' : 'unpaid';
      
      await supabase
        .from('bookings')
        .update({ 
          payment_status: newPaymentStatus,
          amount_paid: newTotalPaid,
          payment_method: method
        })
        .eq('id', booking.id);
      
      await addEvent('PAYMENT_RECORDED', undefined, undefined, { amount, method });
      
      toast.success('Payment recorded successfully');
      fetchBooking();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!booking || !user) return;
    const remainingAmount = booking.total_price - (booking.amount_paid || 0);
    await handleRecordPayment('cash', remainingAmount, 'Marked as fully paid');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getAdminStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-info/10 text-info border-info/20"><Clock className="h-3 w-3 mr-1" />New</Badge>;
      case 'reviewed':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'confirmed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Partial</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/20">Unpaid</Badge>;
    }
  };

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-success/10 text-success border-success/20">Signed</Badge>;
      case 'sent':
        return <Badge className="bg-info/10 text-info border-info/20">Sent</Badge>;
      case 'generated':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Generated</Badge>;
      default:
        return <Badge variant="outline">Not Generated</Badge>;
    }
  };

  const canUnconfirm = booking?.admin_status === 'confirmed' && 
    isFuture(new Date(booking.pickup_date));

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminBookingDetailsSkeleton />
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">Booking not found</p>
        </div>
      </AdminLayout>
    );
  }

  const rentalDays = differenceInDays(new Date(booking.return_date), new Date(booking.pickup_date)) + 1;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Compact Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/panel?tab=bookings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                Booking #{booking.id.slice(0, 8)}
              </h1>
              {getAdminStatusBadge(booking.admin_status || 'new')}
              {getPaymentStatusBadge(booking.payment_status || 'unpaid')}
              {getContractStatusBadge(booking.contract_status || 'not_generated')}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span>Created: {format(new Date(booking.created_at), 'MMM d, HH:mm')}</span>
              {booking.updated_at && (
                <span>• Updated: {format(new Date(booking.updated_at), 'MMM d, HH:mm')}</span>
              )}
              {assignedBusinessName && (
                <span className="flex items-center gap-1">• <Send className="h-3 w-3" /> {assignedBusinessName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-lg">{booking.customer_name}</p>
                        {customerProfile && (
                          <div className="flex items-center gap-2 mt-1">
                            {customerProfile.is_verified ? (
                              <Badge className="bg-success/10 text-success text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {customerProfile.verification_status || 'Not Verified'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Trust: {customerProfile.trust_score || 0}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {customerBookingsCount > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/users/${booking.user_id}`)}
                        >
                          <History className="h-4 w-4 mr-1" />
                          {customerBookingsCount} bookings
                        </Button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{booking.customer_email}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(booking.customer_email, 'Email')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.customer_phone}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(booking.customer_phone, 'Phone')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Pickup</Label>
                    <p className="font-medium">{format(new Date(booking.pickup_date), 'EEE, MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Return</Label>
                    <p className="font-medium">{format(new Date(booking.return_date), 'EEE, MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="font-medium">{rentalDays} days</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Delivery</Label>
                    <p className="font-medium capitalize">{booking.delivery_method}</p>
                  </div>
                  {booking.delivery_location && (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <Label className="text-muted-foreground">Delivery Location</Label>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {booking.delivery_location}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bike Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bike className="h-4 w-4" />
                  Motorbike
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <img 
                    src={resolveBikeImageUrl(booking.bikes?.bike_types?.main_image_url)} 
                    alt={booking.bikes?.bike_types?.name || 'Motorbike'}
                    className="h-20 w-28 rounded-lg object-cover bg-muted"
                    onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                  />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-base">{booking.bikes?.bike_types?.name || 'N/A'}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {booking.bikes?.location || 'N/A'}
                    </p>
                    {booking.bikes?.license_plate && (
                      <p className="text-muted-foreground">License: {booking.bikes.license_plate}</p>
                    )}
                    <p className="text-muted-foreground">Daily Rate: {booking.bikes?.bike_types?.daily_price} DH</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversation between renter and agency */}
            <BookingMessagesCard bookingId={booking.id} />

            {/* Activity Timeline */}
            <BookingTimeline events={events} isLoading={eventsLoading} />

            {/* Contracts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Contracts
                  </CardTitle>
                  {getContractStatusBadge(booking.contract_status || 'not_generated')}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!booking.contract_url && !booking.signed_contract_url ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-3">No contracts generated yet</p>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Contract
                    </Button>
                  </div>
                ) : (
                  <>
                    {booking.contract_url && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Original Contract</span>
                        <Button variant="outline" size="sm" asChild>
                          <a href={booking.contract_url} target="_blank" rel="noopener noreferrer">
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {booking.signed_contract_url && (
                      <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                        <span className="text-sm font-medium text-success">Signed Contract</span>
                        <Button variant="outline" size="sm" asChild>
                          <a href={booking.signed_contract_url} target="_blank" rel="noopener noreferrer">
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Admin Notes</CardTitle>
                  <CardDescription>Internal notes about this booking</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddNoteDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">No notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{note.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                          >
                            {deletingNoteId === note.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Price Breakdown */}
            <BookingPriceBreakdown
              totalPrice={booking.total_price}
              dailyRate={booking.bikes?.bike_types?.daily_price || 0}
              rentalDays={rentalDays}
              pricingBreakdown={booking.pricing_breakdown as Record<string, unknown> | null}
              amountPaid={booking.amount_paid || totalPaid || 0}
              deliveryMethod={booking.delivery_method}
            />

            {/* Payment Section */}
            <BookingPaymentSection
              payments={payments}
              isLoading={paymentsLoading}
              totalPrice={booking.total_price}
              totalPaid={booking.amount_paid || totalPaid || 0}
              paymentStatus={booking.payment_status || 'unpaid'}
              onRecordPayment={handleRecordPayment}
              onMarkAsPaid={handleMarkAsPaid}
            />

            {/* Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <TooltipProvider>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Booking</span>
                    <Badge variant="outline" className="capitalize">{booking.booking_status || booking.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Admin</span>
                    {getAdminStatusBadge(booking.admin_status || 'new')}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment</span>
                    {getPaymentStatusBadge(booking.payment_status || 'unpaid')}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Contract</span>
                    {getContractStatusBadge(booking.contract_status || 'not_generated')}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Confirm/Unconfirm */}
                {booking.admin_status === 'confirmed' ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setShowUnconfirmDialog(true)}
                            disabled={!canUnconfirm}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Unconfirm
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canUnconfirm && (
                        <TooltipContent>
                          Cannot unconfirm after pickup date
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ) : booking.admin_status !== 'rejected' && (
                  <Button 
                    className="w-full" 
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Booking
                  </Button>
                )}

                {/* Assign/Unassign */}
                {booking.assigned_to_business ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowUnassignDialog(true)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Unassign Business
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Assign to Business
                  </Button>
                )}

                {/* Reject/Unreject */}
                {booking.admin_status === 'rejected' ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowUnrejectDialog(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Unreject
                  </Button>
                ) : booking.admin_status !== 'confirmed' && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Booking
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Assigned Business */}
            {booking.assigned_to_business && (
              <Card className="border-info/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-info" />
                    Assigned Business
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{assignedBusinessName || booking.assigned_to_business.slice(0, 8) + '...'}</p>
                  {booking.assigned_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned: {format(new Date(booking.assigned_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cancellation Info */}
            {booking.cancelled_at && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-destructive">Cancellation</CardTitle>
                </CardHeader>
                <CardContent>
                  {booking.rejected_reason_code && (
                    <Badge variant="outline" className="mb-2">{booking.rejected_reason_code.replace(/_/g, ' ')}</Badge>
                  )}
                  <p className="text-sm">{booking.rejected_reason_text || booking.cancellation_reason || 'No reason provided'}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cancelled: {format(new Date(booking.cancelled_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add an internal note about this booking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                placeholder="Note content..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={isSaving || !newNoteTitle.trim() || !newNoteContent.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Booking Modal */}
      <ConfirmBookingModal
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        booking={booking}
        assignedBusinessName={assignedBusinessName || undefined}
        onConfirm={handleConfirm}
        isLoading={isSaving}
      />

      {/* Assign Business Modal */}
      <AssignBusinessModal
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        businesses={businessUsers}
        onAssign={handleAssignToBusiness}
        isLoading={isSaving}
        bookingLocation={booking.bikes?.location}
      />

      {/* Reject Booking Modal */}
      <RejectBookingModal
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={handleReject}
        isLoading={isSaving}
      />

      {/* Unconfirm Dialog */}
      <Dialog open={showUnconfirmDialog} onOpenChange={setShowUnconfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unconfirm Booking</DialogTitle>
            <DialogDescription>
              This will revert the booking status to "Reviewed". Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnconfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleUnconfirm} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unconfirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unreject Dialog */}
      <Dialog open={showUnrejectDialog} onOpenChange={setShowUnrejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unreject Booking</DialogTitle>
            <DialogDescription>
              This will revert the booking status to "Reviewed". Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnrejectDialog(false)}>Cancel</Button>
            <Button onClick={handleUnreject} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unreject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Dialog */}
      <Dialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Assignment</DialogTitle>
            <DialogDescription>
              This will remove the business assignment. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnassignDialog(false)}>Cancel</Button>
            <Button onClick={handleUnassign} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBookingDetails;
