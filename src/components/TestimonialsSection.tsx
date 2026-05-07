import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  location: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Renting through Motonita was not just about getting a motorbike. It gave me freedom. I could explore Casablanca at my own rhythm, stop where I wanted, and enjoy the city without feeling stuck. The process was simple, clear, and trustworthy.",
    name: "Adam",
    location: "Ain Diab, Casablanca",
  },
  {
    quote:
      "Casablanca traffic can destroy your whole day. With Motonita, I booked a scooter quickly and moved between Maarif, Ain Diab, and the city center without waiting for taxis. It felt like I finally had control over my time.",
    name: "Youssef",
    location: "Maarif, Casablanca",
  },
  {
    quote:
      "I was worried about renting a scooter in Casablanca because I didn't know which agency to trust. Motonita made the choice easier. I could see the bike, the price, the agency, and the booking details before confirming. It removed the stress and gave me confidence to book.",
    name: "Sara",
    location: "Casablanca",
  },
];

export const TestimonialsSection = () => {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-14 sm:py-20 bg-gradient-to-b from-background to-secondary/20"
    >
      <div className="container mx-auto px-4">
        <header className="mx-auto max-w-2xl text-center">
          <h2
            id="testimonials-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground"
          >
            What early riders are saying
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Feedback from our first beta testers
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((tm, i) => (
            <article
              key={tm.name}
              className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{
                borderColor: "#E5E7EB",
                animationDelay: `${i * 100}ms`,
                animationFillMode: "backwards",
              }}
            >
              <div className="flex items-center gap-0.5 mb-3" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{tm.quote}</p>
              <div className="mt-4">
                <span className="font-bold" style={{ color: "#9FE870" }}>
                  — {tm.name}
                </span>
                <span className="text-sm text-gray-500"> · {tm.location}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
