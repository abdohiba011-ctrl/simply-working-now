import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImageViewer } from "@/components/ui/image-viewer";
import { IdCard, User, FileText, Eye, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ClientData } from "./types";
import { mapKYCStatus, mapPhoneStatus, copyToClipboard } from "./helpers";

interface ClientVerificationTabProps {
  client: ClientData;
}

export const ClientVerificationTab = ({ client }: ClientVerificationTabProps) => {
  const [viewingImage, setViewingImage] = useState<{ src: string; title: string } | null>(null);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    }
  };

  return (
    <div className="space-y-6">
      {/* KYC Summary */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1"><StatusBadge status={mapKYCStatus(client.kycStatus)} size="sm" /></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone Status</p>
              <div className="mt-1"><StatusBadge status={mapPhoneStatus(client.phoneStatus)} size="sm" /></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID Card Number</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-medium ltr-content">{client.idCardNumber || "Not provided"}</span>
                {client.idCardNumber && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(client.idCardNumber!, "ID Number")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Identity Documents</CardTitle>
          <CardDescription>Uploaded verification documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                Front of ID
              </p>
              <div 
                className={cn(
                  "aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed overflow-hidden relative group",
                  client.frontIdUrl && "cursor-pointer"
                )}
                onClick={() => client.frontIdUrl && setViewingImage({ src: client.frontIdUrl, title: "Front of ID" })}
              >
                {client.frontIdUrl ? (
                  <>
                    <img src={client.frontIdUrl} alt="Front ID" className="max-h-full max-w-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="gap-1">
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    </div>
                  </>
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                Back of ID
              </p>
              <div 
                className={cn(
                  "aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed overflow-hidden relative group",
                  client.backIdUrl && "cursor-pointer"
                )}
                onClick={() => client.backIdUrl && setViewingImage({ src: client.backIdUrl, title: "Back of ID" })}
              >
                {client.backIdUrl ? (
                  <>
                    <img src={client.backIdUrl} alt="Back ID" className="max-h-full max-w-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="gap-1">
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    </div>
                  </>
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Selfie with ID
              </p>
              <div 
                className={cn(
                  "aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed overflow-hidden relative group",
                  client.selfieUrl && "cursor-pointer"
                )}
                onClick={() => client.selfieUrl && setViewingImage({ src: client.selfieUrl, title: "Selfie with ID" })}
              >
                {client.selfieUrl ? (
                  <>
                    <img src={client.selfieUrl} alt="Selfie" className="max-h-full max-w-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="gap-1">
                        <Eye className="h-4 w-4" /> View
                      </Button>
                    </div>
                  </>
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      <ImageViewer
        isOpen={!!viewingImage}
        src={viewingImage?.src || ""}
        title={viewingImage?.title}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
};
