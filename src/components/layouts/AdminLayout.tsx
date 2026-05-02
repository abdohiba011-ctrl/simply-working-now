import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Home, Briefcase, Shield, Repeat } from "lucide-react";
import logo from "@/assets/motonita-logo.svg";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout, hasRole } = useAuth();
  const storeUser = useAuthStore((s) => s.user);
  const switchRole = useAuthStore((s) => s.switchRole);
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const hasAdmin = hasRole("admin");
  const hasAgency = !!storeUser?.roles.agency?.active;
  // Agency-only accounts cannot use renter mode (product rule). Renter
  // destination is offered to anyone whose account is not agency-active.
  const canGoRenter = !hasAgency;

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setAvatarUrl(data.avatar_url);
        setUserName(data.name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const getInitials = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/");
  };

  const goRenterSite = () => {
    if (storeUser && !hasAgency) {
      // Make sure the store is in renter mode for the public site experience.
      try { switchRole("renter"); } catch { /* ignore */ }
    }
    navigate("/");
  };

  const goAgencyDashboard = () => {
    if (storeUser && hasAgency) {
      try { switchRole("agency"); } catch { /* ignore */ }
    }
    navigate("/agency/agency-center");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Admin Header - Compact, neutral colors */}
      <header className="sticky top-0 z-[100] w-full bg-background border-b border-border">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/admin/panel" className="flex items-center gap-2">
              <img src={logo} alt="Motonita Logo" className="h-8 w-auto" />
              <span className="font-bold text-sm hidden sm:inline bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
                Motonita Admin
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Role Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    <span className="hidden sm:inline">Switch view</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border-border shadow-lg z-[200]">
                  <DropdownMenuLabel>Switch interface</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="opacity-100">
                    <Shield className="mr-2 h-4 w-4 text-primary" />
                    Admin Panel
                    <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                  </DropdownMenuItem>
                  {hasAgency && (
                    <DropdownMenuItem onClick={goAgencyDashboard}>
                      <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                      Agency Dashboard
                    </DropdownMenuItem>
                  )}
                  {canGoRenter && (
                    <DropdownMenuItem onClick={goRenterSite}>
                      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                      Renter Site
                    </DropdownMenuItem>
                  )}
                  {!canGoRenter && !hasAgency && (
                    <DropdownMenuItem onClick={() => navigate("/")}>
                      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                      Public Site
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-background border-border shadow-lg z-[200]">
                  <DropdownMenuLabel className="text-foreground font-medium">
                    {userName || "Admin Account"}
                    {user?.email && (
                      <div className="text-[11px] font-normal text-muted-foreground truncate">
                        {user.email}
                      </div>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="text-foreground hover:bg-muted">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    View Profile
                  </DropdownMenuItem>
                  {hasAgency && (
                    <DropdownMenuItem onClick={goAgencyDashboard} className="text-foreground hover:bg-muted">
                      <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                      Agency Dashboard
                    </DropdownMenuItem>
                  )}
                  {canGoRenter && (
                    <DropdownMenuItem onClick={goRenterSite} className="text-foreground hover:bg-muted">
                      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                      Renter Site
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="text-foreground hover:bg-muted">
                    <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Minimal Admin Footer */}
      <footer className="bg-background border-t border-border py-3">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Motonita Maroc. All rights reserved.
          </p>
        </div>
      </footer>

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};
