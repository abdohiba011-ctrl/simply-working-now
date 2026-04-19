import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminFleetSkeleton } from "@/components/ui/admin-skeleton";
import { 
  Bike, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  Search,
  MapPin,
  RefreshCw,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";

interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number;
  main_image_url: string;
  is_original: boolean;
  is_approved: boolean;
  approval_status: string;
  business_status: string;
  owner_id: string | null;
  created_at: string;
}

interface BikeInventory {
  id: string;
  bike_type_id: string;
  location: string;
  quantity: number;
  available_quantity: number;
}

interface ServiceLocation {
  id: string;
  name: string;
  is_active: boolean;
}

export const AdminFleetTab = () => {
  const navigate = useNavigate();
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [inventory, setInventory] = useState<BikeInventory[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("original");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingBikeId, setRejectingBikeId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, invRes, locRes] = await Promise.all([
        supabase.from('bike_types').select('*').order('name'),
        supabase.from('bike_inventory').select('*').order('location'),
        supabase.from('service_locations').select('*').eq('is_active', true).order('name'),
      ]);

      if (typesRes.error) throw typesRes.error;
      if (invRes.error) throw invRes.error;
      
      setBikeTypes(typesRes.data || []);
      setInventory(invRes.data || []);
      setLocations(locRes.data || []);
    } catch (error) {
      toast.error("Failed to load fleet data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const originalBikes = bikeTypes.filter(b => b.is_original === true);
  const businessBikes = bikeTypes.filter(b => b.is_original === false && b.business_status !== 'admin_deleted');
  const pendingBikes = businessBikes.filter(b => b.approval_status === 'pending');

  const filteredOriginal = originalBikes.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBusiness = businessBikes.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInventoryForBike = (bikeTypeId: string) => 
    inventory.filter(i => i.bike_type_id === bikeTypeId);

  const getTotalQuantity = (bikeTypeId: string) => 
    getInventoryForBike(bikeTypeId).reduce((sum, i) => sum + i.quantity, 0);

  const getTotalAvailable = (bikeTypeId: string) => 
    getInventoryForBike(bikeTypeId).reduce((sum, i) => sum + i.available_quantity, 0);

  const handleApprove = async (bikeId: string) => {
    try {
      const bike = bikeTypes.find(b => b.id === bikeId);
      const { error } = await supabase
        .from('bike_types')
        .update({ is_approved: true, approval_status: 'approved' })
        .eq('id', bikeId);

      if (error) throw error;

      // Send email notification
      if (bike?.owner_id) {
        const { data: owner } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', bike.owner_id)
          .single();

        if (owner?.email) {
          try {
            await supabase.functions.invoke('send-booking-notification', {
              body: {
                type: 'bike_approved',
                recipientEmail: owner.email,
                recipientName: owner.name || 'Partner',
                data: { bikeTypeName: bike.name }
              }
            });
          } catch (e) { console.error('Email failed:', e); }
        }
      }

      toast.success("Bike approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve bike");
    }
  };

  const handleRejectClick = (bikeId: string) => {
    setRejectingBikeId(bikeId);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!rejectingBikeId) return;
    
    setIsSaving(true);
    try {
      const bike = bikeTypes.find(b => b.id === rejectingBikeId);
      const { error } = await supabase
        .from('bike_types')
        .update({ is_approved: false, approval_status: 'rejected' })
        .eq('id', rejectingBikeId);

      if (error) throw error;

      // Send email notification
      if (bike?.owner_id) {
        const { data: owner } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', bike.owner_id)
          .single();

        if (owner?.email) {
          try {
            await supabase.functions.invoke('send-booking-notification', {
              body: {
                type: 'bike_rejected',
                recipientEmail: owner.email,
                recipientName: owner.name || 'Partner',
                data: { bikeTypeName: bike.name, rejectionReason: rejectionReason || 'Does not meet our quality standards.' }
              }
            });
          } catch (e) { console.error('Email failed:', e); }
        }
      }

      toast.success("Bike rejected");
      setShowRejectDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to reject bike");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDelete = async (bikeId: string) => {
    if (!confirm("This will mark the bike as deleted for the business. They can request again. Continue?")) return;
    
    try {
      const { error } = await supabase
        .from('bike_types')
        .update({ business_status: 'admin_deleted' })
        .eq('id', bikeId);

      if (error) throw error;
      toast.success("Bike removed (business can request again)");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete bike");
    }
  };

  const handleHardDelete = async (bikeId: string) => {
    if (!confirm("Permanently delete this bike type? This cannot be undone.")) return;
    
    try {
      const { error } = await supabase
        .from('bike_types')
        .delete()
        .eq('id', bikeId);

      if (error) throw error;
      toast.success("Bike deleted permanently");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete bike");
    }
  };

  const getApprovalStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'pending';
      case 'approved': return 'verified';
      case 'rejected': return 'rejected';
      default: return 'pending';
    }
  };

  if (isLoading) {
    return <AdminFleetSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats - Compact Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-primary/5 text-primary border-primary/20"
        >
          <Bike className="h-3.5 w-3.5 mr-1.5" />
          Original: {originalBikes.length}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-info/10 text-info border-info/30 dark:bg-info/10 dark:text-info dark:border-info/40"
        >
          <Bike className="h-3.5 w-3.5 mr-1.5" />
          Business: {businessBikes.length}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-warning/10 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/40"
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Pending: {pendingBikes.length}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-success/10 text-success border-success/30 dark:bg-success/10 dark:text-success dark:border-success/40"
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Locations: {locations.length}
        </Badge>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bikes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/fleet/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bike Type
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="original">Original Bikes ({originalBikes.length})</TabsTrigger>
          <TabsTrigger value="business">Business Submissions ({businessBikes.length})</TabsTrigger>
        </TabsList>

        {/* Original Bikes */}
        <TabsContent value="original">
          <Card>
            <CardHeader>
              <CardTitle>Original Motorbikes</CardTitle>
              <CardDescription>
                Editable bikes displayed on the client side. Changes affect customers immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredOriginal.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No original bikes found</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOriginal.map((bike) => (
                    <Card key={bike.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <img 
                          src={resolveBikeImageUrl(bike.main_image_url)} 
                          alt={bike.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">Original</Badge>
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{bike.name}</h3>
                          <span className="font-bold text-primary">{bike.daily_price} DH/day</span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{getTotalQuantity(bike.id)} total • {getTotalAvailable(bike.id)} available</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {getInventoryForBike(bike.id).slice(0, 3).map((inv) => (
                            <div key={inv.id} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{inv.location}</span>
                              <span>{inv.available_quantity}/{inv.quantity}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/admin/fleet/${bike.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleHardDelete(bike.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Bikes */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Submissions</CardTitle>
              <CardDescription>Motorbikes submitted by business partners</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredBusiness.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No business submissions</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusiness.map((bike) => (
                      <TableRow key={bike.id}>
                        <TableCell>
                          <img 
                            src={resolveBikeImageUrl(bike.main_image_url)} 
                            alt={bike.name}
                            loading="lazy"
                            decoding="async"
                            className="h-12 w-16 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{bike.name}</TableCell>
                        <TableCell>{bike.daily_price} DH/day</TableCell>
                        <TableCell>
                          <StatusBadge 
                            status={getApprovalStatus(bike.approval_status)} 
                            label={bike.approval_status === 'approved' ? 'Approved' : bike.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {bike.approval_status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(bike.id)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectClick(bike.id)}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/fleet/${bike.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleSoftDelete(bike.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bike Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The business owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="e.g., Image quality is too low, missing specifications..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};