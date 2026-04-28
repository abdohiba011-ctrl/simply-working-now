import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
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
import { LogOut, User, Home, Globe, LayoutDashboard, Calendar, Menu, X, ChevronLeft, ChevronRight, Bike } from "lucide-react";
import logo from "@/assets/motonita-logo.svg";
import { cn } from "@/lib/utils";

interface BusinessLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/business-dashboard" },
  { icon: Calendar, label: "Bookings", path: "/business-dashboard/bookings" },
  { icon: Bike, label: "Motorbikes", path: "/business-dashboard/motorbikes" },
];

export const BusinessLayout = ({ children }: BusinessLayoutProps) => {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Enable real-time notifications for business users
  useAdminNotifications();

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
    return 'B';
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Business Header - Compact, neutral colors */}
      <header className="sticky top-0 z-[100] w-full bg-background border-b border-border">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
              </button>
              
              <Link to="/business-dashboard" className="flex items-center gap-2">
                <img src={logo} alt="Motonita Logo" className="h-8 w-auto" />
                <span className="font-bold text-sm hidden sm:inline bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                  Motonita Business
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={(value: 'en' | 'fr') => setLanguage(value)}>
                <SelectTrigger className="w-[90px] h-9 text-xs hidden sm:flex border-border">
                  <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg z-[200]">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>

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
                  <DropdownMenuLabel className="text-foreground font-medium">Business Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="text-foreground hover:bg-muted">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/agency/dashboard")} className="text-foreground hover:bg-muted">
                    <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                    Dashboard
                  </DropdownMenuItem>
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

      <div className="flex flex-1">
        {/* Sidebar - Compact, collapsible, neutral colors */}
        <aside className={cn(
          "fixed md:sticky top-14 left-0 z-50 h-[calc(100vh-3.5rem)] bg-background border-r border-border transition-all duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "w-12" : "w-44"
        )}>
          <nav className="p-1.5 space-y-0.5">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-background text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          
          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex absolute bottom-4 left-0 right-0 mx-2 items-center justify-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>

      {/* Minimal Business Footer */}
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