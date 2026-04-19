import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Shield, Clock, Bike } from "lucide-react";

export const SEOContent = () => {
  return (
    <section className="py-16 bg-secondary/20" aria-label="About motorbike rentals in Casablanca">
      <div className="container mx-auto px-4 max-w-6xl">
        <article className="prose prose-lg max-w-none">
          <header className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Premier Motorbike Rental Service in Casablanca
            </h2>
            <p className="text-lg text-muted-foreground">
              Explore Casablanca and Morocco on two wheels with affordable, reliable scooter rentals
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      All Casablanca Neighborhoods
                    </h3>
                    <p className="text-muted-foreground">
                      Rent motorbikes in Maarif, Ain Diab, Anfa, Derb Sultan, Sidi Maarouf, Bouskoura, Mediouna, Deroua - Berrechid, and Tet Mellil. 
                      Convenient pickup and drop-off locations across Casablanca make it easy to start your adventure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Safe & Insured Rentals
                    </h3>
                    <p className="text-muted-foreground">
                      All motorbike rentals include comprehensive insurance, helmets, and 24/7 roadside assistance. 
                      Your safety is our priority with regularly maintained bikes and safety equipment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Flexible Rental Periods
                    </h3>
                    <p className="text-muted-foreground">
                      Choose from daily, weekly, or monthly motorbike rentals in Casablanca. 
                      Whether you need a scooter for a day trip or an extended stay in Morocco, we've got you covered.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Bike className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Wide Selection of Bikes
                    </h3>
                    <p className="text-muted-foreground">
                      From economical Sanya scooters at 80 DH/day to premium SH models at 160 DH/day. 
                      All our motorbikes are automatic, easy to ride, and perfect for city exploration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-card p-8 rounded-xl border-2 border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Why Choose Motorbike Rental in Casablanca?
            </h3>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">Casablanca</strong>, Morocco's largest city and economic capital, 
                is best explored on a motorbike. Renting a scooter gives you the freedom to navigate through the bustling 
                streets of <strong className="text-foreground">Maarif</strong>, cruise along the scenic 
                <strong className="text-foreground"> Corniche in Ain Diab</strong>, or explore the historic 
                <strong className="text-foreground"> Derb Sultan</strong> neighborhood at your own pace.
              </p>
              <p>
                Our <strong className="text-foreground">motorbike rental service in Casablanca</strong> offers the most 
                affordable rates starting from <strong className="text-foreground">80 DH per day</strong>. Whether you're 
                a tourist wanting to see the Hassan II Mosque, the Morocco Mall, or the Royal Palace, or a local resident 
                needing reliable transportation, our fleet of well-maintained scooters and motorbikes is perfect for you.
              </p>
              <p>
                We specialize in <strong className="text-foreground">automatic scooters</strong> that are easy to ride, 
                even for beginners. No motorcycle license required for scooters under 50cc! Our popular models include 
                the fuel-efficient Sanya, the classic Becane 33, and the powerful SH scooter for longer trips.
              </p>
              <p>
                <strong className="text-foreground">Book your motorbike rental in Casablanca today</strong> and experience 
                the city like a local. With flexible pickup times, competitive daily rates, and excellent customer service, 
                we're the #1 choice for scooter rentals in Morocco's largest city.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};
