import { useState } from "react";
import { AgencyLayout } from "@/components/agency/AgencyLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone, Search, Activity, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const faqs = [
  { cat: "Bookings", q: "How are booking fees deducted?", a: "When a booking is confirmed, we deduct 50 MAD from your wallet automatically. If the booking is cancelled before pickup, the fee is refunded within 24h." },
  { cat: "Bookings", q: "Can I reject a booking?", a: "Yes, within 12 hours of receiving it. Repeated rejections may lower your search ranking." },
  { cat: "Wallet", q: "What payment methods can I use to top up?", a: "Moroccan card via YouCan Pay, international cards, and Cash Plus." },
  { cat: "Wallet", q: "How long do withdrawals take?", a: "Withdrawals are processed within 3 business days to your registered RIB." },
  { cat: "Verification", q: "Why is verification mandatory?", a: "Unverified agencies don't appear in renter search results. Verification protects both renters and your business." },
  { cat: "Verification", q: "How long does document review take?", a: "Most documents are reviewed within 24-48 hours. Complex cases may take up to 5 business days." },
  { cat: "Subscription", q: "Can I switch plans anytime?", a: "Yes, upgrades take effect immediately. Downgrades apply at the end of your billing cycle." },
];

const changelog = [
  { date: "Apr 18, 2026", title: "New: drag-to-create manual bookings", tag: "New" },
  { date: "Apr 10, 2026", title: "Improved: faster fleet calendar load times", tag: "Improved" },
  { date: "Apr 02, 2026", title: "New: Top-up bonuses up to 500 MAD", tag: "New" },
  { date: "Mar 25, 2026", title: "Fixed: WhatsApp link detection in messages", tag: "Fixed" },
  { date: "Mar 12, 2026", title: "New: Multi-location support for Business plan", tag: "New" },
];

const Help = () => {
  const [q, setQ] = useState("");
  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()) || f.a.toLowerCase().includes(q.toLowerCase()));

  return (
    <AgencyLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Find answers fast or talk to our team.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles…" className="pl-10 h-12 text-base" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Live chat</h3>
            <p className="mt-1 text-xs text-muted-foreground">Mon–Fri, 9:00–19:00</p>
            <Badge variant="secondary" className="mt-2 bg-success/15 text-success">● Online now</Badge>
            <Button size="sm" className="mt-4 w-full">Start chat</Button>
          </Card>
          <Card className="p-5">
            <Mail className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Email</h3>
            <p className="mt-1 text-xs text-muted-foreground">Reply within 24h</p>
            <p className="mt-2 text-sm font-medium">support@motonita.ma</p>
          </Card>
          <Card className="p-5">
            <Phone className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Phone</h3>
            <p className="mt-1 text-xs text-muted-foreground">Mon–Fri, 9:00–18:00</p>
            <p className="mt-2 text-sm font-medium">+212 522 99 88 77</p>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-semibold">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-3">
            {filtered.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-left">
                  <span><Badge variant="outline" className="mr-2">{f.cat}</Badge>{f.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold"><PlayCircle className="h-4 w-4 text-primary" /> Video tutorials</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Getting started", "Add your first bike", "Confirm a booking", "Manage wallet"].map((t) => (
                <div key={t} className="aspect-video rounded-lg bg-gradient-to-br from-primary/15 to-muted p-3 text-xs font-medium">
                  <PlayCircle className="h-6 w-6 text-primary" />
                  <p className="mt-2">{t}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> What's new</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {changelog.map((c, i) => (
                <li key={i} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <Badge variant="outline" className="shrink-0">{c.tag}</Badge>
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-semibold">Send us a message</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><Label>Subject</Label><Input placeholder="What's this about?" /></div>
            <div><Label>Category</Label><Input placeholder="Bookings / Wallet / …" /></div>
            <div className="sm:col-span-2"><Label>Message</Label><Textarea rows={4} placeholder="Describe your issue…" /></div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <a href="#" className="flex items-center gap-1 text-xs text-primary hover:underline"><Activity className="h-3 w-3" /> Service status page</a>
            <Button onClick={() => toast.success("Message sent — we'll reply within 24h")}>Send message</Button>
          </div>
        </Card>
      </div>
    </AgencyLayout>
  );
};

export default Help;
