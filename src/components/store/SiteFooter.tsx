import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-header text-header-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-extrabold">Crompton Trade Hub</p>
          <p className="mt-1 text-header-muted">Wholesale electricals for dealers and retailers.</p>
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">Shop</p>
          <Link to="/products" className="block text-header-muted hover:text-header-foreground">All products</Link>
          <Link to="/cart" className="block text-header-muted hover:text-header-foreground">Cart</Link>
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">Account</p>
          <Link to="/auth" search={{ mode: "signup" }} className="block text-header-muted hover:text-header-foreground">Register as dealer</Link>
          <Link to="/orders" className="block text-header-muted hover:text-header-foreground">My orders</Link>
        </div>
      </div>
      <p className="border-t border-header-foreground/10 py-4 text-center text-xs text-header-muted">
        Prices exclude GST. Dealer prices require a verified dealer account.
      </p>
    </footer>
  );
}
