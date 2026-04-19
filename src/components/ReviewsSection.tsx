import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const reviews = [
  {
    name: "Sarah Johnson",
    location: "United States",
    rating: 5,
    comment: "Amazing experience! The bike was in perfect condition and the owner was very helpful. Highly recommend for exploring Marrakesh!",
    date: "2 weeks ago",
  },
  {
    name: "Marco Rossi",
    location: "Italy",
    rating: 5,
    comment: "Best way to see Morocco! Easy booking process and great selection of bikes. The roads around Chefchaouen were incredible.",
    date: "1 month ago",
  },
  {
    name: "Emma Laurent",
    location: "France",
    rating: 5,
    comment: "Professional service and well-maintained motorcycles. Perfect for my coastal road trip from Casablanca to Essaouira.",
    date: "3 weeks ago",
  },
  {
    name: "Thomas Schmidt",
    location: "Germany",
    rating: 4,
    comment: "Great platform with competitive prices. The adventure bike I rented handled the Atlas Mountains beautifully.",
    date: "1 month ago",
  },
];

export const ReviewsSection = () => {
  const { t } = useLanguage();
  
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h2 className="mb-4 text-foreground text-2xl sm:text-3xl md:text-4xl">{t('reviews.title')}</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            {t('reviews.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto animate-slide-up">
          {reviews.map((review, index) => (
            <Card
              key={index}
              className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                {/* Rating Stars */}
                <div className="flex gap-1 mb-4" aria-label={`${review.rating} out of 5 stars`}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < review.rating
                          ? "text-primary fill-primary"
                          : "text-muted-foreground/30"
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-foreground mb-4 leading-relaxed italic">
                  "{review.comment}"
                </p>

                {/* Reviewer Info */}
                <div className="border-t pt-4">
                  <p className="font-semibold text-foreground">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.location}</p>
                  <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
