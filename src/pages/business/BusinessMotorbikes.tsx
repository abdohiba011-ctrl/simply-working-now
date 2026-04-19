import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessLayout } from "@/components/layouts/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  Bike, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  RefreshCw,
  Edit,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { BusinessMotorbikesSkeleton } from "@/components/ui/admin-skeleton";

interface BikeType {
  id: string;
  name: string;
  description: string | null;
  daily_price: number;
  main_image_url: string;
  is_approved: boolean;
  approval_status: string;
  business_status: string | null;
  created_at: string;
}

const BusinessMotorbikes = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, user } = useAuth();
  const { t, language } = useLanguage();
  const [bikes, setBikes] = useState<BikeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingAgainId, setRequestingAgainId] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedBikeForRequest, setSelectedBikeForRequest] = useState<BikeType | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate("/auth");
        return;
      }
      const isBusiness = hasRole('business');
      if (!isBusiness) {
        navigate("/");
        return;
      }
      fetchBikes();
    };
    checkAccess();
  }, [isAuthenticated, hasRole, navigate]);

  const fetchBikes = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bike_types')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBikes(data || []);
    } catch (error) {
      toast.error(t("businessMotorbikes.loadError"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAgain = async () => {
    if (!selectedBikeForRequest || !user) return;
    
    setRequestingAgainId(selectedBikeForRequest.id);
    try {
      // Create a new bike submission with the same data
      const { error } = await supabase
        .from('bike_types')
        .insert({
          name: selectedBikeForRequest.name,
          description: selectedBikeForRequest.description,
          daily_price: selectedBikeForRequest.daily_price,
          main_image_url: selectedBikeForRequest.main_image_url,
          owner_id: user.id,
          is_approved: false,
          is_original: false,
          approval_status: 'pending',
          business_status: 'active'
        });

      if (error) throw error;
      
      toast.success(t("businessMotorbikes.requestSuccess"));
      setShowRequestDialog(false);
      setSelectedBikeForRequest(null);
      fetchBikes();
    } catch (error) {
      toast.error(t("businessMotorbikes.requestError"));
      console.error(error);
    } finally {
      setRequestingAgainId(null);
    }
  };

  const filteredBikes = bikes.filter(bike =>
    bike.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = bikes.filter(b => b.approval_status === 'pending' && b.business_status !== 'admin_deleted').length;
  const approvedCount = bikes.filter(b => b.approval_status === 'approved' && b.business_status !== 'admin_deleted').length;
  const rejectedCount = bikes.filter(b => b.approval_status === 'rejected' || b.business_status === 'admin_deleted').length;

  const getStatusBadge = (bike: BikeType) => {
    // Check business_status first
    if (bike.business_status === 'admin_deleted') {
      return (
        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t("businessMotorbikes.removedByAdmin")}
        </Badge>
      );
    }
    
    switch (bike.approval_status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />{t("businessMotorbikes.pendingReview")}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />{t("businessMotorbikes.approved")}</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />{t("businessMotorbikes.rejected")}</Badge>;
      default:
        return <Badge variant="outline">{bike.approval_status}</Badge>;
    }
  };

  const canEdit = (bike: BikeType) => {
    return bike.approval_status === 'pending' && bike.business_status !== 'admin_deleted';
  };

  const canRequestAgain = (bike: BikeType) => {
    return bike.business_status === 'admin_deleted' || bike.approval_status === 'rejected';
  };

  const getLocaleCode = () => {
    switch (language) {
      case 'ar': return 'ar-MA';
      case 'fr': return 'fr-FR';
      default: return 'en-US';
    }
  };

  return (
    <BusinessLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bike className="h-6 w-6" />
              {t("businessMotorbikes.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("businessMotorbikes.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchBikes} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t("businessMotorbikes.refresh")}
            </Button>
            <Button onClick={() => navigate('/add-bike')}>
              <Plus className="h-4 w-4 mr-2" />
              {t("businessMotorbikes.addNewBike")}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="pt-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">{t("businessMotorbikes.pending")}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">{t("businessMotorbikes.approvedLabel")}</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10">
            <CardContent className="pt-4 text-center">
              <XCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
              <p className="text-sm text-muted-foreground">{t("businessMotorbikes.rejectedRemoved")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>{t("businessMotorbikes.yourBikes")}</CardTitle>
                <CardDescription>
                  {filteredBikes.length} {t("businessMotorbikes.bikesSubmitted")}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl-flip" />
                <Input
                  placeholder={t("businessMotorbikes.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rtl:pl-3 rtl:pr-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <BusinessMotorbikesSkeleton />
            ) : filteredBikes.length === 0 ? (
              <div className="text-center py-12">
                <Bike className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? t("businessMotorbikes.noBikesMatch") : t("businessMotorbikes.noBikesYet")}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate('/add-bike')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("businessMotorbikes.addFirstBike")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("businessMotorbikes.image")}</TableHead>
                      <TableHead>{t("businessMotorbikes.name")}</TableHead>
                      <TableHead>{t("businessMotorbikes.price")}</TableHead>
                      <TableHead>{t("businessMotorbikes.status")}</TableHead>
                      <TableHead>{t("businessMotorbikes.submitted")}</TableHead>
                      <TableHead className="text-right">{t("businessMotorbikes.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBikes.map((bike) => (
                      <TableRow key={bike.id} className={bike.business_status === 'admin_deleted' ? 'opacity-75' : ''}>
                        <TableCell>
                          <img 
                            src={bike.main_image_url} 
                            alt={bike.name}
                            className="h-12 w-16 rounded object-cover bg-muted"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{bike.name}</TableCell>
                        <TableCell>{bike.daily_price} DH/{t("businessMotorbikes.day")}</TableCell>
                        <TableCell>{getStatusBadge(bike)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(bike.created_at).toLocaleDateString(getLocaleCode())}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit(bike) && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate(`/edit-bike/${bike.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {t("businessMotorbikes.edit")}
                              </Button>
                            )}
                            {canRequestAgain(bike) && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedBikeForRequest(bike);
                                  setShowRequestDialog(true);
                                }}
                                disabled={requestingAgainId === bike.id}
                              >
                                {requestingAgainId === bike.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                )}
                                {t("businessMotorbikes.requestAgain")}
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
        </Card>
      </div>

      {/* Request Again Dialog */}
      <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("businessMotorbikes.requestDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("businessMotorbikes.requestDialogDescription").replace('{{name}}', selectedBikeForRequest?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("businessMotorbikes.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestAgain} disabled={requestingAgainId !== null}>
              {requestingAgainId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("businessMotorbikes.submitting")}
                </>
              ) : (
                t("businessMotorbikes.submitRequest")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BusinessLayout>
  );
};

export default BusinessMotorbikes;
