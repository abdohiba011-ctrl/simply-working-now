import { useState, useRef } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Image, X, Upload } from "lucide-react";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientEmail: string;
  clientName: string;
}

interface AttachedImage {
  id: string;
  file: File;
  preview: string;
}

export const SendEmailDialog = ({
  open,
  onOpenChange,
  clientEmail,
  clientName,
}: SendEmailDialogProps) => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024; // 5MB per image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image type`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: event.target?.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter email content");
      return;
    }

    setIsSending(true);

    try {
      // Convert images to base64 for sending
      const imageAttachments = attachedImages.map(img => ({
        filename: img.file.name,
        content: img.preview.split(',')[1], // Remove data:image/... prefix
        type: img.file.type,
      }));

      const { error } = await supabase.functions.invoke('send-client-email', {
        body: {
          to: clientEmail,
          name: clientName,
          subject,
          content,
          images: imageAttachments,
        }
      });

      if (error) throw error;

      toast.success("Email sent successfully!");
      
      // Reset form
      setSubject("");
      setContent("");
      setAttachedImages([]);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Send email error:', error);
      toast.error(getErrMsg(error) || "Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setSubject("");
      setContent("");
      setAttachedImages([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to Client
          </DialogTitle>
          <DialogDescription>
            Send a custom email to {clientName} ({clientEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* To field (read-only) */}
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              value={`${clientName} <${clientEmail}>`}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject *</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Your booking confirmation, Important update..."
              disabled={isSending}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="email-content">Message *</Label>
            <Textarea
              id="email-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your email message here..."
              rows={8}
              disabled={isSending}
              className="resize-none"
            />
          </div>

          {/* Image Attachments */}
          <div className="space-y-2">
            <Label>Attach Images (optional)</Label>
            <div className="flex flex-wrap gap-3">
              {attachedImages.map((img) => (
                <div 
                  key={img.id} 
                  className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                >
                  <img
                    src={img.preview}
                    alt="Attachment"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {attachedImages.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAttach}
                    className="sr-only"
                    disabled={isSending}
                  />
                  <div className="text-center">
                    <Image className="h-5 w-5 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </div>
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Max 5 images, 5MB each. Supported: JPG, PNG, GIF, WebP
            </p>
          </div>

          {/* Email Templates (quick actions) */}
          <Card>
            <CardContent className="py-3">
              <Label className="text-sm text-muted-foreground mb-2 block">Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubject("Booking Reminder - Motonita");
                    setContent(`Dear ${clientName},\n\nThis is a friendly reminder about your upcoming booking with Motonita.\n\nPlease make sure to have your ID ready for pickup.\n\nIf you have any questions, don't hesitate to contact us.\n\nBest regards,\nThe Motonita Team`);
                  }}
                  disabled={isSending}
                >
                  Booking Reminder
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubject("Special Offer Just for You - Motonita");
                    setContent(`Dear ${clientName},\n\nWe have an exclusive offer just for you!\n\n[Add your offer details here]\n\nBook now and enjoy special discounts.\n\nBest regards,\nThe Motonita Team`);
                  }}
                  disabled={isSending}
                >
                  Marketing Offer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubject("Thank You for Renting with Motonita!");
                    setContent(`Dear ${clientName},\n\nThank you for choosing Motonita for your motorbike rental!\n\nWe hope you had a great experience. We'd love to hear your feedback.\n\nWe look forward to serving you again!\n\nBest regards,\nThe Motonita Team`);
                  }}
                  disabled={isSending}
                >
                  Thank You
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubject("Verification Required - Motonita");
                    setContent(`Dear ${clientName},\n\nWe noticed that your account verification is incomplete or requires attention.\n\nPlease log in to your Motonita account and complete the verification process to continue using our services.\n\nIf you need any assistance, please contact our support team.\n\nBest regards,\nThe Motonita Team`);
                  }}
                  disabled={isSending}
                >
                  Verification Required
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
