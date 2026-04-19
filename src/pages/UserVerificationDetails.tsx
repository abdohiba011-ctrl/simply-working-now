import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Loader2, ChevronLeft, User, Mail, Phone, CreditCard, 
  CheckCircle, XCircle, Ban, AlertTriangle, ImageIcon,
  Copy, ExternalLink
} from "lucide-react";
import { VerificationSkeleton } from "@/components/ui/bike-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  id_card_number: string | null;
  full_name_on_id: string | null;
  id_front_image_url: string | null;
  id_back_image_url: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  is_frozen: boolean | null;
  frozen_reason: string | null;
  rejection_reason: string | null;
  phone_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  user_type: string | null;
  business_type: string | null;
}

const UserVerificationDetails = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, isAuthenticated } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);

  const isAdmin = hasRole('admin');

  useEffect(() => {
    if (isAuthenticated && isAdmin && userId) {
      fetchUserDetails();
    }
  }, [isAuthenticated, isAdmin, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);

      // Get signed URLs for ID images (since bucket is private)
      if (data.id_front_image_url) {
        const frontPath = extractStoragePath(data.id_front_image_url);
        if (frontPath) {
          const { data: signedData } = await supabase.storage
            .from('id-documents')
            .createSignedUrl(frontPath, 3600); // 1 hour expiry
          setFrontImageUrl(signedData?.signedUrl || data.id_front_image_url);
        } else {
          setFrontImageUrl(data.id_front_image_url);
        }
      }

      if (data.id_back_image_url) {
        const backPath = extractStoragePath(data.id_back_image_url);
        if (backPath) {
          const { data: signedData } = await supabase.storage
            .from('id-documents')
            .createSignedUrl(backPath, 3600);
          setBackImageUrl(signedData?.signedUrl || data.id_back_image_url);
        } else {
          setBackImageUrl(data.id_back_image_url);
        }
      }
    } catch (error: unknown) {
      toast.error("Failed to load user details");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract the storage path from a public URL
  const extractStoragePath = (url: string): string | null => {
    if (!url) return null;
    
    try {
      // If it's already just a path (not a full URL)
      if (!url.includes('://') && !url.startsWith('http')) {
        return url;
      }
      
      // Try multiple patterns for Supabase storage URLs
      const patterns = [
        /id-documents\/(.+?)(\?|$)/,           // Standard format
        /storage\/v1\/object\/public\/id-documents\/(.+?)(\?|$)/, // Full public path
        /storage\/v1\/object\/sign\/id-documents\/(.+?)(\?|$)/,   // Signed path
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return decodeURIComponent(match[1]);
      }
      
      // If it's a direct file path stored in DB
      if (url.includes('/') && !url.includes('://')) {
        return url;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const handleVerify = async () => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          verification_status: 'verified',
          rejection_reason: null
        })
        .eq('id', user.id);

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Verified! ✅',
        message: 'Congratulations! Your account has been verified. You can now rent motorbikes on Motonita.',
        type: 'success'
      });

      toast.success("User verified successfully!");
      fetchUserDetails();
    } catch (error: unknown) {
      toast.error("Failed to verify user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'rejected',
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Send notification with reason
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Verification Rejected ❌',
        message: `Your verification was rejected. Reason: ${rejectionReason.trim()}. Please review and resubmit your documents.`,
        type: 'warning',
        action_url: '/profile'
      });

      toast.success("User verification rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      fetchUserDetails();
    } catch (error: unknown) {
      toast.error("Failed to reject verification");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          verification_status: 'blocked',
          is_frozen: true,
          frozen_reason: 'Blocked by admin during verification review'
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Blocked',
        message: 'Your account has been blocked. Please contact support for more information.',
        type: 'error'
      });

      toast.success("User blocked successfully");
      fetchUserDetails();
    } catch (error: unknown) {
      toast.error("Failed to block user");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = () => {
    if (!user) return null;
    
    if (user.is_verified) {
      return <Badge className="bg-green-500 text-white text-lg px-4 py-1">Verified ✓</Badge>;
    }
    
    switch (user.verification_status) {
      case 'pending_review':
        return <Badge className="bg-yellow-500 text-white text-lg px-4 py-1">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white text-lg px-4 py-1">Rejected</Badge>;
      case 'blocked':
        return <Badge className="bg-red-900 text-white text-lg px-4 py-1">Blocked</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white text-lg px-4 py-1">Not Started</Badge>;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <VerificationSkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">User not found</h1>
          <Button className="mt-4" onClick={() => navigate('/admin/panel')}>Back to Admin Panel</Button>
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
          <div className="max-w-4xl mx-auto">
            {/* Back Button & Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/panel')}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Admin Panel
              </Button>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{user.name || 'No name'}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {/* Previous Rejection Reason */}
            {user.rejection_reason && (
              <Card className="mb-6 border-red-500/50 bg-red-50/50 dark:bg-red-900/10">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-red-600 mb-1">Previous Rejection Reason:</p>
                  <p className="text-foreground">{user.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.email || 'N/A'}</span>
                      {user.email && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(user.email!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.phone || 'N/A'}</span>
                      {user.phone_verified ? (
                        <Badge className="bg-green-500 text-white text-xs">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Not Verified</Badge>
                      )}
                      {user.phone && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(user.phone!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">User Type</span>
                    <span className="font-medium capitalize">{user.user_type || 'Client'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ID Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    ID Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID Card Number (CIN)</span>
                    <span className="font-medium font-mono">{user.id_card_number || 'Not provided'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Full Name on ID</span>
                    <span className="font-medium">{user.full_name_on_id || 'Not provided'}</span>
                  </div>

                  {/* Name Match Check */}
                  {user.name && user.full_name_on_id && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-1">Name Match Check:</p>
                      <div className="flex items-center gap-2">
                        {user.name.toLowerCase().trim() === user.full_name_on_id.toLowerCase().trim() ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 text-sm">Names match</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600 text-sm">
                              Profile: "{user.name}" vs ID: "{user.full_name_on_id}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ID Card Images */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  ID Card Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Front of ID */}
                  <div>
                    <p className="text-sm font-medium mb-3">Front of ID Card</p>
                    {frontImageUrl ? (
                      <div className="relative group">
                        <img 
                          src={frontImageUrl} 
                          alt="ID Front" 
                          className="w-full rounded-lg border shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = 'Failed to load image';
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(frontImageUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-48 bg-muted rounded-lg flex flex-col items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No image uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Back of ID */}
                  <div>
                    <p className="text-sm font-medium mb-3">Back of ID Card</p>
                    {backImageUrl ? (
                      <div className="relative group">
                        <img 
                          src={backImageUrl} 
                          alt="ID Back" 
                          className="w-full rounded-lg border shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = 'Failed to load image';
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(backImageUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-48 bg-muted rounded-lg flex flex-col items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No image uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {user.verification_status === 'pending_review' && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={handleVerify}
                      disabled={actionLoading}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      Approve & Verify User
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      <XCircle className="h-5 w-5" />
                      Reject Verification
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleBlock}
                      disabled={actionLoading}
                      className="gap-2 border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Ban className="h-5 w-5" />
                      Block User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this user's verification. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., The full name on the ID does not match the profile name. Please ensure your profile name matches exactly what is shown on your ID card."
              className="mt-2 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Common reasons: Name mismatch, blurry images, expired ID, incomplete information
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject & Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default UserVerificationDetails;
