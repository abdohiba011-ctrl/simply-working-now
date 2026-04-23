import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { UserMenu } from "@/components/auth/UserMenu";
import { Bike, Search } from "lucide-react";
import { MockProtectedRoute } from "@/components/auth/MockProtectedRoute";
import logoLight from "@/assets/motonita-logo.svg";

function RentInner() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
        <Link to="/rent" className="flex items-center gap-2">
          <img src={logoLight} alt="Motonita" className="h-6 w-auto" />
        </Link>
        <UserMenu />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-4 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(159,232,112,0.25)" }}
          >
            <Bike className="h-7 w-7" style={{ color: "#163300" }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#163300" }}>
            Welcome{user ? `, ${user.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            This is your renter dashboard. Browse motorbikes from verified agencies across Morocco.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              asChild
              className="h-10"
              style={{ backgroundColor: "#9FE870", color: "#163300" }}
            >
              <Link to="/listings">
                <Search className="mr-2 h-4 w-4" />
                Browse motorbikes
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RentPlaceholder() {
  return (
    <MockProtectedRoute role="renter">
      <RentInner />
    </MockProtectedRoute>
  );
}
