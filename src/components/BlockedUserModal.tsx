import { useState } from "react";
import { AlertTriangle, Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface BlockedUserModalProps {
  reason?: string | null;
}

const WHATSAPP_NUMBER = "3453452345";
const SUPPORT_EMAIL = "contact@motori.ma";

export const BlockedUserModal = ({ reason }: BlockedUserModalProps) => {
  const [showContactOptions, setShowContactOptions] = useState(false);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hello, I need help with my blocked account.`, '_blank');
    setShowContactOptions(false);
  };

  const handleEmail = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Blocked Account Support&body=Hello, I need help with my blocked account.`;
    setShowContactOptions(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[99999] bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Account Blocked</h1>
            <p className="text-foreground">
              Your account has been blocked by an administrator.
            </p>
          </div>

          {reason && (
            <div className="bg-destructive rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-white mb-1">Reason:</p>
              <p className="text-sm text-white">{reason}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-foreground">
              If you believe this is a mistake, please contact our support team.
            </p>
            
            <Button 
              onClick={() => setShowContactOptions(true)} 
              className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Options Dialog */}
      <Dialog open={showContactOptions} onOpenChange={setShowContactOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">Choose Contact Method</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-14 gap-3 text-left justify-start border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={handleWhatsApp}
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <WhatsAppIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">WhatsApp</p>
                <p className="text-sm text-muted-foreground">Chat with us instantly</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-14 gap-3 text-left justify-start border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
              onClick={handleEmail}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
