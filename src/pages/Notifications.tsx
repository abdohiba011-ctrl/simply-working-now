import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationSkeleton } from "@/components/ui/bike-skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  MessageSquare,
  Phone,
  CreditCard,
  Bike,
  ExternalLink,
  Settings,
  User,
  FileText
} from "lucide-react";
import { UnifiedVerificationModal } from "@/components/UnifiedVerificationModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

// Action button configuration based on notification type and action_url
// Returns null if button should not be shown (e.g., user already verified)
const getActionConfig = (notification: Notification, isVerified: boolean, hasPhone: boolean) => {
  const { type, action_url, message, title } = notification;
  const lowerMessage = message.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // IMPORTANT: Check success/verified FIRST before generic "verif" pattern
  // For verified success notifications, show disabled "Completed" state
  if (type === 'success' && (lowerMessage.includes('verified') || lowerTitle.includes('verified'))) {
    return {
      label: 'Start Booking',
      icon: Bike,
      variant: 'default' as const,
      action: '/',
      disabled: false
    };
  }

  // Don't show phone button if user already has phone
  if (action_url?.includes('#phone') || lowerMessage.includes('phone') || lowerTitle.includes('phone')) {
    if (hasPhone) {
      return {
        label: 'Completed',
        icon: CheckCircle,
        variant: 'outline' as const,
        action: null,
        disabled: true
      };
    }
    return {
      label: 'Update Phone Number',
      icon: Phone,
      variant: 'default' as const,
      action: action_url || '/profile#phone',
      disabled: false
    };
  }

  // Don't show verification button if user is already verified
  if (action_url?.includes('#verification') || lowerMessage.includes('verif') || lowerTitle.includes('verif')) {
    if (isVerified) {
      return {
        label: 'Already Verified',
        icon: CheckCircle,
        variant: 'outline' as const,
        action: null,
        disabled: true
      };
    }
    return {
      label: 'Complete Verification',
      icon: CreditCard,
      variant: 'default' as const,
      action: action_url || '/profile#verification',
      disabled: false
    };
  }

  if (lowerMessage.includes('booking') || lowerTitle.includes('booking')) {
    return {
      label: 'View Bookings',
      icon: Bike,
      variant: 'default' as const,
      action: '/booking-history',
      disabled: false
    };
  }

  if (lowerMessage.includes('document') || lowerTitle.includes('document')) {
    if (isVerified) {
      return {
        label: 'Completed',
        icon: CheckCircle,
        variant: 'outline' as const,
        action: null,
        disabled: true
      };
    }
    return {
      label: 'Upload Documents',
      icon: FileText,
      variant: 'default' as const,
      action: '/profile#verification',
      disabled: false
    };
  }

  if (lowerMessage.includes('profile') || lowerTitle.includes('profile')) {
    return {
      label: 'Go to Profile',
      icon: User,
      variant: 'default' as const,
      action: '/profile',
      disabled: false
    };
  }

  if (lowerMessage.includes('settings') || lowerTitle.includes('settings')) {
    return {
      label: 'Open Settings',
      icon: Settings,
      variant: 'default' as const,
      action: '/settings',
      disabled: false
    };
  }

  // Default action based on action_url
  if (action_url) {
    return {
      label: 'Take Action',
      icon: ExternalLink,
      variant: 'outline' as const,
      action: action_url,
      disabled: false
    };
  }

  return null;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const [profileResult, notificationsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_verified, phone, verification_status')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (!profileResult.error && profileResult.data) {
        setIsVerified(profileResult.data.is_verified || false);
        setHasPhone(!!profileResult.data.phone);
        setVerificationStatus(profileResult.data.verification_status || 'not_started');
      }

      if (!notificationsResult.error && notificationsResult.data) {
        setNotifications(notificationsResult.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user || notificationId.startsWith('system-')) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleActionClick = (notification: Notification, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    markAsRead(notification.id);
    
    const actionConfig = getActionConfig(notification, isVerified, hasPhone);
    const actionUrl = actionConfig?.action || notification.action_url;
    const lowerMessage = notification.message.toLowerCase();
    const lowerTitle = notification.title.toLowerCase();
    
    // If it's a success/verified notification, navigate to home instead of opening modal
    if (notification.type === 'success' && (lowerMessage.includes('verified') || lowerTitle.includes('verified'))) {
      navigate('/');
      setShowDetailsDialog(false);
      return;
    }
    
    // Don't open verification modal if user is already verified
    if (isVerified && (actionUrl?.includes('#verification') || lowerMessage.includes('verif') || lowerTitle.includes('verif'))) {
      toast.success("You're already verified! Start booking now.");
      navigate('/');
      setShowDetailsDialog(false);
      return;
    }
    
    // Navigate to verification page instead of opening modal
    if (actionUrl?.includes('#verification') || lowerMessage.includes('verif') || lowerTitle.includes('verif')) {
      navigate('/verification');
      setShowDetailsDialog(false);
      return;
    }
    
    // Don't navigate if user already has phone
    if (hasPhone && (actionUrl?.includes('#phone') || lowerMessage.includes('phone') || lowerTitle.includes('phone'))) {
      toast.success("Phone number already saved!");
      setShowDetailsDialog(false);
      return;
    }
    
    // Navigate to verification page for phone updates too
    if (actionUrl?.includes('#phone') || lowerMessage.includes('phone') || lowerTitle.includes('phone')) {
      navigate('/verification');
      setShowDetailsDialog(false);
      return;
    }
    
    if (actionUrl) {
      if (actionUrl.includes('#')) {
        const [path, hash] = actionUrl.split('#');
        navigate(path);
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
          }
        }, 300);
      } else {
        navigate(actionUrl);
      }
    }
    
    setShowDetailsDialog(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Show details dialog for admin/support messages or notifications with longer messages
    if (notification.type === 'admin' || notification.type === 'support' || notification.type === 'rejection' || notification.message.length > 100) {
      setSelectedNotification(notification);
      setShowDetailsDialog(true);
      return;
    }
    
    // For simple notifications with actions, navigate directly
    handleActionClick(notification);
  };

  const handleCloseDialog = () => {
    if (selectedNotification) {
      markAsRead(selectedNotification.id);
    }
    setShowDetailsDialog(false);
    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification':
        return <Shield className="h-5 w-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
      case 'rejection':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'admin':
      case 'support':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'phone':
        return <Phone className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case 'verification':
        return 'border-l-yellow-500';
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
      case 'rejection':
        return 'border-l-destructive';
      case 'admin':
      case 'support':
        return 'border-l-blue-500';
      case 'phone':
        return 'border-l-blue-500';
      default:
        return 'border-l-border';
    }
  };

  // System notifications for missing profile data
  // Only show verification notification if NOT verified AND NOT pending review
  // Only show phone notification if no phone AND NOT verified AND NOT pending review
  const systemNotifications: Notification[] = [];
  
  const shouldShowVerificationNotification = !isVerified && verificationStatus !== 'pending_review';
  const shouldShowPhoneNotification = !hasPhone && !isVerified && verificationStatus !== 'pending_review';
  
  if (shouldShowPhoneNotification) {
    systemNotifications.push({
      id: 'system-phone',
      title: 'Add Your Phone Number',
      message: 'Please add your phone number so we can contact you about your bookings.',
      type: 'phone',
      action_url: '/profile#phone',
      is_read: false,
      created_at: new Date().toISOString()
    });
  }
  
  if (shouldShowVerificationNotification) {
    systemNotifications.push({
      id: 'system-verify',
      title: 'Verify Your Account',
      message: 'Complete your ID verification to start renting motorbikes. This only takes a few minutes.',
      type: 'verification',
      action_url: '/profile#verification',
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  // Combine all notifications
  const allNotifications = [...systemNotifications, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <Badge className="bg-destructive text-white">{unreadCount} new</Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : allNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Notifications"
              description="You're all caught up! We'll notify you about important updates, bookings, and account activity here."
              actionLabel="Browse Motorbikes"
              onAction={() => navigate('/')}
            />
          ) : (
            <div className="space-y-3">
              {allNotifications.map((notification) => {
                const actionConfig = getActionConfig(notification, isVerified, hasPhone);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border border-l-4 bg-background transition-all hover:shadow-md ${
                      getNotificationBorderColor(notification.type)
                    } ${
                      notification.is_read ? 'opacity-70' : 'shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-muted shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge className="bg-destructive text-white text-xs shrink-0">New</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Action Button */}
                          {actionConfig && (
                            <Button
                              size="sm"
                              variant={actionConfig.variant}
                              onClick={(e) => !actionConfig.disabled && handleActionClick(notification, e)}
                              className={`gap-2 ${actionConfig.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                              disabled={actionConfig.disabled}
                            >
                              <actionConfig.icon className="h-4 w-4" />
                              {actionConfig.label}
                            </Button>
                          )}
                          
                          {/* View Details for admin/support messages */}
                          {(notification.type === 'admin' || notification.type === 'support' || notification.type === 'rejection') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedNotification(notification);
                                setShowDetailsDialog(true);
                              }}
                              className="gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              View Message
                            </Button>
                          )}
                          
                          {/* Timestamp */}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(notification.created_at).toLocaleDateString()} at{' '}
                            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      

      {/* Notification Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-background border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification && (
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedNotification.created_at).toLocaleDateString()} at{' '}
                  {new Date(selectedNotification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotification?.message}
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedNotification && getActionConfig(selectedNotification, isVerified, hasPhone) && (
              <Button 
                onClick={() => handleActionClick(selectedNotification)}
                className="gap-2 w-full sm:w-auto"
              >
                {(() => {
                  const config = getActionConfig(selectedNotification, isVerified, hasPhone);
                  if (!config) return null;
                  return (
                    <>
                      <config.icon className="h-4 w-4" />
                      {config.label}
                    </>
                  );
                })()}
              </Button>
            )}
            <Button variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Modal */}
      <UnifiedVerificationModal 
        isOpen={showVerificationModal} 
        onComplete={() => {
          setShowVerificationModal(false);
          fetchData();
        }} 
      />
    </div>
  );
};

export default Notifications;