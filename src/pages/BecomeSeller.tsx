import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Shield, Phone, DollarSign, TrendingUp, BarChart3, 
  CheckCircle, Sparkles, ArrowRight, Building2, FileCheck,
  Star, Zap, Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const BecomeSeller = () => {
  const navigate = useNavigate();

  const stats = [
    { icon: Users, value: "500+", label: "Active Sellers" },
    { icon: Shield, value: "99.9%", label: "Uptime" },
    { icon: Phone, value: "24/7", label: "Support" },
    { icon: DollarSign, value: "85%", label: "Seller Earnings" },
  ];

  const testimonials = [
    {
      name: "Ahmed Hassan",
      location: "Casablanca",
      rating: 5,
      comment: "Increased my rental income by 300% in the first 3 months!",
      revenue: "+300% Revenue"
    },
    {
      name: "Fatima Alaoui",
      location: "Marrakech",
      rating: 5,
      comment: "The platform is easy to use and the support team is amazing.",
      revenue: "+250% Bookings"
    },
    {
      name: "Youssef Bennani",
      location: "Rabat",
      rating: 5,
      comment: "Best decision for my rental business. Professional and reliable!",
      revenue: "+400% Growth"
    }
  ];

  const benefits = [
    { title: "Smart Inventory Management", description: "Track all your bikes in one dashboard", icon: BarChart3 },
    { title: "Automated Bookings", description: "24/7 booking system that works while you sleep", icon: Zap },
    { title: "Revenue Analytics", description: "Real-time insights into your earnings", icon: TrendingUp },
    { title: "Marketing Support", description: "We bring customers to you", icon: Target },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-28 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-semibold">
                <Sparkles className="w-4 h-4 mr-2" />
                Trusted by 500+ Rental Businesses
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
                Grow Your <span className="text-primary">Rental Business</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-slide-up">
                Join Morocco's leading motorbike rental platform. List your bikes and reach thousands of potential customers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-scale-in">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-lg px-8 py-6 shadow-xl"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Start Selling Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
                <CheckCircle className="w-4 h-4 text-primary" /> No credit card required
                <CheckCircle className="w-4 h-4 text-primary ml-4" /> Free to start
                <CheckCircle className="w-4 h-4 text-primary ml-4" /> 24/7 support
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What Our Sellers Say</h2>
              <p className="text-muted-foreground text-lg">Real success stories from real sellers</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground mb-4 italic">"{testimonial.comment}"</p>
                    <Badge variant="secondary" className="mb-3">{testimonial.revenue}</Badge>
                    <div className="border-t pt-3">
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Seller Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Seller Benefits</h2>
                <p className="text-muted-foreground text-lg">Everything you need to succeed</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {benefits.map((benefit, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <benefit.icon className="w-10 h-10 text-primary mb-3" />
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                      <CardDescription className="text-base">{benefit.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Legal Requirements */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Requirements</h2>
                <p className="text-muted-foreground text-lg">What you need to get started</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2">
                  <CardHeader>
                    <FileCheck className="w-10 h-10 text-primary mb-3" />
                    <CardTitle>Individual Sellers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Valid national ID or passport</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Proof of bike ownership</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Valid insurance certificate</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Bank account for payouts</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <Building2 className="w-10 h-10 text-primary mb-3" />
                    <CardTitle>Rental Companies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Business registration certificate</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Commercial insurance policy</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Fleet documentation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Business bank account</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
              <p className="text-lg md:text-xl mb-10 opacity-90">
                Join hundreds of successful sellers on Morocco's #1 motorbike rental platform
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-10 py-6 shadow-xl"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Join as Seller Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-10 py-6 bg-background/10 border-primary-foreground text-primary-foreground hover:bg-background/20"
                  onClick={() => window.open('https://wa.me/212710564476', '_blank')}
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Talk to Our Team
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm opacity-90">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Free to join
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> No setup fees
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
    </div>
  );
};

export default BecomeSeller;
