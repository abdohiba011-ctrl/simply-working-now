import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, ArrowLeft, Loader2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BusinessLayout } from "@/components/layouts/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";

const AddBike = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    price: "",
    location: "",
    description: "",
    features: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newFiles]);
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t("addBike.mustBeLoggedIn"));
      return;
    }

    if (!formData.name || !formData.price || !formData.location) {
      toast.error(t("addBike.fillRequiredFields"));
      return;
    }

    if (images.length === 0) {
      toast.error(t("addBike.uploadAtLeastOne"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const uploadedUrls = await uploadImages();
      
      if (uploadedUrls.length === 0) {
        throw new Error("Failed to upload images");
      }

      // Parse features into array
      const featuresArray = formData.features
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      // Create bike type with pending approval
      const { data: bikeType, error: bikeError } = await supabase
        .from('bike_types')
        .insert({
          name: formData.name,
          description: formData.description,
          daily_price: parseFloat(formData.price),
          main_image_url: uploadedUrls[0],
          features: featuresArray,
          owner_id: user.id,
          is_approved: false,
          is_original: false,
          approval_status: 'pending'
        })
        .select()
        .single();

      if (bikeError) throw bikeError;

      // Add additional images
      if (uploadedUrls.length > 1 && bikeType) {
        const imageInserts = uploadedUrls.slice(1).map((url, index) => ({
          bike_type_id: bikeType.id,
          image_url: url,
          display_order: index + 1
        }));

        await supabase.from('bike_type_images').insert(imageInserts);
      }

      toast.success(t("addBike.submitSuccess"));
      navigate("/business-dashboard/motorbikes");
    } catch (error) {
      console.error('Error submitting bike:', error);
      toast.error(t("addBike.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BusinessLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/business-dashboard/motorbikes")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2 rtl-flip" />
            {t("addBike.backToMotorbikes")}
          </Button>

          <h1 className="text-3xl font-bold text-foreground mb-2">{t("addBike.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("addBike.subtitle")}</p>

          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("addBike.reviewNote")}
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("addBike.motorbikeDetails")}</CardTitle>
                <CardDescription>{t("addBike.provideAccurateInfo")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("addBike.motorbikeName")} *</Label>
                  <Input
                    id="name"
                    placeholder={t("addBike.motorbikeNamePlaceholder")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">{t("addBike.category")}</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("addBike.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sport">{t("addBike.categorySport")}</SelectItem>
                      <SelectItem value="Adventure">{t("addBike.categoryAdventure")}</SelectItem>
                      <SelectItem value="Cruiser">{t("addBike.categoryCruiser")}</SelectItem>
                      <SelectItem value="Touring">{t("addBike.categoryTouring")}</SelectItem>
                      <SelectItem value="Scooter">{t("addBike.categoryScooter")}</SelectItem>
                      <SelectItem value="Standard">{t("addBike.categoryStandard")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">{t("addBike.location")} *</Label>
                  <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("addBike.selectLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Casablanca">Casablanca</SelectItem>
                      <SelectItem value="Marrakesh">Marrakesh</SelectItem>
                      <SelectItem value="Rabat">Rabat</SelectItem>
                      <SelectItem value="Fes">Fes</SelectItem>
                      <SelectItem value="Tangier">Tangier</SelectItem>
                      <SelectItem value="Agadir">Agadir</SelectItem>
                      <SelectItem value="Essaouira">Essaouira</SelectItem>
                      <SelectItem value="Chefchaouen">Chefchaouen</SelectItem>
                      <SelectItem value="Meknes">Meknes</SelectItem>
                      <SelectItem value="Ouarzazate">Ouarzazate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">{t("addBike.dailyPrice")} *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder={t("addBike.dailyPricePlaceholder")}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="1"
                    className="ltr-input"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="features">{t("addBike.features")}</Label>
                  <Input
                    id="features"
                    placeholder={t("addBike.featuresPlaceholder")}
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t("addBike.description")}</Label>
                  <Textarea
                    id="description"
                    placeholder={t("addBike.descriptionPlaceholder")}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("addBike.uploadImages")} *</CardTitle>
                <CardDescription>{t("addBike.uploadImagesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="text-primary font-semibold hover:underline">{t("addBike.clickToUpload")}</span>
                      <span className="text-muted-foreground"> {t("addBike.orDragAndDrop")}</span>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">{t("addBike.imageFormats")}</p>
                  </div>

                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {index === 0 && (
                            <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                              {t("addBike.main")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("addBike.submitting")}
                  </>
                ) : (
                  t("addBike.submitForApproval")
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/business-dashboard/motorbikes")}>
                {t("addBike.cancel")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default AddBike;
