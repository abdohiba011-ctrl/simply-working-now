import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import enLocale from "@/locales/en.json";
import frLocale from "@/locales/fr.json";
import arLocale from "@/locales/ar.json";

const locales = { en: enLocale, fr: frLocale, ar: arLocale } as Record<string, any>;

function useT() {
  const lang = useLanguageStore((s) => s.language);
  return (key: string): string => {
    const dict = locales[lang]?.mockAuth ?? locales.en.mockAuth;
    return dict?.[key] ?? key;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LogoutConfirmDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleConfirm = () => {
    logout();
    onOpenChange(false);
    toast.success(t("logout_success"));
    navigate("/login");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div
            className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(22,51,0,0.08)" }}
          >
            <LogOut className="h-6 w-6" style={{ color: "#163300" }} />
          </div>
          <AlertDialogTitle className="text-center">
            {t("logout_title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t("logout_body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>{t("logout_cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            style={{ backgroundColor: "#163300", color: "#fff" }}
          >
            {t("logout_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
