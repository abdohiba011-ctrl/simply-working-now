import { useState, useEffect } from "react";
import { getErrCode } from "@/lib/errorMessages";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus,
  MapPin,
  Trash2,
  Star,
  Upload,
  X,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ImageUpload, UploadedImage } from "@/components/admin/ImageUpload";
import { deleteBikeImage } from "@/lib/imageUpload";
import { AdminBikeTypeDetailsSkeleton } from "@/components/ui/admin-skeleton";

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
  city_id: string | null;
}

interface BikeInventory {
  id: string;
  bike_type_id: string;
  location: string;
  location_id: string | null;
  city_id: string | null;
  quantity: number;
  available_quantity: number;
}

interface BikeTypeImage {
  id: string;
  bike_type_id: string;
  image_url: string;
  display_order: number;
}

interface ServiceCity {
  id: string;
  name: string;
}

interface ServiceLocation {
  id: string;
  name: string;
  city_id: string | null;
}

const AdminBikeTypeDetails = () => {
  const navigate = useNavigate();
  const { id: bikeId } = useParams();
  const { isAuthenticated, hasRole } = useAuth();
  const isNewBike = bikeId === 'new';
  
  const [isLoading, setIsLoading] = useState(!isNewBike);
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inventory, setInventory] = useState<BikeInventory[]>([]);
  const [galleryImages, setGalleryImages] = useState<BikeTypeImage[]>([]);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [newInventory, setNewInventory] = useState({ 
    location_id: '', 
    city_id: '',
    quantity: 0, 
    available_quantity: 0 
  });
  
  const [formData, setFormData] = useState<Partial<BikeType>>({
    name: '',
    description: '',
    daily_price: 0,
    main_image_url: '',
    features: [],
    rating: 5,
    is_original: true,
    is_approved: true,
    approval_status: 'approved',
    city_id: null,
  });
  const [featuresText, setFeaturesText] = useState('');

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
      fetchCitiesAndLocations();
      if (!isNewBike && bikeId) {
        fetchBikeType();
        fetchInventory();
        fetchGalleryImages();
      }
    };
    checkAccess();
  }, [isAuthenticated, hasRole, navigate, bikeId, isNewBike]);

  const fetchCitiesAndLocations = async () => {
    try {
      const [citiesRes, locationsRes] = await Promise.all([
        supabase.from('service_cities').select('id, name').order('name'),
        supabase.from('service_locations').select('id, name, city_id').eq('is_active', true).order('name'),
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (locationsRes.error) throw locationsRes.error;
      
      setCities(citiesRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error fetching cities/locations:', error);
    }
  };

  const fetchBikeType = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bike_types')
        .select('*')
        .eq('id', bikeId)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      setFormData(data as BikeType);
      const featuresArr = Array.isArray(data.features) ? data.features : [];
      setFeaturesText(featuresArr.map(String).join('\n'));
    } catch (error) {
      setNotFound(true);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('bike_inventory')
        .select('*')
        .eq('bike_type_id', bikeId)
        .order('location');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('bike_type_images')
        .select('*')
        .eq('bike_type_id', bikeId)
        .order('display_order');

      if (error) throw error;
      setGalleryImages(data || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
    }
  };

  // Convert main image to UploadedImage format for the component
  const mainImageAsUploadedImages: UploadedImage[] = formData.main_image_url 
    ? [{ id: 'main', url: formData.main_image_url, isPrimary: true, displayOrder: 0 }]
    : [];

  const handleMainImagesChange = (images: UploadedImage[]) => {
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    setFormData({ ...formData, main_image_url: primaryImage?.url || '' });
  };

  // Convert gallery images to UploadedImage format
  const galleryAsUploadedImages: UploadedImage[] = galleryImages.map(img => ({
    id: img.id,
    url: img.image_url,
    isPrimary: false,
    displayOrder: img.display_order,
  }));

  const handleGalleryImagesChange = async (images: UploadedImage[]) => {
    if (!bikeId || isNewBike) return;
    
    try {
      // Find new images (those with temp IDs)
      const newImages = images.filter(img => img.id.startsWith('temp-'));
      const existingImages = images.filter(img => !img.id.startsWith('temp-'));
      
      // Insert new images
      if (newImages.length > 0) {
        const inserts = newImages.map((img, idx) => ({
          bike_type_id: bikeId,
          image_url: img.url,
          display_order: existingImages.length + idx + 1,
        }));

        const { error } = await supabase
          .from('bike_type_images')
          .insert(inserts);

        if (error) throw error;
      }
      
      fetchGalleryImages();
    } catch (error) {
      toast.error("Failed to update gallery images");
    }
  };

  const handleDeleteGalleryImage = async (image: BikeTypeImage) => {
    try {
      // Delete from storage
      await deleteBikeImage(image.image_url);
      
      // Delete from database
      const { error } = await supabase
        .from('bike_type_images')
        .delete()
        .eq('id', image.id);

      if (error) throw error;
      fetchGalleryImages();
      toast.success("Image deleted");
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.main_image_url || !formData.daily_price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const features = featuresText.split('\n').filter(f => f.trim());
      const dataToSave = {
        name: formData.name,
        description: formData.description,
        daily_price: Number(formData.daily_price),
        main_image_url: formData.main_image_url,
        features,
        rating: Number(formData.rating) || 5,
        is_original: formData.is_original,
        is_approved: formData.is_approved,
        approval_status: formData.approval_status,
        city_id: formData.city_id || null,
      };

      if (isNewBike) {
        const { data, error } = await supabase
          .from('bike_types')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        toast.success("Bike type created successfully");
        navigate(`/admin/fleet/${data.id}`);
      } else {
        const { error } = await supabase
          .from('bike_types')
          .update(dataToSave)
          .eq('id', bikeId);

        if (error) throw error;
        toast.success("Bike type updated successfully");
      }
    } catch (error) {
      toast.error("Failed to save bike type");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter locations by selected city in add inventory dialog
  const filteredLocationsForInventory = newInventory.city_id 
    ? locations.filter(loc => loc.city_id === newInventory.city_id)
    : locations;

  const handleAddInventory = async () => {
    if (!newInventory.location_id || newInventory.quantity < 0) {
      toast.error("Please select a location and quantity");
      return;
    }

    const selectedLocation = locations.find(l => l.id === newInventory.location_id);
    if (!selectedLocation) {
      toast.error("Invalid location selected");
      return;
    }

    try {
      const { error } = await supabase
        .from('bike_inventory')
        .insert({
          bike_type_id: bikeId,
          location: selectedLocation.name,
          location_id: newInventory.location_id,
          city_id: newInventory.city_id || null,
          quantity: newInventory.quantity,
          available_quantity: newInventory.available_quantity,
        });

      if (error) throw error;
      toast.success("Inventory added");
      setShowAddInventory(false);
      setNewInventory({ location_id: '', city_id: '', quantity: 0, available_quantity: 0 });
      fetchInventory();
    } catch (error: unknown) {
      if (getErrCode(error) === '23505') {
        toast.error("Inventory for this location already exists");
      } else {
        toast.error("Failed to add inventory");
      }
    }
  };

  const handleUpdateInventory = async (inv: BikeInventory, field: 'quantity' | 'available_quantity', value: number) => {
    if (value < 0) {
      toast.error("Value cannot be negative");
      return;
    }
    if (field === 'available_quantity' && value > inv.quantity) {
      toast.error("Available cannot exceed total quantity");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('bike_inventory')
        .update({ [field]: value } as never)
        .eq('id', inv.id);

      if (error) throw error;
      fetchInventory();
    } catch (error) {
      toast.error("Failed to update inventory");
    }
  };

  const handleDeleteInventory = async (invId: string) => {
    try {
      const { error } = await supabase
        .from('bike_inventory')
        .delete()
        .eq('id', invId);

      if (error) throw error;
      toast.success("Inventory removed");
      fetchInventory();
    } catch (error) {
      toast.error("Failed to remove inventory");
    }
  };

  const getCityName = (cityId: string | null) => {
    if (!cityId) return 'N/A';
    const city = cities.find(c => c.id === cityId);
    return city?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminBikeTypeDetailsSkeleton />
      </AdminLayout>
    );
  }

  if (notFound) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Bike Not Found</h1>
          <p className="text-muted-foreground mt-2">The bike you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/admin/panel?tab=fleet')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fleet
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/panel?tab=fleet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {isNewBike ? 'Add New Bike Type' : 'Edit Bike Type'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isNewBike ? 'Create a new motorbike type' : 'Update bike details and inventory'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cappuccino S"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Daily Price (DH) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.daily_price || ''}
                    onChange={(e) => setFormData({ ...formData, daily_price: Number(e.target.value) })}
                    placeholder="e.g., 150"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the motorbike..."
                  rows={3}
                />
              </div>

              {/* City Selection */}
              <div>
                <Label>City</Label>
                <Select
                  value={formData.city_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, city_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific city</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Main Image Upload */}
              <div>
                <Label>Main Image *</Label>
                <ImageUpload
                  bikeTypeId={bikeId || 'new'}
                  images={mainImageAsUploadedImages}
                  onImagesChange={handleMainImagesChange}
                  maxImages={1}
                />
              </div>

              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Automatic transmission&#10;Fuel efficient&#10;Storage box"
                  rows={4}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating || 5}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_original || false}
                      onChange={(e) => setFormData({ ...formData, is_original: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Original (Hero bike)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_approved || false}
                      onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Approved</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images - Only for existing bikes */}
          {!isNewBike && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Gallery Images
                    </CardTitle>
                    <CardDescription>
                      Additional images shown in bike details page
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {galleryImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img 
                          src={img.image_url} 
                          alt={`Gallery ${img.display_order}`}
                          className="w-full h-24 object-cover rounded-lg"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteGalleryImage(img)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                          #{img.display_order}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <ImageUpload
                  bikeTypeId={bikeId || 'new'}
                  images={galleryAsUploadedImages}
                  onImagesChange={handleGalleryImagesChange}
                  maxImages={10}
                />
              </CardContent>
            </Card>
          )}

          {/* Inventory - Only for existing bikes */}
          {!isNewBike && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Inventory by Location
                    </CardTitle>
                    <CardDescription>
                      Manage quantity and availability per location
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowAddInventory(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Location
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No inventory added yet. Add locations to manage stock.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>City</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Total Quantity</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-muted-foreground">
                            {getCityName(inv.city_id)}
                          </TableCell>
                          <TableCell className="font-medium">{inv.location}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={inv.quantity}
                              onChange={(e) => handleUpdateInventory(inv, 'quantity', Number(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={inv.quantity}
                              value={inv.available_quantity}
                              onChange={(e) => handleUpdateInventory(inv, 'available_quantity', Number(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteInventory(inv.id)}
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
          )}
        </div>
      </div>

      {/* Add Inventory Dialog */}
      <Dialog open={showAddInventory} onOpenChange={setShowAddInventory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Location</DialogTitle>
            <DialogDescription>
              Add stock for a new location. Select city first to filter locations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={newInventory.city_id}
                onValueChange={(value) => setNewInventory({ 
                  ...newInventory, 
                  city_id: value,
                  location_id: '' // Reset location when city changes
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                value={newInventory.location_id}
                onValueChange={(value) => setNewInventory({ ...newInventory, location_id: value })}
                disabled={!newInventory.city_id && filteredLocationsForInventory.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={newInventory.city_id ? "Select a location" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocationsForInventory.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={newInventory.quantity}
                  onChange={(e) => setNewInventory({ 
                    ...newInventory, 
                    quantity: Number(e.target.value),
                    available_quantity: Math.min(newInventory.available_quantity, Number(e.target.value))
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Available</Label>
                <Input
                  type="number"
                  min="0"
                  max={newInventory.quantity}
                  value={newInventory.available_quantity}
                  onChange={(e) => setNewInventory({ ...newInventory, available_quantity: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInventory(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInventory}>
              Add Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBikeTypeDetails;
