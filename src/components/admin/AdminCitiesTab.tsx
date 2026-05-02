import { useState, useEffect, useMemo } from "react";
import { getErrCode } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Clock,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Star,
  Building2,
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

interface ServiceLocation {
  id: string;
  name: string;
  city_id: string | null;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
}

const generateNameKey = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

const emptyNewCity = {
  name: "",
  image_url: "" as string | null,
  price_from: 80,
  is_available: false,
  is_coming_soon: true,
  show_in_homepage: true,
};

export const AdminCitiesTab = () => {
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [liveCounts, setLiveCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // City dialogs
  const [showAddCityDialog, setShowAddCityDialog] = useState(false);
  const [showEditCityDialog, setShowEditCityDialog] = useState(false);
  const [showDeleteCityDialog, setShowDeleteCityDialog] = useState(false);
  const [editingCity, setEditingCity] = useState<ServiceCity | null>(null);
  const [deletingCity, setDeletingCity] = useState<ServiceCity | null>(null);
  const [deletingCityLocationCount, setDeletingCityLocationCount] = useState(0);
  const [newCity, setNewCity] = useState(emptyNewCity);

  // Neighborhood dialogs
  const [addNeighborhoodCityId, setAddNeighborhoodCityId] = useState<string | null>(null);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState("");
  const [editingNeighborhood, setEditingNeighborhood] = useState<ServiceLocation | null>(null);
  const [editingNeighborhoodName, setEditingNeighborhoodName] = useState("");
  const [deletingNeighborhood, setDeletingNeighborhood] = useState<ServiceLocation | null>(null);
  const [neighborhoodInventoryCount, setNeighborhoodInventoryCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);

  useServiceCitiesRealtime();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchLiveCounts = async () => {
    const { data, error } = await supabase
      .from("city_bike_counts" as any)
      .select("city_id, bikes_available");
    if (error) {
      console.error("Failed to load live bike counts", error);
      return;
    }
    const map = new Map<string, number>();
    ((data as unknown) as Array<{ city_id: string; bikes_available: number }> | null)?.forEach((row) => {
      map.set(row.city_id, Number(row.bikes_available) || 0);
    });
    setLiveCounts(map);
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [citiesRes, locationsRes] = await Promise.all([
        supabase.from("service_cities").select("*").order("display_order", { ascending: true }),
        supabase.from("service_locations").select("*").order("display_order", { ascending: true }),
      ]);
      if (citiesRes.error) throw citiesRes.error;
      if (locationsRes.error) throw locationsRes.error;
      setCities(citiesRes.data || []);
      setLocations(locationsRes.data || []);
      fetchLiveCounts();
    } catch (error) {
      toast.error("Failed to load cities and neighborhoods");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- City actions ----------
  const handleAddCity = async () => {
    if (!newCity.name.trim()) {
      toast.error("Please enter a city name");
      return;
    }
    setIsSaving(true);
    try {
      const insertPayload = {
        name: newCity.name.trim(),
        name_key: generateNameKey(newCity.name),
        image_url: newCity.image_url || null,
        price_from: newCity.price_from,
        is_available: newCity.is_available,
        is_coming_soon: newCity.is_coming_soon,
        show_in_homepage: newCity.show_in_homepage,
        display_order: cities.length + 1,
      };
      const { data, error } = await supabase
        .from("service_cities")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw error;
      await supabase.rpc("log_audit_event", {
        _action: "city_created",
        _table_name: "service_cities",
        _record_id: data?.id ?? null,
        _details: { new_value: insertPayload } as never,
      });
      toast.success("City added");
      setShowAddCityDialog(false);
      setNewCity(emptyNewCity);
      fetchAll();
    } catch (error: unknown) {
      if (getErrCode(error) === "23505") toast.error("A city with this name already exists");
      else toast.error("Failed to add city");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEditCity = async () => {
    if (!editingCity) return;
    setIsSaving(true);
    try {
      const oldCity = cities.find((c) => c.id === editingCity.id);
      const updatePayload = {
        name: editingCity.name,
        image_url: editingCity.image_url,
        price_from: editingCity.price_from,
        is_available: editingCity.is_available,
        is_coming_soon: editingCity.is_coming_soon,
        show_in_homepage: editingCity.show_in_homepage,
      };
      const { error } = await supabase
        .from("service_cities")
        .update(updatePayload)
        .eq("id", editingCity.id);
      if (error) throw error;
      await supabase.rpc("log_audit_event", {
        _action: "city_updated",
        _table_name: "service_cities",
        _record_id: editingCity.id,
        _details: { old_value: oldCity, new_value: updatePayload } as never,
      });
      toast.success("City updated");
      setShowEditCityDialog(false);
      setEditingCity(null);
      fetchAll();
    } catch {
      toast.error("Failed to update city");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCityClick = (city: ServiceCity) => {
    const count = locations.filter((l) => l.city_id === city.id).length;
    setDeletingCityLocationCount(count);
    setDeletingCity(city);
    setShowDeleteCityDialog(true);
  };

  const handleDeleteCity = async () => {
    if (!deletingCity) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("service_cities").delete().eq("id", deletingCity.id);
      if (error) throw error;
      toast.success("City deleted");
      setShowDeleteCityDialog(false);
      setDeletingCity(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete city");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (city: ServiceCity) => {
    const newIsAvailable = !city.is_available;
    try {
      const { error } = await supabase
        .from("service_cities")
        .update({ is_available: newIsAvailable, is_coming_soon: !newIsAvailable })
        .eq("id", city.id);
      if (error) throw error;
      toast.success(newIsAvailable ? "City set to available" : "City set to coming soon");
      fetchAll();
    } catch {
      toast.error("Failed to update city");
    }
  };

  const handleToggleHomepage = async (id: string, show: boolean) => {
    try {
      const { error } = await supabase
        .from("service_cities")
        .update({ show_in_homepage: show })
        .eq("id", id);
      if (error) throw error;
      toast.success(show ? "City shown on homepage" : "City hidden from homepage");
      fetchAll();
    } catch {
      toast.error("Failed to update city");
    }
  };

  // ---------- Neighborhood actions ----------
  const handleAddNeighborhood = async () => {
    if (!addNeighborhoodCityId || !newNeighborhoodName.trim()) {
      toast.error("Please enter a neighborhood name");
      return;
    }
    setIsSaving(true);
    try {
      const cityCount = locations.filter((l) => l.city_id === addNeighborhoodCityId).length;
      const { error } = await supabase.from("service_locations").insert({
        name: newNeighborhoodName.trim(),
        city_id: addNeighborhoodCityId,
        display_order: cityCount + 1,
      });
      if (error) throw error;
      toast.success("Neighborhood added");
      setAddNeighborhoodCityId(null);
      setNewNeighborhoodName("");
      fetchAll();
    } catch (error: unknown) {
      if (getErrCode(error) === "23505") toast.error("This neighborhood already exists");
      else toast.error("Failed to add neighborhood");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEditNeighborhood = async () => {
    if (!editingNeighborhood || !editingNeighborhoodName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("service_locations")
        .update({ name: editingNeighborhoodName.trim() })
        .eq("id", editingNeighborhood.id);
      if (error) throw error;
      toast.success("Neighborhood renamed");
      setEditingNeighborhood(null);
      setEditingNeighborhoodName("");
      fetchAll();
    } catch {
      toast.error("Failed to rename neighborhood");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNeighborhoodActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("service_locations")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
      fetchAll();
    } catch {
      toast.error("Failed to update neighborhood");
    }
  };

  const handleToggleNeighborhoodPopular = async (id: string, isPopular: boolean) => {
    try {
      const { error } = await supabase
        .from("service_locations")
        .update({ is_popular: isPopular })
        .eq("id", id);
      if (error) throw error;
      fetchAll();
    } catch {
      toast.error("Failed to update neighborhood");
    }
  };

  const handleDeleteNeighborhoodClick = async (loc: ServiceLocation) => {
    const { count } = await supabase
      .from("bike_inventory")
      .select("*", { count: "exact", head: true })
      .eq("location_id", loc.id);
    setNeighborhoodInventoryCount(count || 0);
    setDeletingNeighborhood(loc);
  };

  const handleDeleteNeighborhood = async () => {
    if (!deletingNeighborhood) return;
    try {
      const { error } = await supabase
        .from("service_locations")
        .delete()
        .eq("id", deletingNeighborhood.id);
      if (error) throw error;
      toast.success("Neighborhood deleted");
      setDeletingNeighborhood(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete neighborhood");
    }
  };

  // ---------- Derived ----------
  const locationsByCityId = useMemo(() => {
    const map = new Map<string, ServiceLocation[]>();
    locations.forEach((loc) => {
      if (!loc.city_id) return;
      const list = map.get(loc.city_id) || [];
      list.push(loc);
      map.set(loc.city_id, list);
    });
    return map;
  }, [locations]);

  const filteredCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      const hoods = locationsByCityId.get(c.id) || [];
      return hoods.some((h) => h.name.toLowerCase().includes(q));
    });
  }, [cities, locationsByCityId, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const availableCount = cities.filter((c) => c.is_available).length;
  const comingSoonCount = cities.filter((c) => c.is_coming_soon).length;
  const homepageCount = cities.filter((c) => c.show_in_homepage).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="px-3 py-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Cities: {cities.length}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          Neighborhoods: {locations.length}
        </Badge>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-sm bg-success/10 text-success border-success/30"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Available: {availableCount}
        </Badge>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-sm bg-warning/10 text-warning border-warning/30"
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Coming Soon: {comingSoonCount}
        </Badge>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-sm bg-info/10 text-info border-info/30"
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
            placeholder="Search cities or neighborhoods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddCityDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
        </div>
      </div>

      {/* Cities + neighborhoods */}
      <Card>
        <CardHeader>
          <CardTitle>Cities & Neighborhoods</CardTitle>
          <CardDescription>
            Manage cities and the neighborhoods inside each one. Changes apply immediately to the renter and agency sides.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : filteredCities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No cities found</div>
          ) : (
            <div className="space-y-3">
              {filteredCities.map((city) => {
                const isOpen = expanded.has(city.id);
                const hoods = locationsByCityId.get(city.id) || [];
                const liveBikes = liveCounts.get(city.id) ?? 0;

                return (
                  <div
                    key={city.id}
                    className="border rounded-lg overflow-hidden bg-card"
                  >
                    {/* City row */}
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleExpand(city.id)}
                        className="p-1 rounded hover:bg-muted"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {city.image_url ? (
                        <img
                          src={city.image_url}
                          alt={city.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{city.name}</span>
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
                          {city.show_in_homepage && (
                            <Badge variant="outline" className="text-info border-info/40">
                              <Eye className="h-3 w-3 mr-1" />
                              Homepage
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {liveBikes} bike{liveBikes === 1 ? "" : "s"} · {hoods.length} neighborhood
                          {hoods.length === 1 ? "" : "s"} · From {city.price_from} DH/day
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Homepage</Label>
                        <Switch
                          checked={city.show_in_homepage}
                          onCheckedChange={(checked) => handleToggleHomepage(city.id, checked)}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAvailability(city)}
                        title={city.is_available ? "Set Coming Soon" : "Set Available"}
                      >
                        {city.is_available ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCity({ ...city });
                          setShowEditCityDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteCityClick(city)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Neighborhoods */}
                    {isOpen && (
                      <div className="border-t bg-muted/20 p-3 space-y-2">
                        {hoods.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic px-1">
                            No neighborhoods yet for {city.name}.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {hoods.map((loc) => (
                              <div
                                key={loc.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-md bg-background border"
                              >
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium flex-1 truncate">{loc.name}</span>
                                {loc.is_popular && (
                                  <Badge
                                    variant="outline"
                                    className="text-warning border-warning/40 hidden sm:inline-flex"
                                  >
                                    <Star className="h-3 w-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground hidden sm:inline">
                                    Popular
                                  </Label>
                                  <Switch
                                    checked={loc.is_popular}
                                    onCheckedChange={(checked) =>
                                      handleToggleNeighborhoodPopular(loc.id, checked)
                                    }
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground hidden sm:inline">
                                    Active
                                  </Label>
                                  <Switch
                                    checked={loc.is_active}
                                    onCheckedChange={(checked) =>
                                      handleToggleNeighborhoodActive(loc.id, checked)
                                    }
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNeighborhood(loc);
                                    setEditingNeighborhoodName(loc.name);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNeighborhoodClick(loc)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setAddNeighborhoodCityId(city.id);
                            setNewNeighborhoodName("");
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add neighborhood to {city.name}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add City Dialog */}
      <Dialog open={showAddCityDialog} onOpenChange={setShowAddCityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
            <DialogDescription>Add a new service city visible on the renter and agency sides.</DialogDescription>
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
            <div className="space-y-2">
              <Label>Price From (DH/day)</Label>
              <Input
                type="number"
                value={newCity.price_from}
                onChange={(e) =>
                  setNewCity({ ...newCity, price_from: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Bike count is calculated automatically from real listings.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label>Is Available (not coming soon)</Label>
              <Switch
                checked={newCity.is_available}
                onCheckedChange={(checked) =>
                  setNewCity({ ...newCity, is_available: checked, is_coming_soon: !checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label>Show on Homepage</Label>
              <Switch
                checked={newCity.show_in_homepage}
                onCheckedChange={(checked) =>
                  setNewCity({ ...newCity, show_in_homepage: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCityDialog(false)}>
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
      <Dialog open={showEditCityDialog} onOpenChange={setShowEditCityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City — {editingCity?.name}</DialogTitle>
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
                </div>
                <div className="space-y-2">
                  <Label>Price From (DH/day)</Label>
                  <Input
                    type="number"
                    value={editingCity.price_from}
                    onChange={(e) =>
                      setEditingCity({
                        ...editingCity,
                        price_from: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Is Available (not coming soon)</Label>
                <Switch
                  checked={editingCity.is_available}
                  onCheckedChange={(checked) =>
                    setEditingCity({
                      ...editingCity,
                      is_available: checked,
                      is_coming_soon: !checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Show on Homepage</Label>
                <Switch
                  checked={editingCity.show_in_homepage}
                  onCheckedChange={(checked) =>
                    setEditingCity({ ...editingCity, show_in_homepage: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditCity} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete City Dialog */}
      <AlertDialog open={showDeleteCityDialog} onOpenChange={setShowDeleteCityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deletingCityLocationCount > 0 && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Delete City
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deletingCityLocationCount > 0 ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive font-medium">Cannot delete this city.</p>
                    <p className="text-sm mt-1">
                      <strong>{deletingCity?.name}</strong> has {deletingCityLocationCount}{" "}
                      neighborhood(s). Delete or reassign them first.
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete <strong>{deletingCity?.name}</strong>? This
                    action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCity(null)}>
              {deletingCityLocationCount > 0 ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {deletingCityLocationCount === 0 && (
              <AlertDialogAction
                onClick={handleDeleteCity}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Neighborhood Dialog */}
      <Dialog
        open={addNeighborhoodCityId !== null}
        onOpenChange={(open) => !open && setAddNeighborhoodCityId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Neighborhood
              {addNeighborhoodCityId &&
                ` to ${cities.find((c) => c.id === addNeighborhoodCityId)?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Add a neighborhood inside this city. It will be available to renters and agencies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Neighborhood Name *</Label>
              <Input
                placeholder="e.g., Maarif, Ain Diab"
                value={newNeighborhoodName}
                onChange={(e) => setNewNeighborhoodName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNeighborhoodCityId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNeighborhood}
              disabled={isSaving || !newNeighborhoodName.trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Neighborhood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Neighborhood Dialog */}
      <Dialog
        open={editingNeighborhood !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingNeighborhood(null);
            setEditingNeighborhoodName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Neighborhood</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Neighborhood Name *</Label>
              <Input
                value={editingNeighborhoodName}
                onChange={(e) => setEditingNeighborhoodName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingNeighborhood(null);
                setEditingNeighborhoodName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditNeighborhood}
              disabled={isSaving || !editingNeighborhoodName.trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Neighborhood Dialog */}
      <AlertDialog
        open={deletingNeighborhood !== null}
        onOpenChange={(open) => !open && setDeletingNeighborhood(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {neighborhoodInventoryCount > 0 && (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              Delete Neighborhood
            </AlertDialogTitle>
            <AlertDialogDescription>
              {neighborhoodInventoryCount > 0 ? (
                <>
                  <span className="text-warning font-medium">Warning:</span> This neighborhood has{" "}
                  {neighborhoodInventoryCount} inventory record(s) linked to it. Deleting will
                  remove the reference from those records.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{deletingNeighborhood?.name}"? This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNeighborhood}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
