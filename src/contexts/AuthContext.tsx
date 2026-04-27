import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useAuthStore, writeCachedIsAdmin } from "@/stores/useAuthStore";

// Rate limit configuration
const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 },
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000, lockoutMs: 60 * 60 * 1000 },
};

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
  lockoutUntil: number | null;
}

const STORAGE_KEY_PREFIX = 'auth_rl_';

function getStorageKey(action: 'login' | 'signup', identifier: string): string {
  const hash = btoa(identifier).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `${STORAGE_KEY_PREFIX}${action}_${hash}`;
}

function getRateLimitState(action: 'login' | 'signup', identifier: string): RateLimitState {
  try {
    const key = getStorageKey(action, identifier);
    const stored = localStorage.getItem(key);
    if (stored) {
      const state = JSON.parse(stored) as RateLimitState;
      const config = RATE_LIMITS[action];
      if (Date.now() - state.firstAttemptTime > config.windowMs) {
        localStorage.removeItem(key);
        return { attempts: 0, firstAttemptTime: 0, lockoutUntil: null };
      }
      if (state.lockoutUntil && Date.now() > state.lockoutUntil) {
        localStorage.removeItem(key);
        return { attempts: 0, firstAttemptTime: 0, lockoutUntil: null };
      }
      return state;
    }
  } catch { /* ignore */ }
  return { attempts: 0, firstAttemptTime: 0, lockoutUntil: null };
}

function setRateLimitState(action: 'login' | 'signup', identifier: string, state: RateLimitState): void {
  try {
    localStorage.setItem(getStorageKey(action, identifier), JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearRateLimitState(action: 'login' | 'signup', identifier: string): void {
  try {
    localStorage.removeItem(getStorageKey(action, identifier));
  } catch { /* ignore */ }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRoles: string[];
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string, role: "renter" | "agency") => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  refreshRoles: () => Promise<string[]>;
  isRefreshingRoles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRoles, setIsRefreshingRoles] = useState(false);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const fetchUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      const roles = data?.map(r => r.role) || [];
      writeCachedIsAdmin(userId, roles.includes('admin'));
      setUserRoles(roles);
      return roles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
      return [];
    }
  };

  const refreshRoles = useCallback(async (): Promise<string[]> => {
    const u = userRef.current;
    if (!u) {
      setUserRoles([]);
      return [];
    }
    setIsRefreshingRoles(true);
    try {
      const roles = await fetchUserRoles(u.id);
      // Also re-sync the parallel zustand store so the avatar dropdown reflects roles immediately.
      try {
        await useAuthStore.getState().checkAuth();
      } catch (e) {
        console.warn('useAuthStore.checkAuth failed during refreshRoles', e);
      }
      return roles;
    } finally {
      setIsRefreshingRoles(false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoading(true);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user roles before allowing role-gated UI/routes to render.
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserRoles(session.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setUserRoles([]);
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
      } else {
        setUserRoles([]);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check and record rate limit for auth actions
  const checkAndRecordRateLimit = useCallback((
    action: 'login' | 'signup', 
    email: string, 
    isFailedAttempt: boolean
  ): { allowed: boolean; message?: string } => {
    const config = RATE_LIMITS[action];
    const state = getRateLimitState(action, email);
    
    // Check if currently locked out
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
      const lockoutDate = new Date(state.lockoutUntil);
      return {
        allowed: false,
        message: `Too many ${action} attempts. Please try again after ${lockoutDate.toLocaleTimeString()}.`,
      };
    }
    
    if (isFailedAttempt) {
      const newState: RateLimitState = {
        attempts: state.attempts + 1,
        firstAttemptTime: state.firstAttemptTime || Date.now(),
        lockoutUntil: state.lockoutUntil,
      };
      
      if (newState.attempts >= config.maxAttempts) {
        newState.lockoutUntil = Date.now() + config.lockoutMs;
      }
      
      setRateLimitState(action, email, newState);
      
      const remaining = Math.max(0, config.maxAttempts - newState.attempts);
      if (remaining === 0) {
        return {
          allowed: false,
          message: `Too many failed attempts. Please try again later.`,
        };
      }
      if (remaining === 1) {
        return {
          allowed: true,
          message: `Warning: 1 attempt remaining before temporary lockout.`,
        };
      }
    }
    
    return { allowed: true };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    const rateLimitCheck = checkAndRecordRateLimit('login', email, false);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message || 'Too many login attempts');
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const failedCheck = checkAndRecordRateLimit('login', email, true);
      if (failedCheck.message) {
        throw new Error(`${error.message}. ${failedCheck.message}`);
      }
      throw error;
    }
    
    clearRateLimitState('login', email);
    
    if (!rememberMe) {
      sessionStorage.setItem('sessionOnly', 'true');
    } else {
      sessionStorage.removeItem('sessionOnly');
    }

    // Force role hydration before resolving so role-gated UI updates immediately.
    if (signInData?.user) {
      userRef.current = signInData.user;
      await fetchUserRoles(signInData.user.id);
      try { await useAuthStore.getState().checkAuth(); } catch { /* ignore */ }
    }
  };

  const signup = async (email: string, password: string, name: string, role: "renter" | "agency") => {
    const rateLimitCheck = checkAndRecordRateLimit('signup', email, false);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message || 'Too many signup attempts');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      const failedCheck = checkAndRecordRateLimit('signup', email, true);
      if (failedCheck.message) {
        throw new Error(`${error.message}. ${failedCheck.message}`);
      }
      throw error;
    }
    
    clearRateLimitState('signup', email);

    // Add business role if user selected business account type
    if (data?.user && role === "agency") {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'agency' });
      
      if (roleError) throw roleError;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (role: string): boolean => {
    return userRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAuthenticated: !!user,
      isLoading,
      userRoles,
      login, 
      signup, 
      logout,
      hasRole,
      refreshRoles,
      isRefreshingRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
