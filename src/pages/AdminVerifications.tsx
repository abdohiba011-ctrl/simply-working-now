import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye, ShieldCheck, AlertTriangle, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface PendingUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  id_card_number: string | null;
  full_name_on_id: string | null;
  first_name_on_id: string | null;
  family_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
  selfie_with_id_url: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

const AdminVerifications = () => {
  const { hasRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = hasRole('admin');

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchPendingVerifications();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchPendingVerifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending_review')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error: unknown) {
      toast.error("Failed to load verifications");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          verification_status: 'verified' 
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Account Verified!',
        message: 'Congratulations! Your account has been verified. You can now rent motorbikes.',
        type: 'success'
      });

      toast.success("User verified successfully!");
      fetchPendingVerifications();
    } catch (error: unknown) {
      toast.error("Failed to verify user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'rejected' 
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Verification Rejected',
        message: 'Your verification was rejected. Please contact support or resubmit your documents.',
        type: 'warning'
      });

      toast.success("User verification rejected");
      fetchPendingVerifications();
    } catch (error: unknown) {
      toast.error("Failed to reject verification");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'blocked' 
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success("User blocked successfully");
      fetchPendingVerifications();
    } catch (error: unknown) {
      toast.error("Failed to block user");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">Please log in to access this page</h1>
          <Button className="mt-4" onClick={() => navigate('/auth')}>Log In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  User Verifications
                </h1>
                <p className="text-muted-foreground mt-1">
                  Review and approve user identity verifications
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {pendingUsers.filter(u => u.verification_status === 'pending_review').length} Pending
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">All Caught Up!</h2>
                  <p className="text-muted-foreground">No pending verifications at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingUsers.map((user) => (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{user.name || 'No name'}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-sm text-muted-foreground">{user.phone || 'No phone'}</p>
                            
                            {user.verification_status === 'pending_review' && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm"><strong>ID Number:</strong> {user.id_card_number || 'Not provided'}</p>
                                <p className="text-sm"><strong>Name on ID:</strong> {user.full_name_on_id || 'Not provided'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={
                              user.verification_status === 'pending_review' ? 'default' :
                              user.verification_status === 'verified' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {user.verification_status === 'pending_review' ? 'Pending Review' :
                             user.verification_status === 'not_started' ? 'Not Started' :
                             user.verification_status}
                          </Badge>
                          
                          {user.verification_status === 'pending_review' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedUser(user); setShowDocuments(true); }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Docs
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleVerify(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Verify
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                onClick={() => handleBlock(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                Block
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Documents Modal */}
      <Dialog open={showDocuments} onOpenChange={setShowDocuments}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ID Documents - {selectedUser?.full_name_on_id || selectedUser?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">First Name on ID</p>
                <p className="font-medium">{selectedUser?.first_name_on_id || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Family Name on ID</p>
                <p className="font-medium">{selectedUser?.family_name_on_id || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ID Number</p>
                <p className="font-medium">{selectedUser?.id_card_number || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedUser?.phone || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Front of ID Card</p>
                {selectedUser?.id_front_image_url ? (
                  <img 
                    src={selectedUser.id_front_image_url} 
                    alt="ID Front" 
                    className="w-full rounded-lg border object-contain max-h-64 bg-muted"
                  />
                ) : (
                  <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No image uploaded</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Back of ID Card</p>
                {selectedUser?.id_back_image_url ? (
                  <img 
                    src={selectedUser.id_back_image_url} 
                    alt="ID Back" 
                    className="w-full rounded-lg border object-contain max-h-64 bg-muted"
                  />
                ) : (
                  <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No image uploaded</p>
                  </div>
                )}
              </div>
              
              {/* Selfie with ID */}
              <div>
                <p className="text-sm font-medium mb-2">Selfie with ID Card <span className="text-muted-foreground font-normal">(Optional)</span></p>
                {selectedUser?.selfie_with_id_url ? (
                  <img 
                    src={selectedUser.selfie_with_id_url} 
                    alt="Selfie with ID" 
                    className="w-full rounded-lg border object-contain max-h-64 bg-muted"
                  />
                ) : (
                  <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No selfie uploaded</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={() => { handleVerify(selectedUser!.id); setShowDocuments(false); }}
                disabled={actionLoading === selectedUser?.id}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Verify
              </Button>
              <Button
                variant="destructive"
                onClick={() => { handleReject(selectedUser!.id); setShowDocuments(false); }}
                disabled={actionLoading === selectedUser?.id}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default AdminVerifications;
