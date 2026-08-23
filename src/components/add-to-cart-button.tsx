import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

type Props = {
  productSlug: string;
  companySlug?: string | null;
  companyName?: string | null;
  companyNumber?: string | null;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
};

export function AddToCartButton({
  productSlug,
  companySlug = null,
  companyName = null,
  companyNumber = null,
  label = "Add to cart",
  className,
  size = "default",
  variant = "default",
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => {
        addItem({ productSlug, companySlug, companyName, companyNumber });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
    >
      {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
      {added ? "Added to cart" : label}
    </Button>
  );
}
