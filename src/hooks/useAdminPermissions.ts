import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminTabPermission = 
  | "bookings" 
  | "fleet" 
  | "locations" 
  | "cities" 
  | "clients" 
  | "individual_owners" 
  | "rental_shops" 
  | "analytics";

export interface AdminPermissions {
  bookings: boolean;
  fleet: boolean;
  locations: boolean;
  cities: boolean;
  clients: boolean;
  individual_owners: boolean;
  rental_shops: boolean;
  analytics: boolean;
}

const DEFAULT_PERMISSIONS: AdminPermissions = {
  bookings: false,
  fleet: false,
  locations: false,
  cities: false,
  clients: false,
  individual_owners: false,
  rental_shops: false,
  analytics: false,
};

const FULL_PERMISSIONS: AdminPermissions = {
  bookings: true,
  fleet: true,
  locations: true,
  cities: true,
  clients: true,
  individual_owners: true,
  rental_shops: true,
  analytics: true,
};

export const useAdminPermissions = () => {
  const { user, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [employeeRole, setEmployeeRole] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user || !hasRole('admin')) {
      setPermissions(DEFAULT_PERMISSIONS);
      setIsLoading(false);
      return;
    }

    try {
      // Check if user is a super admin first
      const { data: superAdminData } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      
      if (superAdminData) {
        setIsSuperAdmin(true);
        setIsFullAdmin(true);
        setEmployeeRole('super_admin');
        setPermissions(FULL_PERMISSIONS);
        setIsLoading(false);
        return;
      }

      // Fetch from admin_employees table
      const { data: adminEmployee, error } = await supabase
        .from('admin_employees')
        .select('role, is_super_admin, permissions')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no record found, they might be a new admin - grant full access
        if (error.code === 'PGRST116') {
          setIsFullAdmin(true);
          setEmployeeRole('full_admin');
          setPermissions(FULL_PERMISSIONS);
        } else {
          console.error('Error fetching admin permissions:', error);
          setPermissions(DEFAULT_PERMISSIONS);
        }
        setIsLoading(false);
        return;
      }

      if (adminEmployee) {
        const role = adminEmployee.role;
        setEmployeeRole(role);
        
        // Full admins and super admins get all permissions
        if (role === 'full_admin' || adminEmployee.is_super_admin) {
          setIsFullAdmin(true);
          setIsSuperAdmin(adminEmployee.is_super_admin || false);
          setPermissions(FULL_PERMISSIONS);
        } else {
          // Support role - use stored permissions
          const storedPermissions = adminEmployee.permissions as unknown as AdminPermissions | null;
          if (storedPermissions && typeof storedPermissions === 'object') {
            setPermissions({
              bookings: Boolean(storedPermissions.bookings),
              fleet: Boolean(storedPermissions.fleet),
              locations: Boolean(storedPermissions.locations),
              cities: Boolean(storedPermissions.cities),
              clients: Boolean(storedPermissions.clients),
              individual_owners: Boolean(storedPermissions.individual_owners),
              rental_shops: Boolean(storedPermissions.rental_shops),
              analytics: Boolean(storedPermissions.analytics),
            });
          } else {
            setPermissions(DEFAULT_PERMISSIONS);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setIsLoading(false);
    }
  }, [user, hasRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((tab: AdminTabPermission): boolean => {
    if (isSuperAdmin || isFullAdmin) return true;
    return permissions[tab] || false;
  }, [permissions, isSuperAdmin, isFullAdmin]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    hasPermission,
    isLoading,
    isSuperAdmin,
    isFullAdmin,
    employeeRole,
    refetch,
  };
};
