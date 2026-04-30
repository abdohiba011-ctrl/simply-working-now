import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield, ChevronRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsSectionProps {
  isVerified: boolean;
  onVerifyClick: () => void;
}

export const NotificationsSection = ({ isVerified, onVerifyClick }: NotificationsSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

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

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'verification') {
      onVerifyClick();
    } else if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Always show verification notification if not verified
  const verificationNotification = !isVerified ? {
    id: 'verify-account',
    title: 'Verify Your Account',
    message: 'Please verify your account to rent a motorbike. Click here to start verification.',
    type: 'verification',
    action_url: null,
    is_read: false,
    created_at: new Date().toISOString()
  } : null;

  const allNotifications = verificationNotification 
    ? [verificationNotification, ...notifications]
    : notifications;

  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} new</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allNotifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p>All caught up! No new notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                  notification.is_read 
                    ? 'bg-muted/30 border-border' 
                    : 'bg-primary/5 border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    notification.type === 'verification' 
                      ? 'bg-yellow-500/20' 
                      : 'bg-primary/20'
                  }`}>
                    {notification.type === 'verification' ? (
                      <Shield className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <Bell className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">{notification.title}</h4>
                      {!notification.is_read && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
