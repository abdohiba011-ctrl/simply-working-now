import { useState, useEffect, useCallback } from "react";
import { getErrCode } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trash2, 
  Star,
  Loader2,
  RefreshCw,
  Search,
  Building2,
  AlertTriangle,
  GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminTableSkeleton } from "@/components/ui/admin-skeleton";

interface ServiceLocation {
  id: string;
  name: string;
  city_id: string | null;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
}

interface ServiceCity {
  id: string;
  name: string;
  is_available: boolean;
}

export const AdminLocationsTab = () => {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCityId, setFilterCityId] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<ServiceLocation | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [newLocation, setNewLocation] = useState({ name: "", city_id: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ServiceLocation | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [locationsRes, citiesRes] = await Promise.all([
        supabase.from('service_locations').select('*').order('display_order', { ascending: true }),
        supabase.from('service_cities').select('id, name, is_available').order('name'),
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (citiesRes.error) throw citiesRes.error;
      
      setLocations(locationsRes.data || []);
      setCities(citiesRes.data || []);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    if (!newLocation.city_id) {
      toast.error("Please select a city");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_locations')
        .insert({ 
          name: newLocation.name.trim(),
          city_id: newLocation.city_id,
          display_order: locations.length + 1
        });

      if (error) throw error;
      toast.success("Location added successfully");
      setShowAddDialog(false);
      setNewLocation({ name: "", city_id: "" });
      fetchData();
    } catch (error: unknown) {
      if (getErrCode(error) === '23505') {
        toast.error("This location already exists");
      } else {
        toast.error("Failed to add location");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('service_locations')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(isActive ? "Location activated" : "Location deactivated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update location");
    }
  };

  const handleTogglePopular = async (id: string, isPopular: boolean) => {
    try {
      const { error } = await supabase
        .from('service_locations')
        .update({ is_popular: isPopular })
        .eq('id', id);

      if (error) throw error;
      toast.success(isPopular ? "Added to popular" : "Removed from popular");
      fetchData();
    } catch (error) {
      toast.error("Failed to update location");
    }
  };

  const handleDeleteClick = async (location: ServiceLocation) => {
    // Check if there's inventory linked to this location
    const { count, error } = await supabase
      .from('bike_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', location.id);

    if (error) {
      toast.error("Failed to check inventory");
      return;
    }

    setInventoryCount(count || 0);
    setDeletingLocation(location);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;

    try {
      const { error } = await supabase
        .from('service_locations')
        .delete()
        .eq('id', deletingLocation.id);

      if (error) throw error;
      toast.success("Location deleted");
      setShowDeleteDialog(false);
      setDeletingLocation(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete location. It may have linked inventory.");
    }
  };

  const getCityName = (cityId: string | null) => {
    if (!cityId) return 'No City';
    const city = cities.find(c => c.id === cityId);
    return city?.name || 'Unknown';
  };

  const isCityAvailable = (cityId: string | null) => {
    if (!cityId) return false;
    const city = cities.find(c => c.id === cityId);
    return city?.is_available ?? false;
  };

  // Only show available cities in add dialog
  const availableCities = cities.filter(c => c.is_available);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, location: ServiceLocation) => {
    setDraggedItem(location);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', location.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, locationId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(locationId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverItemId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetLocation: ServiceLocation) => {
    e.preventDefault();
    setDragOverItemId(null);

    if (!draggedItem || draggedItem.id === targetLocation.id) {
      setDraggedItem(null);
      return;
    }

    // Only allow reordering within the same city
    if (draggedItem.city_id !== targetLocation.city_id) {
      toast.error("Can only reorder locations within the same city");
      setDraggedItem(null);
      return;
    }

    // Get locations for this city only
    const cityLocations = locations
      .filter(l => l.city_id === draggedItem.city_id)
      .sort((a, b) => a.display_order - b.display_order);

    const draggedIndex = cityLocations.findIndex(l => l.id === draggedItem.id);
    const targetIndex = cityLocations.findIndex(l => l.id === targetLocation.id);

    // Reorder the array
    const reordered = [...cityLocations];
    reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    // Update display_order for all affected items
    const updates = reordered.map((loc, index) => ({
      id: loc.id,
      display_order: index + 1
    }));

    try {
      // Update each location's display_order
      for (const update of updates) {
        const { error } = await supabase
          .from('service_locations')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      toast.success("Location order updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update location order");
      console.error(error);
    }

    setDraggedItem(null);
  }, [draggedItem, locations, fetchData]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItemId(null);
  }, []);

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCityId === "all" || loc.city_id === filterCityId;
    return matchesSearch && matchesCity;
  });

  const activeCount = locations.filter(l => l.is_active).length;
  const popularCount = locations.filter(l => l.is_popular).length;
  const withCityCount = locations.filter(l => l.city_id).length;

  return (
    <div className="space-y-6">
      {/* Stats - Compact Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default"
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Total: {locations.length}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-success/10 text-success border-success/30 dark:bg-success/10 dark:text-success dark:border-success/40"
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Active: {activeCount}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-warning/10 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/40"
        >
          <Star className="h-3.5 w-3.5 mr-1.5" />
          Popular: {popularCount}
        </Badge>
        <Badge 
          variant="outline"
          className="px-3 py-1.5 text-sm cursor-default bg-info/10 text-info border-info/30 dark:bg-info/10 dark:text-info dark:border-info/40"
        >
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          With City: {withCityCount}
        </Badge>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative w-full md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCityId} onValueChange={setFilterCityId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Locations</CardTitle>
          <CardDescription>
            Manage locations available for bike rentals. Drag and drop to reorder locations within the same city.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No locations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Location Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Popular</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => (
                  <TableRow 
                    key={location.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, location)}
                    onDragOver={(e) => handleDragOver(e, location.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, location)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-move transition-colors ${
                      dragOverItemId === location.id ? 'bg-primary/10 border-primary' : ''
                    } ${draggedItem?.id === location.id ? 'opacity-50' : ''}`}
                  >
                    <TableCell className="w-10">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.name}</span>
                        {location.is_popular && (
                          <Badge variant="outline" className="text-warning border-warning">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={location.city_id ? "secondary" : "outline"}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {getCityName(location.city_id)}
                        </Badge>
                        {location.city_id && !isCityAvailable(location.city_id) && (
                          <Badge variant="outline" className="text-warning border-warning bg-warning/10 dark:bg-warning/10">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            City Not Available
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={location.is_active}
                        onCheckedChange={(checked) => handleToggleActive(location.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={location.is_popular}
                        onCheckedChange={(checked) => handleTogglePopular(location.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(location)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Location Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Add a new service location. It must belong to an available city.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City * (only available cities shown)</Label>
              {availableCities.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning dark:bg-warning/10 dark:border-warning/40 dark:text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">No available cities. Please enable a city first in the Cities tab.</span>
                </div>
              ) : (
                <Select
                  value={newLocation.city_id}
                  onValueChange={(value) => setNewLocation({ ...newLocation, city_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an available city" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Location Name *</Label>
              <Input
                placeholder="e.g., Maarif, Ain Diab, etc."
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation} disabled={isSaving || availableCities.length === 0}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {inventoryCount > 0 && <AlertTriangle className="h-5 w-5 text-warning" />}
              Delete Location
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inventoryCount > 0 ? (
                <>
                  <span className="text-warning font-medium">Warning:</span> This location has {inventoryCount} inventory record(s) linked to it.
                  Deleting will remove the location reference from those records.
                </>
              ) : (
                <>Are you sure you want to delete "{deletingLocation?.name}"? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
