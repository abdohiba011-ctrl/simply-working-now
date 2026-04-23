import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bike, Building2, Check } from "lucide-react";
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
  mode: "activate-renter" | "activate-agency";
}

export function RoleActivationModal({ open, onOpenChange, mode }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const activateRenterRole = useAuthStore((s) => s.activateRenterRole);
  const isLoading = useAuthStore((s) => s.isLoading);

  const isRenterFlow = mode === "activate-renter";

  const handlePrimary = async () => {
    if (isRenterFlow) {
      try {
        await activateRenterRole();
        toast.success(t("renter_activated"));
        onOpenChange(false);
        navigate("/rent");
      } catch (e) {
        toast.error((e as Error).message || "Activation failed");
      }
    } else {
      onOpenChange(false);
      navigate("/agency/signup-extra");
    }
  };

  const Icon = isRenterFlow ? Bike : Building2;

  const benefits = isRenterFlow
    ? [
        t("renter_benefit_1"),
        t("renter_benefit_2"),
        t("renter_benefit_3"),
        t("renter_benefit_4"),
      ]
    : [
        t("agency_benefit_1"),
        t("agency_benefit_2"),
        t("agency_benefit_3"),
        t("agency_benefit_4"),
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div
            className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(159,232,112,0.18)" }}
          >
            <Icon className="h-6 w-6" style={{ color: "#163300" }} />
          </div>
          <DialogTitle className="text-center" style={{ color: "#163300" }}>
            {isRenterFlow ? t("rent_from_agencies") : t("become_business_title")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isRenterFlow ? t("rent_from_agencies_body") : t("become_business_body")}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2 text-sm">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "#163300" }}
              />
              <span className="text-foreground/80">{b}</span>
            </li>
          ))}
        </ul>

        {!isRenterFlow && (
          <p className="text-xs text-muted-foreground">{t("verification_note")}</p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            {t("maybe_later")}
          </Button>
          <Button
            onClick={handlePrimary}
            disabled={isLoading}
            className="h-10"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {isRenterFlow ? t("activate_renter_btn") : t("start_business_setup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
