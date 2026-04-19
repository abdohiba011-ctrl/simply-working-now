import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Bike, Loader2, Phone, User, Home, Package, Truck, CheckCircle, FileText, Download, Upload, AlertCircle, XCircle, Clock } from "lucide-react";
import { BookingCardSkeleton } from "@/components/ui/bike-skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getBikeImageUrl } from "@/lib/bikeImages";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorMessages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Booking {
  id: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  status: string;
  bike_id: string;
  customer_name: string;
  customer_phone: string;
  contract_url: string | null;
  signed_contract_url: string | null;
  contract_status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  bikes: {
    location: string;
    bike_type: {
      name: string;
      main_image_url: string;
      daily_price: number;
    };
  };
}

const CANCELLATION_REASONS = [
  { id: 'plans_changed', label: 'Plans changed - no longer need the motorbike' },
  { id: 'found_better', label: 'Found a better price elsewhere' },
  { id: 'dates_change', label: 'Booking dates need to change' },
  { id: 'personal', label: 'Personal/emergency reasons' },
  { id: 'other', label: 'Other (please specify)' },
];

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  
  // Cancellation state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchBooking();
    }
  }, [user, id]);

  const fetchBooking = async () => {
    if (!user || !id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          pickup_date,
          return_date,
          total_price,
          status,
          bike_id,
          customer_name,
          customer_phone,
          contract_url,
          signed_contract_url,
          contract_status,
          cancellation_reason,
          cancelled_at,
          bikes!inner (
            id,
            location,
            bike_type:bike_types!inner (
              id,
              name,
              main_image_url,
              daily_price
            )
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setBooking(data as Booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!user || !id) return;

    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${id}`
        },
        (payload) => {
          // Update booking with new data while preserving the bike info
          setBooking(prev => prev ? { ...prev, ...payload.new } as Booking : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id]);

  const handleCancelBooking = async () => {
    if (!booking || !cancelReason) {
      toast.error('Please select a reason for cancellation');
      return;
    }

    const finalReason = cancelReason === 'other' 
      ? customCancelReason.trim() || 'Other reason not specified'
      : CANCELLATION_REASONS.find(r => r.id === cancelReason)?.label || cancelReason;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: finalReason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      setShowCancelDialog(false);
      setCancelReason('');
      setCustomCancelReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsCancelling(false);
    }
  };

  const generateContract = async () => {
    if (!booking) return;
    
    setIsGeneratingContract(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: { bookingId: booking.id }
      });

      if (error) throw error;
      
      if (data?.contractHtml) {
        setContractHtml(data.contractHtml);
        
        // Update contract status
        await supabase
          .from('bookings')
          .update({ contract_status: 'generated' })
          .eq('id', booking.id);
          
        toast.success(t('success.contractGenerated') || "Contract generated successfully!");
        fetchBooking();
      }
    } catch (error: unknown) {
      console.error('Error generating contract:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const downloadContract = () => {
    // If contract URL exists in the booking, use that
    if (booking?.contract_url) {
      window.open(booking.contract_url, '_blank');
      return;
    }
    
    // Otherwise use the generated HTML
    if (!contractHtml || !booking) {
      toast.error(t('bookingDetails.generateContract'));
      return;
    }

    const blob = new Blob([contractHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${booking.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(t('success.contractDownloaded') || "Contract downloaded!");
  };

  const openContractInNewTab = () => {
    // If contract URL exists in the booking, use that
    if (booking?.contract_url) {
      window.open(booking.contract_url, '_blank');
      return;
    }
    
    // Otherwise use the generated HTML
    if (!contractHtml) {
      toast.error(t('bookingDetails.generateContract'));
      return;
    }

    const blob = new Blob([contractHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSignedContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking || !user) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('errors.invalidFileType') || "Please upload a PDF or image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('errors.fileTooLarge') || "File size must be less than 10MB");
      return;
    }

    try {
      setIsUploading(true);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${booking.id}/signed-contract.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('signed-contracts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store storage path only - private bucket requires signed URLs for access
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          signed_contract_url: filePath,
          contract_status: 'pending_review'
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast.success(t('success.contractUploaded') || "Signed contract uploaded! Our team will review it shortly.");
      fetchBooking();
    } catch (error) {
      console.error('Error uploading signed contract:', error);
      toast.error(t('errors.uploadFailed') || "Failed to upload signed contract");
    } finally {
      setIsUploading(false);
    }
  };

  const getContractStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: string; label: string }> = {
      generated: { status: 'confirmed', label: t('bookingDetails.contractReady') },
      pending_review: { status: 'pending', label: t('bookingDetails.underReview') },
      approved: { status: 'verified', label: t('bookingDetails.approved') },
      rejected: { status: 'rejected', label: t('bookingDetails.rejected') },
    };
    const config = statusMap[status];
    if (config) {
      return <StatusBadge status={config.status} label={config.label} />;
    }
    return <StatusBadge status="not_started" label={t('bookingDetails.notGenerated')} />;
  };

  const getDeliveryStatus = (status: string) => {
    const statuses = {
      pending: { icon: Package, text: t('bookingDetails.preparingForDelivery'), eta: t('bookingDetails.deliveryTomorrow') },
      confirmed: { icon: CheckCircle, text: t('bookingDetails.confirmedReady'), eta: t('bookingDetails.pickUpAtScheduledTime') },
      in_transit: { icon: Truck, text: t('bookingDetails.onTheWay'), eta: t('bookingDetails.arrivesIn') },
      upcoming: { icon: Calendar, text: t('bookingDetails.scheduledForDelivery'), eta: t('bookingDetails.willBeDelivered') },
    };
    
    return statuses[status.toLowerCase()] || statuses.pending;
  };

  const isPastBooking = (returnDate: string) => {
    return new Date(returnDate) < new Date();
  };

  // RTL-aware back arrow
  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <BookingCardSkeleton />
          <div className="mt-6 space-y-4">
            <BookingCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-4">{t('bookingDetails.bookingNotFound')}</p>
              <Button onClick={() => navigate('/booking-history')} variant="outline">
                {t('bookingDetails.backToMyBookings')}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const days = Math.ceil((new Date(booking.return_date).getTime() - new Date(booking.pickup_date).getTime()) / (1000 * 60 * 60 * 24));
  const deliveryInfo = getDeliveryStatus(booking.status);
  const DeliveryIcon = deliveryInfo.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/booking-history')}
            className={`gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <BackArrow className="h-4 w-4" />
            {t('bookingDetails.backToMyBookings')}
          </Button>

          {/* Main Card */}
          <Card>
            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Header with Bike Info */}
              <div>
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h1 className="text-3xl font-bold text-foreground">{t('bookingDetails.title')}</h1>
                  <StatusBadge 
                    status={booking.status} 
                    label={t(`bookingHistory.status.${booking.status.toLowerCase()}`) || booking.status} 
                  />
                </div>
                <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                  {t('bookingDetails.bookingId')}: <span className="font-mono">{booking.id}</span>
                </p>
              </div>

              <Separator />

              {/* Bike Image & Name */}
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img
                  src={getBikeImageUrl(booking.bikes.bike_type.main_image_url)}
                  alt={booking.bikes.bike_type.name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {booking.bikes.bike_type.name}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/bike/${booking.bike_id}`)}
                  >
                    {t('bookingDetails.viewBikeDetails')}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Rental Period */}
              <div className="space-y-3">
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Calendar className="h-5 w-5 text-foreground" />
                  {t('bookingDetails.rentalPeriod')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground mb-1">{t('bookingDetails.pickupDate')}</p>
                    <p className="font-medium text-foreground">{format(new Date(booking.pickup_date), "MMM dd, yyyy")}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground mb-1">{t('bookingDetails.returnDate')}</p>
                    <p className="font-medium text-foreground">{format(new Date(booking.return_date), "MMM dd, yyyy")}</p>
                  </div>
                  <div className={`sm:col-span-2 ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-sm text-muted-foreground mb-1">{t('bookingDetails.duration')}</p>
                    <p className="font-medium text-foreground">{days} {days === 1 ? t('bookingDetails.day') : t('bookingDetails.days')}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <MapPin className="h-5 w-5 text-foreground" />
                  {t('bookingDetails.location')}
                </h3>
                <p className={`text-foreground bg-muted/30 p-4 rounded-lg ${isRTL ? 'text-right' : ''}`}>
                  Casablanca - {booking.bikes.location}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <User className="h-5 w-5 text-foreground" />
                  {t('bookingDetails.contactInformation')}
                </h3>
                <div className={`space-y-2 bg-muted/30 p-4 rounded-lg ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-foreground"><span className="text-muted-foreground">{t('bookingDetails.name')}:</span> {booking.customer_name}</p>
                  <p className={`text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {booking.customer_phone}
                  </p>
                </div>
              </div>

              {/* Delivery Status - Only for upcoming bookings */}
              {!isPastBooking(booking.return_date) && (
                <div className="space-y-2">
                  <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Truck className="h-5 w-5 text-foreground" />
                    {t('bookingDetails.deliveryStatus')}
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-border">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <DeliveryIcon className="h-6 w-6 text-foreground" />
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="font-medium text-foreground">{deliveryInfo.text}</p>
                        <p className="text-sm text-muted-foreground">{deliveryInfo.eta}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Home className="h-4 w-4" />
                      <span>{t('bookingDetails.homeDeliveryIncluded')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="space-y-2">
                <h3 className={`font-semibold text-foreground ${isRTL ? 'text-right' : ''}`}>{t('bookingDetails.pricingDetails')}</h3>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-muted-foreground">{t('bookingDetails.dailyRate')}</span>
                    <span className="text-black dark:text-white font-medium">{booking.bikes.bike_type.daily_price} DH/{t('bookingDetails.day')}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-muted-foreground">{t('bookingDetails.numberOfDays')}</span>
                    <span className="text-black dark:text-white font-medium">{days} {t('bookingDetails.days')}</span>
                  </div>
                  <Separator />
                  <div className={`flex justify-between text-lg font-bold pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-foreground">{t('bookingDetails.totalPrice')}</span>
                    <span className="text-black dark:text-white">{booking.total_price} DH</span>
                  </div>
                </div>
              </div>

              {/* Rental Contract */}
              <div className="space-y-2">
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FileText className="h-5 w-5 text-foreground" />
                  {t('bookingDetails.rentalContract')}
                  {getContractStatusBadge(booking.contract_status)}
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-4">
                  <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                    {t('bookingDetails.contractDescription')}
                  </p>
                  
                  {/* Generate/Download Contract */}
                  {!contractHtml && !booking.contract_url && booking.contract_status === 'not_generated' ? (
                    <Button
                      onClick={generateContract}
                      disabled={isGeneratingContract}
                      className={`w-full gap-2 bg-foreground text-background hover:bg-foreground/90 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {isGeneratingContract ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {isGeneratingContract ? t('bookingDetails.generating') : t('bookingDetails.generateContract')}
                    </Button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        onClick={openContractInNewTab}
                        className={`flex-1 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <FileText className="h-4 w-4" />
                        {t('bookingDetails.viewContract')}
                      </Button>
                      <Button
                        onClick={downloadContract}
                        className={`flex-1 gap-2 bg-foreground text-background hover:bg-foreground/90 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Download className="h-4 w-4" />
                        {t('bookingDetails.downloadContract')}
                      </Button>
                    </div>
                  )}

                  {/* Upload Signed Contract */}
                  {(contractHtml || booking.contract_url || booking.contract_status !== 'not_generated') && booking.contract_status !== 'approved' && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className={`text-sm font-medium text-foreground ${isRTL ? 'text-right' : ''}`}>{t('bookingDetails.uploadSignedContract')}</p>
                        
                        {booking.signed_contract_url ? (
                          <div className={`flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                              <p className="text-sm font-medium text-foreground">{t('bookingDetails.signedContractUploaded')}</p>
                              <p className="text-xs text-muted-foreground">
                                {booking.contract_status === 'pending_review' 
                                  ? t('bookingDetails.underReviewByTeam')
                                  : t('bookingDetails.approved')}
                              </p>
                            </div>
                            <a 
                              href={booking.signed_contract_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {t('bookingDetails.view')}
                            </a>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleSignedContractUpload}
                              className="hidden"
                              id="signed-contract-upload"
                              disabled={isUploading}
                            />
                            <label 
                              htmlFor="signed-contract-upload"
                              className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                            >
                              {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                  <span className="text-sm font-medium text-foreground">{t('bookingDetails.clickToUpload')}</span>
                                  <span className="text-xs text-muted-foreground mt-1">{t('bookingDetails.pdfOrImage')}</span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {booking.contract_status === 'approved' && (
                    <div className={`flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="text-sm font-medium text-foreground">{t('bookingDetails.contractApproved')}</p>
                        <p className="text-xs text-muted-foreground">{t('bookingDetails.rentalReadyToProceed')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancel Booking Button - Only for non-cancelled, upcoming bookings */}
              {booking.status !== 'cancelled' && booking.status !== 'completed' && !isPastBooking(booking.return_date) && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    className={`w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Booking
                  </Button>
                </div>
              )}

              {/* Show cancellation info if cancelled */}
              {booking.status === 'cancelled' && booking.cancellation_reason && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="font-medium text-destructive">Booking Cancelled</p>
                      <p className="text-sm text-muted-foreground mt-1">Reason: {booking.cancellation_reason}</p>
                      {booking.cancelled_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Cancelled on {format(new Date(booking.cancelled_at), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <XCircle className="h-5 w-5 text-destructive" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Please tell us why you want to cancel this booking. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              {CANCELLATION_REASONS.map((reason) => (
                <div key={reason.id} className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label htmlFor={reason.id} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {cancelReason === 'other' && (
              <Textarea
                placeholder="Please specify your reason..."
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                className="min-h-[80px]"
              />
            )}
          </div>

          <DialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
                setCustomCancelReason('');
              }}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling || !cancelReason || (cancelReason === 'other' && !customCancelReason.trim())}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetails;
