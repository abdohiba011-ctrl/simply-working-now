import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Edit2, Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SavedLocationsSkeleton } from "@/components/ui/bike-skeleton";

interface SavedLocation {
  id: string;
  label: string;
  address: string;
  is_default: boolean;
}

interface SavedLocationsCardProps {
  userId: string | undefined;
  isRTL: boolean;
  t: (key: string) => string;
}

export const SavedLocationsCard = ({ userId, isRTL, t }: SavedLocationsCardProps) => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Validation errors
  const [labelError, setLabelError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [editLabelError, setEditLabelError] = useState("");
  const [editAddressError, setEditAddressError] = useState("");

  useEffect(() => {
    if (userId) {
      fetchLocations();
    }
  }, [userId]);

  // Clear errors when inputs change
  useEffect(() => {
    if (newLabel.trim()) setLabelError("");
  }, [newLabel]);

  useEffect(() => {
    if (newAddress.trim()) setAddressError("");
  }, [newAddress]);

  useEffect(() => {
    if (editLabel.trim()) setEditLabelError("");
  }, [editLabel]);

  useEffect(() => {
    if (editAddress.trim()) setEditAddressError("");
  }, [editAddress]);

  const fetchLocations = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAddForm = (): boolean => {
    let isValid = true;
    
    if (!newLabel.trim()) {
      setLabelError(t("savedLocations.labelRequired"));
      isValid = false;
    }
    
    if (!newAddress.trim()) {
      setAddressError(t("savedLocations.addressRequired"));
      isValid = false;
    }
    
    return isValid;
  };

  const validateEditForm = (): boolean => {
    let isValid = true;
    
    if (!editLabel.trim()) {
      setEditLabelError(t("savedLocations.labelRequired"));
      isValid = false;
    }
    
    if (!editAddress.trim()) {
      setEditAddressError(t("savedLocations.addressRequired"));
      isValid = false;
    }
    
    return isValid;
  };

  const handleAddLocation = async () => {
    if (!userId || !validateAddForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .insert({
          user_id: userId,
          label: newLabel.trim(),
          address: newAddress.trim(),
          is_default: locations.length === 0
        })
        .select()
        .single();

      if (error) throw error;

      setLocations([data, ...locations]);
      setNewLabel("");
      setNewAddress("");
      setIsAdding(false);
      toast.success(t("savedLocations.locationSaved"));
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error(t("savedLocations.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLocation = async (id: string) => {
    if (!validateEditForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_locations')
        .update({
          label: editLabel.trim(),
          address: editAddress.trim()
        })
        .eq('id', id);

      if (error) throw error;

      setLocations(locations.map(loc => 
        loc.id === id ? { ...loc, label: editLabel.trim(), address: editAddress.trim() } : loc
      ));
      setEditingId(null);
      toast.success(t("savedLocations.locationUpdated"));
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error(t("savedLocations.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLocations(locations.filter(loc => loc.id !== id));
      toast.success(t("savedLocations.locationDeleted"));
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error(t("savedLocations.deleteFailed"));
    }
  };

  const startEditing = (location: SavedLocation) => {
    setEditingId(location.id);
    setEditLabel(location.label);
    setEditAddress(location.address);
    setEditLabelError("");
    setEditAddressError("");
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewLabel("");
    setNewAddress("");
    setLabelError("");
    setAddressError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel("");
    setEditAddress("");
    setEditLabelError("");
    setEditAddressError("");
  };

  const isAddFormValid = newLabel.trim() && newAddress.trim();
  const isEditFormValid = editLabel.trim() && editAddress.trim();

  return (
    <Card data-testid="saved-locations-card">
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <MapPin className="h-5 w-5 text-foreground" />
            {t("savedLocations.title")}
          </span>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-2"
              data-testid="add-location-btn"
            >
              <Plus className="h-4 w-4" />
              {t("savedLocations.add")}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SavedLocationsSkeleton />
        ) : (
          <>
            {/* Add new location form */}
            {isAdding && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30" data-testid="add-location-form">
                <div className="space-y-2">
                  <Label className={labelError ? "text-destructive" : ""}>
                    {t("savedLocations.labelField")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={t("savedLocations.labelPlaceholder")}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className={labelError ? "border-destructive" : ""}
                    data-testid="location-label-input"
                  />
                  {labelError && (
                    <p className="text-sm text-destructive">{labelError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={addressError ? "text-destructive" : ""}>
                    {t("savedLocations.addressField")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={t("savedLocations.addressPlaceholder")}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className={addressError ? "border-destructive" : ""}
                    data-testid="location-address-input"
                  />
                  {addressError && (
                    <p className="text-sm text-destructive">{addressError}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelAdding}
                    data-testid="cancel-add-location-btn"
                  >
                    <X className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                    {t("savedLocations.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddLocation}
                    disabled={isSaving || !isAddFormValid}
                    className="gap-2"
                    data-testid="save-location-btn"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t("savedLocations.save")}
                  </Button>
                </div>
              </div>
            )}

            {/* Locations list */}
            {locations.length === 0 && !isAdding ? (
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                {t("savedLocations.noLocations")}
              </p>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="border rounded-lg p-3 bg-background"
                    data-testid={`location-item-${location.id}`}
                  >
                    {editingId === location.id ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder={t("savedLocations.labelPlaceholder")}
                            className={editLabelError ? "border-destructive" : ""}
                            data-testid="edit-label-input"
                          />
                          {editLabelError && (
                            <p className="text-sm text-destructive">{editLabelError}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Input
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder={t("savedLocations.addressPlaceholder")}
                            className={editAddressError ? "border-destructive" : ""}
                            data-testid="edit-address-input"
                          />
                          {editAddressError && (
                            <p className="text-sm text-destructive">{editAddressError}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            data-testid="cancel-edit-btn"
                          >
                            {t("savedLocations.cancel")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditLocation(location.id)}
                            disabled={isSaving || !isEditFormValid}
                            data-testid="save-edit-btn"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("savedLocations.save")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : ''}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{location.label}</span>
                            {location.is_default && (
                              <Badge variant="secondary" className="text-xs">{t("savedLocations.default")}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditing(location)}
                            data-testid={`edit-location-${location.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLocation(location.id)}
                            data-testid={`delete-location-${location.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};