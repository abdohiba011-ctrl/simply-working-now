import { Facebook, Link2, Twitter } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: Props) {
  const { t } = useLanguage();
  const enc = encodeURIComponent;
  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${enc(title + " " + url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("blog.copyLink"));
    } catch {
      toast.error("Could not copy");
    }
  };

  const btn = "w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-[#9FE870]/20 transition-colors";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground me-2">{t("blog.share")}:</span>
      <a className={btn} href={links.facebook} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
        <Facebook className="h-4 w-4" />
      </a>
      <a className={btn} href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a className={btn} href={links.twitter} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
        <Twitter className="h-4 w-4" />
      </a>
      <button type="button" onClick={copy} className={btn} aria-label="Copy link">
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}
