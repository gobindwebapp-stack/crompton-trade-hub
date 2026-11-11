import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { formatINR, isWholesaleBuyer, minOrderQty, savingsPercent, type AppRole, type PricedProduct } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function MoqBadge({ product, role, className }: { product: PricedProduct; role: AppRole | null; className?: string }) {
  const wholesale = isWholesaleBuyer(role) || role === null;
  const moq = wholesale ? product.dealer_moq : minOrderQty(product, role);
  if (!wholesale && moq <= 1) return null;
  return (
    <Badge variant="moq" className={className}>
      MOQ {moq}
      {role === null ? " · dealer" : ""}
    </Badge>
  );
}

export function PriceBlock({
  product,
  role,
  size = "sm",
}: {
  product: PricedProduct;
  role: AppRole | null;
  size?: "sm" | "lg";
}) {
  const off = savingsPercent(product);
  const big = size === "lg" ? "text-3xl" : "text-lg";

  if (isWholesaleBuyer(role)) {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn(big, "font-display font-extrabold text-wholesale")}>{formatINR(product.wholesale_price)}</span>
          <span className="text-xs text-muted-foreground line-through">{formatINR(product.retail_price)}</span>
          {off > 0 && <span className="text-xs font-bold text-wholesale">{off}% off</span>}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-wholesale">Dealer price · excl. GST</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn(big, "font-display font-extrabold text-foreground")}>{formatINR(product.retail_price)}</span>
        <span className="text-[11px] text-muted-foreground">retail · excl. GST</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-wholesale-soft px-2 py-1 text-xs text-wholesale">
        <span className="font-bold">{formatINR(product.wholesale_price)}</span>
        <span>dealer price</span>
        {role === null && (
          <Link to="/auth" search={{ mode: "signup" }} className="ml-auto font-semibold underline underline-offset-2">
            Unlock
          </Link>
        )}
      </div>
    </div>
  );
}
