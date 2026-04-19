import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditActionType = 
  | 'user_verification'
  | 'user_verification_rejected'
  | 'user_freeze'
  | 'user_unfreeze'
  | 'booking_status_change'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_assigned'
  | 'role_assignment'
  | 'role_removal'
  | 'payment_recorded'
  | 'payment_refunded'
  | 'trust_score_change'
  | 'admin_employee_added'
  | 'admin_employee_removed'
  | 'admin_permission_change';

export interface AuditLogEntry {
  action_type: AuditActionType;
  action_description: string;
  target_user_id?: string;
  target_resource_type?: 'user' | 'booking' | 'role' | 'payment' | 'admin';
  target_resource_id?: string;
  old_value?: Json;
  new_value?: Json;
  metadata?: Json;
}

/**
 * Creates an audit log entry for sensitive admin actions.
 * This function should be called after successful admin operations.
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Audit log: No authenticated user');
      return false;
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: entry.action_type,
        action_type: entry.action_type,
        action_description: entry.action_description,
        actor_id: user.id,
        actor_email: user.email || profile?.email || null,
        actor_name: profile?.name || 'Unknown',
        target_user_id: entry.target_user_id || null,
        target_resource_type: entry.target_resource_type || null,
        target_resource_id: entry.target_resource_id || null,
        old_value: (entry.old_value || null) as Json,
        new_value: (entry.new_value || null) as Json,
        metadata: (entry.metadata || {}) as Json,
      });

    if (error) {
      console.error('Failed to create audit log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Audit log error:', error);
    return false;
  }
}

/**
 * Hook for audit logging with helper methods for common actions
 */
export function useAuditLog() {
  const logUserVerification = async (
    userId: string,
    approved: boolean,
    reason?: string
  ) => {
    return createAuditLog({
      action_type: approved ? 'user_verification' : 'user_verification_rejected',
      action_description: approved 
        ? 'User ID verification approved'
        : `User ID verification rejected: ${reason || 'No reason provided'}`,
      target_user_id: userId,
      target_resource_type: 'user',
      target_resource_id: userId,
      new_value: { 
        verification_status: approved ? 'verified' : 'rejected',
        rejection_reason: reason 
      },
    });
  };

  const logUserFreeze = async (
    userId: string,
    frozen: boolean,
    reason?: string
  ) => {
    return createAuditLog({
      action_type: frozen ? 'user_freeze' : 'user_unfreeze',
      action_description: frozen 
        ? `User account frozen: ${reason || 'No reason provided'}`
        : 'User account unfrozen',
      target_user_id: userId,
      target_resource_type: 'user',
      target_resource_id: userId,
      new_value: { is_frozen: frozen, frozen_reason: reason },
    });
  };

  const logBookingStatusChange = async (
    bookingId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ) => {
    const actionType = newStatus === 'confirmed' ? 'booking_confirmed'
      : newStatus === 'rejected' ? 'booking_rejected'
      : newStatus === 'cancelled' ? 'booking_cancelled'
      : 'booking_status_change';

    return createAuditLog({
      action_type: actionType,
      action_description: `Booking status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
      target_user_id: userId,
      target_resource_type: 'booking',
      target_resource_id: bookingId,
      old_value: { booking_status: oldStatus },
      new_value: { booking_status: newStatus, reason },
    });
  };

  const logBookingAssignment = async (
    bookingId: string,
    userId: string,
    businessId: string,
    businessName?: string
  ) => {
    return createAuditLog({
      action_type: 'booking_assigned',
      action_description: `Booking assigned to business: ${businessName || businessId}`,
      target_user_id: userId,
      target_resource_type: 'booking',
      target_resource_id: bookingId,
      new_value: { assigned_to_business: businessId, business_name: businessName },
    });
  };

  const logRoleChange = async (
    userId: string,
    role: string,
    added: boolean
  ) => {
    return createAuditLog({
      action_type: added ? 'role_assignment' : 'role_removal',
      action_description: added 
        ? `Role '${role}' assigned to user`
        : `Role '${role}' removed from user`,
      target_user_id: userId,
      target_resource_type: 'role',
      target_resource_id: userId,
      new_value: { role, action: added ? 'added' : 'removed' },
    });
  };

  const logPaymentRecorded = async (
    bookingId: string,
    userId: string,
    amount: number,
    method: string,
    paymentId?: string
  ) => {
    return createAuditLog({
      action_type: 'payment_recorded',
      action_description: `Payment of ${amount} DH recorded via ${method}`,
      target_user_id: userId,
      target_resource_type: 'payment',
      target_resource_id: paymentId || bookingId,
      new_value: { amount, method, booking_id: bookingId },
    });
  };

  const logTrustScoreChange = async (
    userId: string,
    oldScore: number,
    newScore: number,
    reason: string
  ) => {
    return createAuditLog({
      action_type: 'trust_score_change',
      action_description: `Trust score changed from ${oldScore} to ${newScore}: ${reason}`,
      target_user_id: userId,
      target_resource_type: 'user',
      target_resource_id: userId,
      old_value: { trust_score: oldScore },
      new_value: { trust_score: newScore, reason },
    });
  };

  const logAdminEmployeeChange = async (
    adminUserId: string,
    action: 'added' | 'removed' | 'permission_change',
    permissions?: Record<string, boolean>
  ) => {
    const actionType = action === 'added' ? 'admin_employee_added'
      : action === 'removed' ? 'admin_employee_removed'
      : 'admin_permission_change';

    return createAuditLog({
      action_type: actionType,
      action_description: action === 'added' 
        ? 'Admin employee added'
        : action === 'removed' 
        ? 'Admin employee removed'
        : 'Admin permissions changed',
      target_user_id: adminUserId,
      target_resource_type: 'admin',
      target_resource_id: adminUserId,
      new_value: permissions ? { permissions } : undefined,
    });
  };

  return {
    createAuditLog,
    logUserVerification,
    logUserFreeze,
    logBookingStatusChange,
    logBookingAssignment,
    logRoleChange,
    logPaymentRecorded,
    logTrustScoreChange,
    logAdminEmployeeChange,
  };
}
