import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AgencyAvatarProps {
  logoUrl?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

const initial = (s?: string | null) =>
  ((s || "A").trim().charAt(0) || "A").toUpperCase();

export const AgencyAvatar = ({
  logoUrl,
  name,
  size = "md",
  className,
}: AgencyAvatarProps) => (
  <Avatar className={cn(sizeMap[size], className)}>
    {logoUrl ? <AvatarImage src={logoUrl} alt={name || "Agency"} /> : null}
    <AvatarFallback className="bg-primary/25 font-semibold text-foreground">
      {initial(name)}
    </AvatarFallback>
  </Avatar>
);
