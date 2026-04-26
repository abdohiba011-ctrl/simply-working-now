import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

export function NewsletterCta() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success(t("blog.newsletterSuccess"));
      setEmail("");
      setSubmitting(false);
    }, 400);
  };

  return (
    <div className="rounded-xl border border-border bg-[#9FE870]/15 p-6 md:p-8">
      <h3 className="text-xl font-bold text-foreground">{t("blog.newsletterTitle")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t("blog.newsletterSubtitle")}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("blog.newsletterPlaceholder")}
          className="bg-white"
        />
        <Button type="submit" disabled={submitting} className="bg-foreground text-white hover:bg-foreground/90">
          {t("blog.newsletterCta")}
        </Button>
      </form>
    </div>
  );
}
