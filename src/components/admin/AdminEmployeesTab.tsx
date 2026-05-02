import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  Search, 
  UserPlus,
  Trash2,
  UserCog,
  ShieldCheck,
  Crown,
  Shield,
  Mail,
  Calendar,
  Settings2
} from "lucide-react";
import { format } from "date-fns";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
};

interface AdminPermissions {
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

const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  bookings: "Bookings",
  fleet: "Fleet",
  locations: "Locations",
  cities: "Cities",
  clients: "Clients",
  individual_owners: "Individual Owners",
  rental_shops: "Rental Shops",
  analytics: "Analytics",
};

interface AdminEmployee {
  id: string;
  user_id: string;
  role: string;
  employee_role?: string;
  is_super_admin?: boolean;
  created_at: string | null;
  permissions?: AdminPermissions;
  profile?: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const AdminEmployeesTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState<"full_admin" | "support">("support");
  const [newEmployeePermissions, setNewEmployeePermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<AdminEmployee[]>([]);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{id: string; userId: string; isSuperAdmin?: boolean; name?: string} | null>(null);
  
  // Bulk selection state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showBulkPermissionsDialog, setShowBulkPermissionsDialog] = useState(false);
  const [bulkPermissions, setBulkPermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    fetchEmployees();
    checkSuperAdminStatus();
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = employees.filter(emp => 
        emp.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchQuery, employees]);

  const checkSuperAdminStatus = async () => {
    if (!user) return;
    
    // Use server-side function to check super admin status
    const { data, error } = await supabase.rpc('is_super_admin', { _user_id: user.id });
    
    if (!error && data) {
      setCurrentUserIsSuperAdmin(data);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      // Get all users with admin role
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Get admin employees for role type (includes is_super_admin)
      const { data: adminEmployees } = await supabase
        .from('admin_employees')
        .select('*');

      // Get profiles for these users
      const userIds = adminRoles?.map(r => r.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email, avatar_url')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const employeesWithProfiles = adminRoles?.map(role => {
          const adminEmp = adminEmployees?.find(e => e.user_id === role.user_id);
          const profile = profiles?.find(p => p.user_id === role.user_id);
          
          // Parse permissions from JSON
          let permissions: AdminPermissions = DEFAULT_PERMISSIONS;
          if (adminEmp?.permissions && typeof adminEmp.permissions === 'object') {
            const p = adminEmp.permissions as Record<string, unknown>;
            permissions = {
              bookings: Boolean(p.bookings),
              fleet: Boolean(p.fleet),
              locations: Boolean(p.locations),
              cities: Boolean(p.cities),
              clients: Boolean(p.clients),
              individual_owners: Boolean(p.individual_owners),
              rental_shops: Boolean(p.rental_shops),
              analytics: Boolean(p.analytics),
            };
          }
          
          return {
            id: role.id,
            user_id: role.user_id,
            role: 'admin',
            employee_role: adminEmp?.is_super_admin ? 'super_admin' : (adminEmp?.role || 'full_admin'),
            is_super_admin: adminEmp?.is_super_admin || false,
            created_at: role.created_at,
            permissions,
            profile: profile
          };
        }) || [];

        setEmployees(employeesWithProfiles);
        setFilteredEmployees(employeesWithProfiles);
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (error: unknown) {
      toast.error("Failed to load employees");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeEmail) {
      toast.error("Please enter an email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployeeEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setActionLoading(true);
    try {
      // Find user by email — select user_id (auth uid), since user_roles.user_id
      // and admin_employees.user_id store the auth uid, not profiles.id.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', newEmployeeEmail.toLowerCase())
        .maybeSingle();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          toast.error("User not found. The email address doesn't exist in our system. Make sure they have created an account first.");
        } else {
          toast.error(`Database error: ${profileError.message}`);
        }
        return;
      }

      if (!profile) {
        toast.error("User not found. Make sure they have an account first.");
        return;
      }

      // Check if already admin
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('role', 'admin')
        .single();

      if (existingRole) {
        toast.error("This user is already an admin. You cannot add them again.");
        return;
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.user_id,
          role: 'admin'
        });

      if (insertError) {
        toast.error(`Failed to add admin role: ${insertError.message}`);
        throw insertError;
      }

      // Add to admin_employees table with role type and permissions
      const permissionsToSave = newEmployeeRole === 'full_admin' 
        ? {
            bookings: true,
            fleet: true,
            locations: true,
            cities: true,
            clients: true,
            individual_owners: true,
            rental_shops: true,
            analytics: true,
          }
        : newEmployeePermissions;

      const { error: empError } = await supabase
        .from('admin_employees')
        .insert([{
          user_id: profile.user_id,
          role: newEmployeeRole,
          is_super_admin: false,
          permissions: JSON.parse(JSON.stringify(permissionsToSave))
        }]);

      if (empError) {
        console.error('Admin employee insert error:', empError);
        // Don't throw - the main role was added
      }

      // Send notification
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: newEmployeeRole === 'full_admin' ? 'Full Admin Access Granted' : 'Support Access Granted',
        message: newEmployeeRole === 'full_admin' 
          ? 'You have been granted full admin access to the Motonita platform. You can now manage users, bookings, and settings.'
          : 'You have been granted support access to the Motonita platform with limited permissions.',
        type: 'success'
      });

