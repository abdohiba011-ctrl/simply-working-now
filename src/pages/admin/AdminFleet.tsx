import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
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
  Bike, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowUp,
  Loader2,
  Search,
  MapPin,
  RefreshCw,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { resolveBikeImageUrl } from "@/lib/bikeImageResolver";
import { useFleetRealtime } from "@/hooks/useBikeTypesRealtime";
import { AdminFleetSkeleton } from "@/components/ui/admin-skeleton";

interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number;
  main_image_url: string;
  features: unknown;
  rating: number;
  is_original: boolean;
  is_approved: boolean;
  approval_status: string;
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

const AdminFleet = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [inventory, setInventory] = useState<BikeInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("original");

  // Enable real-time updates for fleet data
  useFleetRealtime();

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate("/auth");
        return;
      }
      const isAdmin = hasRole('admin');
      if (!isAdmin) {
        navigate("/");
        return;
      }
      fetchData();
    };
    checkAccess();
  }, [isAuthenticated, hasRole, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch bike types
      const { data: typesData, error: typesError } = await supabase
        .from('bike_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;
      setBikeTypes(typesData || []);

      // Fetch inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('bike_inventory')
        .select('*')
        .order('location');

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);
    } catch (error) {
      toast.error("Failed to load fleet data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const originalBikes = bikeTypes.filter(b => b.is_original === true);
  const businessBikes = bikeTypes.filter(b => b.is_original === false);
  const pendingBikes = businessBikes.filter(b => b.approval_status === 'pending');
  const approvedBikes = businessBikes.filter(b => b.approval_status === 'approved');

  const filteredOriginal = originalBikes.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBusiness = businessBikes.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInventoryForBike = (bikeTypeId: string) => {
    return inventory.filter(i => i.bike_type_id === bikeTypeId);
  };

  const getTotalQuantity = (bikeTypeId: string) => {
    const inv = getInventoryForBike(bikeTypeId);
    return inv.reduce((sum, i) => sum + i.quantity, 0);
  };

  const getTotalAvailable = (bikeTypeId: string) => {
    const inv = getInventoryForBike(bikeTypeId);
    return inv.reduce((sum, i) => sum + i.available_quantity, 0);
  };

  const handleApprove = async (bikeId: string) => {
    try {
      // Get bike info first
      const bike = bikeTypes.find(b => b.id === bikeId);
      
      const { error } = await supabase
        .from('bike_types')
        .update({ is_approved: true, approval_status: 'approved' })
        .eq('id', bikeId);

      if (error) throw error;

      // Send email notification if owner exists
      if (bike?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', bike.owner_id)
          .single();

        if (ownerProfile?.email) {
          try {
            await supabase.functions.invoke('send-booking-notification', {
              body: {
                type: 'bike_approved',
                recipientEmail: ownerProfile.email,
                recipientName: ownerProfile.name || 'Partner',
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

  const handleReject = async (bikeId: string, reason?: string) => {
    try {
      const bike = bikeTypes.find(b => b.id === bikeId);
      
      const { error } = await supabase
        .from('bike_types')
        .update({ is_approved: false, approval_status: 'rejected' })
        .eq('id', bikeId);

      if (error) throw error;

      // Send email notification if owner exists
      if (bike?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', bike.owner_id)
          .single();

        if (ownerProfile?.email) {
          try {
            await supabase.functions.invoke('send-booking-notification', {
              body: {
                type: 'bike_rejected',
                recipientEmail: ownerProfile.email,
                recipientName: ownerProfile.name || 'Partner',
                data: { bikeTypeName: bike.name, rejectionReason: reason || 'Does not meet our quality standards.' }
              }
            });
          } catch (e) { console.error('Email failed:', e); }
        }
      }

      toast.success("Bike rejected");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject bike");
    }
  };

  const handleMoveToOriginal = async (bikeId: string) => {
    try {
      const { error } = await supabase
        .from('bike_types')
        .update({ 
          is_original: true, 
          is_approved: true, 
          approval_status: 'approved',
          owner_id: null 
        })
        .eq('id', bikeId);

      if (error) throw error;
      toast.success("Bike moved to Original collection");
      fetchData();
    } catch (error) {
      toast.error("Failed to move bike");
    }
  };

  const handleDelete = async (bikeId: string) => {
    if (!confirm("Are you sure you want to delete this bike type?")) return;
    
    try {
      const { error } = await supabase
        .from('bike_types')
        .delete()
        .eq('id', bikeId);

      if (error) throw error;
      toast.success("Bike deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete bike");
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bike className="h-6 w-6" />
              Fleet Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your motorbike inventory and business submissions
            </p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 text-center">
              <Bike className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{originalBikes.length}</p>
              <p className="text-sm text-muted-foreground">Original Bikes</p>
            </CardContent>
          </Card>
          <Card className="bg-info/10 dark:bg-info/10 border-info/30">
            <CardContent className="pt-4 text-center">
              <Bike className="h-6 w-6 mx-auto mb-2 text-info" />
              <p className="text-2xl font-bold text-info">{businessBikes.length}</p>
              <p className="text-sm text-muted-foreground">Business Bikes</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 dark:bg-warning/10 border-warning/30">
            <CardContent className="pt-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold text-warning">{pendingBikes.length}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="bg-success/10 dark:bg-success/10 border-success/30">
            <CardContent className="pt-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{approvedBikes.length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80 mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bike name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="original">
              Original Motorbikes ({originalBikes.length})
            </TabsTrigger>
            <TabsTrigger value="business">
              Business Submissions ({businessBikes.length})
            </TabsTrigger>
          </TabsList>

          {/* Original Bikes Tab */}
          <TabsContent value="original">
            <Card>
              <CardHeader>
                <CardTitle>Original Motorbikes</CardTitle>
                <CardDescription>
                  Your hero bikes displayed on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <AdminFleetSkeleton />
                ) : filteredOriginal.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No original bikes found
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOriginal.map((bike) => (
                      <Card key={bike.id} className="overflow-hidden">
                        <div className="aspect-video relative">
                          <img 
                            src={resolveBikeImageUrl(bike.main_image_url)} 
                            alt={bike.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                          />
                          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                            Original
                          </Badge>
                        </div>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg">{bike.name}</h3>
                            <span className="font-bold text-primary">{bike.daily_price} DH/day</span>
                          </div>
                          
                          {/* Inventory Summary */}
                          <div className="text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{getTotalQuantity(bike.id)} total • {getTotalAvailable(bike.id)} available</span>
                            </div>
                          </div>
                          
                          {/* Location breakdown */}
                          <div className="space-y-1 mb-3">
                            {getInventoryForBike(bike.id).slice(0, 3).map((inv) => (
                              <div key={inv.id} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{inv.location}</span>
                                <span>{inv.available_quantity}/{inv.quantity}</span>
                              </div>
                            ))}
                            {getInventoryForBike(bike.id).length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{getInventoryForBike(bike.id).length - 3} more locations
                              </p>
                            )}
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
                              onClick={() => handleDelete(bike.id)}
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

          {/* Business Bikes Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Submissions</CardTitle>
                <CardDescription>
                  Motorbikes submitted by business partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <AdminFleetSkeleton />
                ) : filteredBusiness.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No business submissions found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
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
                                className="h-12 w-16 rounded object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{bike.name}</TableCell>
                            <TableCell>{bike.daily_price} DH/day</TableCell>
                            <TableCell>{getApprovalBadge(bike.approval_status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(bike.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate(`/admin/fleet/${bike.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {bike.approval_status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-success"
                                      onClick={() => handleApprove(bike.id)}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-destructive"
                                      onClick={() => handleReject(bike.id)}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {bike.approval_status === 'approved' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleMoveToOriginal(bike.id)}
                                    title="Move to Original"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDelete(bike.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFleet;