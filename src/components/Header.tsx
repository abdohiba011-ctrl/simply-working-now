import { useState, useEffect, memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe, User, LogOut, Settings, Lock, Building2, Calendar as CalendarIcon, MoreHorizontal, Users, Phone, Shield, MapPin, Bell, ShieldCheck, LayoutDashboard, BadgeCheck, Tag, ShoppingBag, Bike, Receipt, Wrench, MessageCircle, Wallet } from "lucide-react";
import { useRenterWallet } from "@/hooks/useRenterWallet";
import logoLight from "@/assets/motonita-logo.svg";
import logoDark from "@/assets/motonita-logo-dark.svg";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthStore, readCachedIsAdmin } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Header = memo(() => {
  const { theme } = useTheme();
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Removed showCopied state - no longer needed after promo banner removal
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const storeUser = useAuthStore((s) => s.user);
  const storeIsAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeIsLoading = useAuthStore((s) => s.isLoading);
  const checkAuthStore = useAuthStore((s) => s.checkAuth);
  const switchRoleStore = useAuthStore((s) => s.switchRole);

  // Roles are "ready" once both stores have either resolved or hydrated a
  // user. Until then, we render neutral placeholders for role-specific
  // buttons to avoid flicker (e.g. agency accounts briefly seeing the
  // renter wallet button on first paint).
  const rolesReady =
    !authLoading && (!isAuthenticated || (!!storeUser && !storeIsLoading));

  // Agency takes precedence — once we know the user has the agency role
  // we lock the UI into agency-mode and never show renter widgets, even
  // if `currentRole` is briefly stale.
  const isBusiness =
    rolesReady &&
    (hasRole('agency') || hasRole('business') || !!storeUser?.roles?.agency?.active);
  // Combine live role check with cached admin flag so the Admin button shows
  // instantly on refresh, even before user_roles finishes loading.
  const isAdmin =
    (rolesReady && hasRole('admin')) ||
    (isAuthenticated && readCachedIsAdmin(user?.id));
  // A user counts as a renter (and so should see the wallet/credits)
  // whenever they have the renter role active — even if they are also admin.
  // We only hide the renter wallet when the user is acting purely as a business/agency.
  const isRenter =
    rolesReady && isAuthenticated && !isBusiness && (hasRole('renter') || !isAdmin);
  const hasAgencyRole = isBusiness;
  const handleSwitchToAgency = useCallback(() => {
    switchRoleStore("agency");
    setIsMenuOpen(false);
    navigate("/agency/agency-center");
  }, [switchRoleStore, navigate]);
  const { balance: renterBalance, currency: renterCurrency, isLoading: renterWalletLoading } = useRenterWallet();

  // Track scroll position for dynamic menu positioning
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40); // 40px = promo banner height
    };
    
    // Defer initial check to next frame to avoid forced reflow during render
    requestAnimationFrame(handleScroll);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user profile for avatar and notification count
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUnreadNotifications();
      fetchUnreadMessages();
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && !authLoading && !storeIsAuthenticated && !storeIsLoading) {
      checkAuthStore();
    }
  }, [authLoading, checkAuthStore, isAuthenticated, storeIsAuthenticated, storeIsLoading]);

  // Realtime: bump unread message count when a new message arrives in any of
  // the user's bookings.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`header-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        () => fetchUnreadMessages(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "booking_messages" },
        () => fetchUnreadMessages(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [isVerified, setIsVerified] = useState(false);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, name, is_verified')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setAvatarUrl(data.avatar_url);
        setUserName(data.name || '');
        setIsVerified(data.is_verified || false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    
    try {
      // Fetch both notification count AND verification status to include virtual notification
      const [notifResult, profileResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('profiles')
          .select('is_verified')
          .eq('user_id', user.id)
          .single()
      ]);

      if (notifResult.error) throw notifResult.error;
      
      let count = notifResult.count || 0;
      
      // Add 1 for verification notification if user is not verified
      if (!profileResult.error && profileResult.data && !profileResult.data.is_verified) {
        count += 1;
      }
      
      // Play notification sound if count increased
      if (count > unreadNotifications && unreadNotifications > 0) {
        playNotificationSound();
      }
      
      setUnreadNotifications(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user) return;
    try {
      // Get bookings owned by this user
      const { data: bks } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", user.id);
      const ids = (bks || []).map((b: { id: string }) => b.id);
      if (ids.length === 0) {
        setUnreadMessages(0);
        return;
      }
      const { count } = await supabase
        .from("booking_messages")
        .select("*", { count: "exact", head: true })
        .in("booking_id", ids)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnreadMessages(count || 0);
    } catch (e) {
      console.error("Error fetching unread messages:", e);
    }
  };

  const playNotificationSound = useCallback(() => {
    try {
      // Create a more noticeable notification sound
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Three ascending beeps for better audibility
      const frequencies = [660, 880, 1100];
      const beepDuration = 0.15;
      const gap = 0.08;
      
      frequencies.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = now + i * (beepDuration + gap);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + beepDuration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + beepDuration);
      });
      
      // Also trigger vibration for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('Could not play notification sound:', error);
    }
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchUnreadNotifications();
      fetchUnreadMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, unreadNotifications]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setIsMenuOpen(false);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/");
  };

  // handlePromoClick removed - no longer needed after promo banner removal

  const getInitials = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <>
      {/* Sticky trilingual announcement banner (replaces the old marketing banner) */}
      <AnnouncementBanner />

      {/* Header - sticky independently */}
      <header className="sticky top-0 z-[100] w-full bg-card/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo with crossfade transition */}
          <Link to="/" className="flex items-center gap-2">
            <div key={theme} className="relative h-10 w-[120px]">
              {/* Shimmer skeleton - visible while loading */}
              {!logoLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer rounded" />
              )}
              {/* Light mode logo */}
              <img 
                src={logoLight} 
                alt="Motonita Logo" 
                width={166}
                height={40}
                className={cn(
                  "h-10 w-auto absolute transition-opacity duration-200 hover:scale-105",
                  theme === 'dark' ? 'opacity-0' : 'opacity-100',
                  logoLoaded ? '' : 'opacity-0'
                )}
                onLoad={() => setLogoLoaded(true)}
                translate="no" 
              />
              {/* Dark mode logo */}
              <img 
                src={logoDark} 
                alt="Motonita Logo" 
                width={166}
                height={40}
                className={cn(
                  "h-10 w-auto absolute transition-opacity duration-200 hover:scale-105",
                  theme === 'dark' ? 'opacity-100' : 'opacity-0',
                  logoLoaded ? '' : 'opacity-0'
                )}
                onLoad={() => setLogoLoaded(true)}
                translate="no" 
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              {t('header.home')}
            </Link>
            <Link to="/affiliate" className="text-foreground hover:text-primary transition-colors font-medium">
              {t('header.affiliate')}
            </Link>
            <Link to="/#faq" className="text-foreground hover:text-primary transition-colors font-medium">
              {t('header.faq')}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  {t('header.more')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[540px] bg-popover/95 backdrop-blur-sm border shadow-lg z-[200] p-4">
                <div className="grid grid-cols-3 gap-3">
                  <Link to="/about" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <Users className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-center">{t('header.aboutUs')}</span>
                  </Link>
                  <Link to="/fixers" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <Wrench className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-center">{t('header.fixers')}</span>
                  </Link>
                  <Link to="/contact" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <Phone className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-center">{t('header.contactUs')}</span>
                  </Link>
                  <Link to="/booking-fee" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <Receipt className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-center">{t('header.bookingFee')}</span>
                  </Link>
                  <Link to="/agencies" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <Building2 className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-center">{t('header.agencies')}</span>
                  </Link>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg opacity-60 cursor-not-allowed">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-center text-muted-foreground">{t('header.marketplace')}<br/><span className="text-red-500 font-semibold">{t('header.comingSoon')}</span></span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg opacity-60 cursor-not-allowed">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-center text-muted-foreground">{t('header.gpsTracking')}<br/><span className="text-red-500 font-semibold">{t('header.comingSoon')}</span></span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Select value={language} onValueChange={(value: 'en' | 'fr' | 'ar') => setLanguage(value)}>
              <SelectTrigger className="w-[120px]" aria-label="Select language">
                <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-sm border shadow-lg z-[200]">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
            
            {isAuthenticated ? (
              <>
                {isRenter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5 rounded-full px-3 font-semibold"
                    aria-label={t('header.credits') || 'Credits'}
                    onClick={() => navigate("/billing")}
                  >
                    <Wallet className="h-4 w-4 text-primary" />
                    {renterWalletLoading ? (
                      <span className="inline-block h-3 w-10 animate-pulse rounded bg-muted" />
                    ) : (
                      <span className="tabular-nums">
                        {Math.round(renterBalance)} <span className="text-xs font-normal text-muted-foreground">{renterCurrency}</span>
                      </span>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10 p-0 relative"
                  aria-label={t('header.messages')}
                  onClick={() => navigate("/inbox")}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 p-0 relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Verified Badge - Blue checkmark like Instagram - positioned slightly outside */}
                    {isVerified && (
                      <div className="absolute -bottom-1 -left-1 bg-blue-500 rounded-full p-0.5">
                        <BadgeCheck className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-sm border shadow-lg z-[200]">
                  <DropdownMenuLabel>{t('header.myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/booking-history")}>
                    <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.bookingHistory')}
                  </DropdownMenuItem>
                  {isRenter && (
                    <DropdownMenuItem onClick={() => navigate("/billing")}>
                      <Wallet className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                      {t('header.credits') || 'Credits'} · {Math.round(renterBalance)} {renterCurrency}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/inbox")} className="relative">
                    <MessageCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.messages')}
                    {unreadMessages > 0 && (
                      <span className="ltr:ml-auto rtl:mr-auto h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notifications")} className="relative">
                    <Bell className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.notifications')}
                    {unreadNotifications > 0 && (
                      <span className="ltr:ml-auto rtl:mr-auto h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/change-password")}>
                    <Lock className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.changePassword')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin/panel")}>
                        <LayoutDashboard className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        {t('header.adminPanel')}
                      </DropdownMenuItem>
                    </>
                  )}
                  {isBusiness && (
                    <DropdownMenuItem onClick={() => navigate("/business-dashboard")}>
                      <Building2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                      {t('header.businessDashboard')}
                    </DropdownMenuItem>
                  )}
                  {hasAgencyRole && (
                    <DropdownMenuItem onClick={handleSwitchToAgency}>
                      <Building2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                      Switch to business
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogoutClick}>
                    <LogOut className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('header.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  {t('header.login')}
                </Button>
                <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                  {t('header.signup')}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button - Always shows Menu icon, X is inside panel */}
          <button
            className="md:hidden p-2 -mr-2 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            aria-label="Toggle menu"
            type="button"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        </div>
      </header>

      {/* Mobile Menu - Full screen overlay */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background z-[9999] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with logo and close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link to="/" onClick={() => setIsMenuOpen(false)}>
              <div key={theme} className="relative h-10 w-[120px]">
                {/* Light mode logo */}
                <img 
                  src={logoLight} 
                  alt="Motonita" 
                  className={cn(
                    "h-10 w-auto absolute transition-opacity duration-200 hover:scale-105",
                    theme === 'dark' ? 'opacity-0' : 'opacity-100'
                  )}
                  translate="no" 
                />
                {/* Dark mode logo */}
                <img 
                  src={logoDark} 
                  alt="Motonita" 
                  className={cn(
                    "h-10 w-auto absolute transition-opacity duration-200 hover:scale-105",
                    theme === 'dark' ? 'opacity-100' : 'opacity-0'
                  )}
                  translate="no" 
                />
              </div>
            </Link>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>
          </div>
          
          {/* Menu content - scrollable */}
          <nav className="flex-1 overflow-y-auto flex flex-col gap-2 pt-2 pb-4">
              {/* Home - stays at top */}
              <Link 
                to="/" 
                className="text-foreground transition-colors font-medium py-3 px-4 text-base rounded hover:bg-muted min-h-[44px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('header.home')}
              </Link>
              
              {/* Divider */}
              <div className="border-t mx-4 my-2" />
              
              {/* Language Selection */}
              <div className="px-4">
                <Select value={language} onValueChange={(value: 'en' | 'fr' | 'ar') => setLanguage(value)}>
                  <SelectTrigger className="h-11 text-base">
                    <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover backdrop-blur-sm border shadow-lg z-[10000]">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Account Section */}
              {isAuthenticated ? (
                <>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/profile"); setIsMenuOpen(false); }}>
                    <User className="h-5 w-5" />
                    {t('header.profile')}
                  </Button>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/booking-history"); setIsMenuOpen(false); }}>
                    <CalendarIcon className="h-5 w-5" />
                    {t('header.bookingHistory')}
                  </Button>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2 relative" onClick={() => { navigate("/inbox"); setIsMenuOpen(false); }}>
                    <MessageCircle className="h-5 w-5" />
                    {t('header.messages')}
                    {unreadMessages > 0 && (
                      <span className="ltr:ml-auto rtl:mr-auto h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2 relative" onClick={() => { navigate("/notifications"); setIsMenuOpen(false); }}>
                    <Bell className="h-5 w-5" />
                    {t('header.notifications')}
                    {unreadNotifications > 0 && (
                      <span className="ltr:ml-auto rtl:mr-auto h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/settings"); setIsMenuOpen(false); }}>
                    <Settings className="h-5 w-5" />
                    {t('header.settings')}
                  </Button>
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/change-password"); setIsMenuOpen(false); }}>
                    <Lock className="h-5 w-5" />
                    {t('header.changePassword')}
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/admin/panel"); setIsMenuOpen(false); }}>
                      <LayoutDashboard className="h-5 w-5" />
                      {t('header.adminPanel')}
                    </Button>
                  )}
                  {isBusiness && (
                    <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={() => { navigate("/business-dashboard"); setIsMenuOpen(false); }}>
                      <Building2 className="h-5 w-5" />
                      {t('header.businessDashboard')}
                    </Button>
                  )}
                  {hasAgencyRole && (
                    <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={handleSwitchToAgency}>
                      <Building2 className="h-5 w-5" />
                      Switch to business
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="justify-start gap-2 text-base min-h-[44px] mx-2" onClick={handleLogoutClick}>
                    <LogOut className="h-5 w-5" />
                    {t('header.logout')}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-2">
                  <Button variant="outline" size="lg" className="text-base min-h-[48px] font-semibold" onClick={() => { navigate("/auth"); setIsMenuOpen(false); }}>
                    {t('header.login')}
                  </Button>
                  <Button variant="hero" size="lg" className="text-base min-h-[48px] font-semibold" onClick={() => { navigate("/auth?mode=signup"); setIsMenuOpen(false); }}>
                    {t('header.signup')}
                  </Button>
                </div>
              )}
              
              {/* Divider before marketing links */}
              <div className="border-t mx-4 my-2" />
              
              {/* Marketing Links - moved to bottom */}
              <Link 
                to="/affiliate" 
                className="text-foreground transition-colors font-medium py-3 px-4 text-base rounded hover:bg-muted min-h-[44px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('header.affiliate')}
              </Link>
              
              <Link 
                to="/#faq" 
                className="text-foreground transition-colors font-medium py-3 px-4 text-base rounded hover:bg-muted min-h-[44px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('header.faq')}
              </Link>
              
              {/* More Dropdown */}
              <details className="group">
                <summary className="text-foreground transition-colors font-medium py-3 px-4 text-base rounded hover:bg-muted min-h-[44px] flex items-center justify-between cursor-pointer list-none">
                  <span className="flex items-center gap-2">
                    <MoreHorizontal className="h-5 w-5" />
                    {t('header.more')}
                  </span>
                  <svg className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="ltr:pl-4 rtl:pr-4 space-y-1 mt-1">
                  <Link to="/about" className="text-foreground transition-colors font-medium py-3 px-4 text-sm rounded hover:bg-muted min-h-[44px] flex items-center" onClick={() => setIsMenuOpen(false)}>{t('header.aboutUs')}</Link>
                  <Link to="/fixers" className="text-foreground transition-colors font-medium py-3 px-4 text-sm rounded hover:bg-muted min-h-[44px] flex items-center" onClick={() => setIsMenuOpen(false)}>{t('header.fixers')}</Link>
                  <Link to="/contact" className="text-foreground transition-colors font-medium py-3 px-4 text-sm rounded hover:bg-muted min-h-[44px] flex items-center" onClick={() => setIsMenuOpen(false)}>{t('header.contactUs')}</Link>
                  <Link to="/booking-fee" className="text-foreground transition-colors font-medium py-3 px-4 text-sm rounded hover:bg-muted min-h-[44px] flex items-center" onClick={() => setIsMenuOpen(false)}>{t('header.bookingFee')}</Link>
                  <Link to="/agencies" className="text-foreground transition-colors font-medium py-3 px-4 text-sm rounded hover:bg-muted min-h-[44px] flex items-center gap-2" onClick={() => setIsMenuOpen(false)}><Building2 className="h-4 w-4" />{t('header.agencies')}</Link>
                  <div className="text-muted-foreground py-3 px-4 text-sm rounded min-h-[44px] flex items-center opacity-60">{t('header.marketplace')} <span className="text-red-500 font-semibold ltr:ml-2 rtl:mr-2">{t('header.comingSoon')}</span></div>
                  
                  <div className="text-muted-foreground py-3 px-4 text-sm rounded min-h-[44px] flex items-center opacity-60">{t('header.gpsTracking')} <span className="text-red-500 font-semibold ltr:ml-2 rtl:mr-2">{t('header.comingSoon')}</span></div>
                </div>
              </details>
            </nav>
          </div>
      )}

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog 
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
});

Header.displayName = 'Header';
