import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";

export default function RentPlaceholder() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: "#163300" }}>
          Welcome{user ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          This is the renter home placeholder. The browse / book flow lives at{" "}
          <Link to="/listings" className="underline">
            /listings
          </Link>
          .
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild className="h-9">
            <Link to="/listings">Browse motorbikes</Link>
          </Button>
          <Button variant="outline" className="h-9" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
