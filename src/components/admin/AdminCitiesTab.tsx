import { useState, useEffect } from "react";
import { getErrCode } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
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
  MapPin, 
  Plus, 
  Edit,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CityImageUpload } from "./CityImageUpload";
import { useServiceCitiesRealtime } from "@/hooks/useBikeTypesRealtime";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

interface ServiceCity {
  id: string;
  name: string;
  name_key: string;
  image_url: string | null;
  bikes_count: number;
  price_from: number;
  is_available: boolean;
  is_coming_soon: boolean;
  show_in_homepage: boolean;
  display_order: number;
}

const generateNameKey = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export const AdminCitiesTab = () => {
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [liveCounts, setLiveCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCity, setEditingCity] = useState<ServiceCity | null>(null);
  const [deletingCity, setDeletingCity] = useState<ServiceCity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCityLocationCount, setDeletingCityLocationCount] = useState(0);
  
  // Enable real-time updates
  useServiceCitiesRealtime();
  
  // New city form state
  const [newCity, setNewCity] = useState({
    name: '',
    image_url: '' as string | null,
    bikes_count: 0,
    price_from: 80,
    is_available: false,
    is_coming_soon: true,
    show_in_homepage: true
  });

  useEffect(() => {
    fetchCities();
    fetchLiveCounts();
  }, []);

  const fetchLiveCounts = async () => {
    const { data, error } = await supabase
      .from('city_bike_counts' as any)
      .select('city_id, bikes_available');
    if (error) {
      console.error('Failed to load live bike counts', error);
      return;
    }
    const map = new Map<string, number>();
    ((data as unknown) as Array<{ city_id: string; bikes_available: number }> | null)?.forEach((row) => {
      map.set(row.city_id, Number(row.bikes_available) || 0);
    });
    setLiveCounts(map);
  };

  const fetchCities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_cities')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCities(data || []);
      // Refresh live counts whenever we refresh the list
      fetchLiveCounts();
    } catch (error) {
      toast.error("Failed to load cities");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (city: ServiceCity) => {
    setEditingCity({ ...city });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCity) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_cities')
        .update({
          name: editingCity.name,
          image_url: editingCity.image_url,
          // bikes_count intentionally not written — value is now computed live from bike_types
          price_from: editingCity.price_from,
          is_available: editingCity.is_available,
          is_coming_soon: editingCity.is_coming_soon,
          show_in_homepage: editingCity.show_in_homepage,
        })
        .eq('id', editingCity.id);

      if (error) throw error;
      toast.success("City updated successfully");
      setShowEditDialog(false);
      setEditingCity(null);
      fetchCities();
    } catch (error) {
      toast.error("Failed to update city");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCity = async () => {
    if (!newCity.name.trim()) {
      toast.error("Please enter a city name");
      return;
    }

    setIsSaving(true);
    try {
      const nameKey = generateNameKey(newCity.name);
      const displayOrder = cities.length + 1;
      
      const { error } = await supabase
        .from('service_cities')
        .insert({
          name: newCity.name.trim(),
          name_key: nameKey,
          image_url: newCity.image_url || null,
          bikes_count: newCity.bikes_count,
          price_from: newCity.price_from,
          is_available: newCity.is_available,
          is_coming_soon: newCity.is_coming_soon,
          show_in_homepage: newCity.show_in_homepage,
          display_order: displayOrder
        });

      if (error) throw error;
      toast.success("City added successfully");
      setShowAddDialog(false);
      setNewCity({
        name: '',
        image_url: '',
        bikes_count: 0,
        price_from: 80,
        is_available: false,
        is_coming_soon: true,
        show_in_homepage: true
      });
      fetchCities();
    } catch (error: unknown) {
      if (getErrCode(error) === '23505') {
        toast.error("A city with this name already exists");
      } else {
        toast.error("Failed to add city");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCity = async () => {
    if (!deletingCity) return;

    // Check for locations first
    const { count: locationCount } = await supabase
      .from('service_locations')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', deletingCity.id);

    if (locationCount && locationCount > 0) {
      toast.error(`Cannot delete city - it has ${locationCount} location(s). Please reassign or delete them first.`);
      setShowDeleteDialog(false);
      setDeletingCity(null);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_cities')
        .delete()
        .eq('id', deletingCity.id);

      if (error) throw error;
      toast.success("City deleted successfully");
      setShowDeleteDialog(false);
      setDeletingCity(null);
      fetchCities();
    } catch (error) {
      toast.error("Failed to delete city");
    } finally {
      setIsSaving(false);
    }
  };

  const checkCityHasLocations = async (cityId: string): Promise<number> => {
    const { count } = await supabase
      .from('service_locations')
      .select('*', { count: 'exact', head: true })
      .eq('city_id', cityId);
    return count || 0;
  };

  const handleDeleteClick = async (city: ServiceCity) => {
    const locationCount = await checkCityHasLocations(city.id);
    setDeletingCityLocationCount(locationCount);
    setDeletingCity(city);
    setShowDeleteDialog(true);
  };

  const handleToggleAvailability = async (city: ServiceCity) => {
    const newIsAvailable = !city.is_available;
    try {
      const { error } = await supabase
        .from('service_cities')
        .update({ 
          is_available: newIsAvailable,
          is_coming_soon: newIsAvailable ? false : true
        })
        .eq('id', city.id);

      if (error) throw error;
      toast.success(newIsAvailable ? "City set to available" : "City set to coming soon");
      fetchCities();
    } catch (error) {
      toast.error("Failed to update city");
    }
  };

  const handleToggleHomepage = async (id: string, show: boolean) => {
    try {
      const { error } = await supabase
        .from('service_cities')
        .update({ show_in_homepage: show })
        .eq('id', id);

      if (error) throw error;
      toast.success(show ? "City will show on homepage" : "City hidden from homepage");
      fetchCities();
    } catch (error) {
      toast.error("Failed to update city");
    }
  };

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = cities.filter(c => c.is_available).length;
  const comingSoonCount = cities.filter(c => c.is_coming_soon).length;
  const homepageCount = cities.filter(c => c.show_in_homepage).length;

  return (
    <div className="space-y-6">
      {/* Stats - Compact Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default"
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Total: {cities.length}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-success/10 text-success border-success/30 dark:bg-success/10 dark:text-success dark:border-success/40"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Available: {availableCount}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-warning/10 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/40"
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Coming Soon: {comingSoonCount}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-info/10 text-info border-info/30 dark:bg-info/10 dark:text-info dark:border-info/40"
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          On Homepage: {homepageCount}
        </Badge>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCities} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Cities</CardTitle>
          <CardDescription>
            Manage cities displayed on the homepage. Changes affect client-side immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : filteredCities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No cities found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Bikes</TableHead>
                  <TableHead>Price From</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Homepage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCities.map((city) => (
                  <TableRow key={city.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {city.image_url ? (
                          <img 
                            src={city.image_url} 
                            alt={city.name}
                            className="w-10 h-10 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{city.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{liveCounts.get(city.id) ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Live</span>
                      </div>
                    </TableCell>
                    <TableCell>{city.price_from} DH/day</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAvailability(city)}
                        className={city.is_available ? "text-success" : "text-warning"}
                      >
                        {city.is_available ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge className="bg-warning/10 text-warning border-warning/20">
                            <Clock className="h-3 w-3 mr-1" />
                            Coming Soon
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={city.show_in_homepage}
                        onCheckedChange={(checked) => handleToggleHomepage(city.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(city)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(city)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add City Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
            <DialogDescription>
              Add a new service city. It will be visible on the client side.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City Name *</Label>
              <Input
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                placeholder="e.g., Agadir"
              />
            </div>
            <div className="space-y-2">
              <Label>City Image</Label>
              <CityImageUpload
                currentImageUrl={newCity.image_url}
                onImageChange={(url) => setNewCity({ ...newCity, image_url: url })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Price From (DH/day)</Label>
                <Input
                  type="number"
                  value={newCity.price_from}
                  onChange={(e) => setNewCity({ ...newCity, price_from: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Bike count is calculated automatically from real listings — no manual entry.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label>Is Available (not coming soon)</Label>
              <Switch
                checked={newCity.is_available}
                onCheckedChange={(checked) => setNewCity({ 
                  ...newCity, 
                  is_available: checked,
                  is_coming_soon: !checked
                })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label>Show on Homepage</Label>
              <Switch
                checked={newCity.show_in_homepage}
                onCheckedChange={(checked) => setNewCity({ ...newCity, show_in_homepage: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCity} disabled={isSaving || !newCity.name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City - {editingCity?.name}</DialogTitle>
          </DialogHeader>
          {editingCity && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>City Name</Label>
                <Input
                  value={editingCity.name}
                  onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>City Image</Label>
                <CityImageUpload
                  cityId={editingCity.id}
                  currentImageUrl={editingCity.image_url}
                  onImageChange={(url) => setEditingCity({ ...editingCity, image_url: url })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Live Bikes</Label>
                  <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm">
                    {liveCounts.get(editingCity.id) ?? 0} bikes
                  </div>
                  <p className="text-[11px] text-muted-foreground">Auto from listings</p>
                </div>
                <div className="space-y-2">
                  <Label>Price From (DH/day)</Label>
                  <Input
                    type="number"
                    value={editingCity.price_from}
                    onChange={(e) => setEditingCity({ ...editingCity, price_from: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Is Available (not coming soon)</Label>
                <Switch
                  checked={editingCity.is_available}
                  onCheckedChange={(checked) => setEditingCity({ 
                    ...editingCity, 
                    is_available: checked,
                    is_coming_soon: !checked
                  })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Show on Homepage</Label>
                <Switch
                  checked={editingCity.show_in_homepage}
                  onCheckedChange={(checked) => setEditingCity({ ...editingCity, show_in_homepage: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deletingCityLocationCount > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
              Delete City
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deletingCityLocationCount > 0 ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive font-medium">
                      Cannot delete this city!
                    </p>
                    <p className="text-sm mt-1">
                      <strong>{deletingCity?.name}</strong> has {deletingCityLocationCount} location(s) assigned. 
                      Please reassign or delete them from the Locations tab first.
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete <strong>{deletingCity?.name}</strong>? 
                    This action cannot be undone and will remove the city from the homepage.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCity(null)}>
              {deletingCityLocationCount > 0 ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {deletingCityLocationCount === 0 && (
              <AlertDialogAction 
                onClick={handleDeleteCity}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};