      toast.success("Employee added successfully!");
      setShowAddDialog(false);
      setNewEmployeeEmail("");
      setNewEmployeeRole("support");
      setNewEmployeePermissions(DEFAULT_PERMISSIONS);
      fetchEmployees();
    } catch (error: unknown) {
      console.error('Add employee error:', error);
      toast.error(`Failed to add employee: ${getErrMsg(error) || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEmployee = async (employeeId: string, userId: string, isSuperAdmin?: boolean) => {
    if (userId === user?.id) {
      toast.error("You cannot remove yourself from the admin team.");
      return;
    }

    // Check if trying to remove a super admin (server-side check already done via is_super_admin field)
    if (isSuperAdmin) {
      toast.error("Super admins cannot be removed.");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      // Also remove from admin_employees
      await supabase
        .from('admin_employees')
        .delete()
        .eq('user_id', userId);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Admin Access Revoked',
        message: 'Your admin access to the Motonita platform has been revoked.',
        type: 'warning'
      });

      toast.success("Employee removed successfully");
      fetchEmployees();
    } catch (error: unknown) {
      toast.error(`Failed to remove employee: ${getErrMsg(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'A';
  };

  const getRoleBadge = (role: string | undefined, isSuperAdmin?: boolean) => {
    if (isSuperAdmin) {
      return (
        <Badge className="gap-1 bg-purple-600 text-white">
          <Crown className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    
    if (role === 'full_admin') {
      return (
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Full Admin
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" />
        Support Only
      </Badge>
    );
  };

  const handleOpenPermissions = (employee: AdminEmployee) => {
    setEditingEmployee(employee);
    setNewEmployeePermissions(employee.permissions || DEFAULT_PERMISSIONS);
    setShowPermissionsDialog(true);
  };

  const handleSavePermissions = async () => {
    if (!editingEmployee) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('admin_employees')
        .update({ permissions: JSON.parse(JSON.stringify(newEmployeePermissions)) })
        .eq('user_id', editingEmployee.user_id);

      if (error) throw error;
      
      toast.success("Permissions updated successfully");
      setShowPermissionsDialog(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error: unknown) {
      toast.error(`Failed to update permissions: ${getErrMsg(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getPermissionCount = (permissions?: AdminPermissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  // Get support employees that can be bulk edited
  const supportEmployees = filteredEmployees.filter(e => 
    !e.is_super_admin && 
    e.employee_role === 'support' && 
    e.user_id !== user?.id
  );

  // Toggle employee selection for bulk actions
  const toggleEmployeeSelection = (userId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Select/deselect all support employees
  const toggleSelectAll = () => {
    if (selectedEmployees.size === supportEmployees.length && supportEmployees.length > 0) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(supportEmployees.map(e => e.user_id)));
    }
  };

  // Handle bulk permissions update
  const handleBulkPermissionsUpdate = async () => {
    if (selectedEmployees.size === 0) return;
    
    setActionLoading(true);
    try {
      const updates = Array.from(selectedEmployees).map(userId => 
        supabase
          .from('admin_employees')
          .update({ permissions: JSON.parse(JSON.stringify(bulkPermissions)) })
          .eq('user_id', userId)
      );
      
      await Promise.all(updates);
      
      toast.success(`Permissions updated for ${selectedEmployees.size} employee(s)`);
      setShowBulkPermissionsDialog(false);
      setSelectedEmployees(new Set());
      fetchEmployees();
    } catch (error: unknown) {
      toast.error(`Failed to update permissions: ${getErrMsg(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Admin Employees
            </CardTitle>
            <CardDescription>
              Manage your admin team members who can help manage users
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedEmployees.size > 0 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setBulkPermissions(DEFAULT_PERMISSIONS);
                  setShowBulkPermissionsDialog(true);
                }}
                className="gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Edit {selectedEmployees.size} Selected
              </Button>
            )}
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AdminTableSkeleton />
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No admin employees found</p>
            <Button 
              variant="outline" 
              className="mt-4 gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add Your First Employee
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {supportEmployees.length > 0 && (
                      <Checkbox
                        checked={selectedEmployees.size === supportEmployees.length && supportEmployees.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all support employees"
                      />
                    )}
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      {/* Only show checkbox for support employees */}
                      {!employee.is_super_admin && employee.employee_role === 'support' && employee.user_id !== user?.id ? (
                        <Checkbox
                          checked={selectedEmployees.has(employee.user_id)}
                          onCheckedChange={() => toggleEmployeeSelection(employee.user_id)}
                          aria-label={`Select ${employee.profile?.name || 'employee'}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={employee.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            {getInitials(employee.profile?.name || null, employee.profile?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{employee.profile?.name || 'No name'}</p>
                            {employee.user_id === user?.id && (
                              <Badge variant="outline" className="gap-1">
                                <Crown className="h-3 w-3" />
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {employee.profile?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(employee.employee_role, employee.is_super_admin)}
                    </TableCell>
                    <TableCell>
                      {employee.is_super_admin || employee.employee_role === 'full_admin' ? (
                        <Badge variant="outline" className="text-success border-success">
                          All Tabs
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {getPermissionCount(employee.permissions)}/{Object.keys(PERMISSION_LABELS).length} tabs
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {employee.created_at ? format(new Date(employee.created_at), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit permissions button - only for support role */}
                        {employee.user_id !== user?.id && !employee.is_super_admin && employee.employee_role === 'support' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPermissions(employee)}
                            disabled={actionLoading}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                        {employee.user_id !== user?.id && !employee.is_super_admin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setEmployeeToDelete({
                                id: employee.id,
                                userId: employee.user_id,
                                isSuperAdmin: employee.is_super_admin,
                                name: employee.profile?.name || employee.profile?.email || 'this employee'
                              });
                              setShowDeleteDialog(true);
                            }}
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Add a user as an admin employee to help manage the platform. They must already have an account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="employee@example.com"
                value={newEmployeeEmail}
                onChange={(e) => setNewEmployeeEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the email address of an existing user
              </p>
            </div>
            <div>
              <Label>Role</Label>
              <Select 
                value={newEmployeeRole} 
                onValueChange={(v) => {
                  setNewEmployeeRole(v as "full_admin" | "support");
                  if (v === "full_admin") {
                    // Reset permissions to all true for full admin
                    setNewEmployeePermissions({
                      bookings: true,
                      fleet: true,
                      locations: true,
                      cities: true,
                      clients: true,
                      individual_owners: true,
                      rental_shops: true,
                      analytics: true,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[100]">
                  <SelectItem value="support">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Support Only
                    </div>
                  </SelectItem>
                  <SelectItem value="full_admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Full Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {newEmployeeRole === "full_admin" 
                  ? "Full admin has complete access to all tabs." 
                  : "Support role - select which tabs they can access below."}
              </p>
            </div>
            
            {/* Permissions Grid - Only show for support role */}
            {newEmployeeRole === "support" && (
              <div className="space-y-3">
                <Label>Tab Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-${key}`}
                        checked={newEmployeePermissions[key]}
                        onCheckedChange={(checked) => 
                          setNewEmployeePermissions(prev => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <Label htmlFor={`new-${key}`} className="text-sm font-normal cursor-pointer">
                        {PERMISSION_LABELS[key]}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {Object.values(newEmployeePermissions).filter(Boolean).length} of {Object.keys(PERMISSION_LABELS).length} tabs
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Select which admin tabs {editingEmployee?.profile?.name || 'this employee'} can access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${key}`}
                    checked={newEmployeePermissions[key]}
                    onCheckedChange={(checked) => 
                      setNewEmployeePermissions(prev => ({ ...prev, [key]: !!checked }))
                    }
                  />
                  <Label htmlFor={`edit-${key}`} className="text-sm font-normal cursor-pointer">
                    {PERMISSION_LABELS[key]}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {Object.values(newEmployeePermissions).filter(Boolean).length} of {Object.keys(PERMISSION_LABELS).length} tabs
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Permissions Dialog */}
      <Dialog open={showBulkPermissionsDialog} onOpenChange={setShowBulkPermissionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedEmployees.size} selected support employee(s). This will apply the same permissions to all selected employees.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bulk-${key}`}
                    checked={bulkPermissions[key]}
                    onCheckedChange={(checked) => 
                      setBulkPermissions(prev => ({ ...prev, [key]: !!checked }))
                    }
                  />
                  <Label htmlFor={`bulk-${key}`} className="text-sm font-normal cursor-pointer">
                    {PERMISSION_LABELS[key]}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {Object.values(bulkPermissions).filter(Boolean).length} of {Object.keys(PERMISSION_LABELS).length} tabs
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPermissionsUpdate} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedEmployees.size} Employee(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{employeeToDelete?.name}</strong> from the admin team. 
              They will lose all admin access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (employeeToDelete) {
                  handleRemoveEmployee(employeeToDelete.id, employeeToDelete.userId, employeeToDelete.isSuperAdmin);
                  setShowDeleteDialog(false);
                  setEmployeeToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
