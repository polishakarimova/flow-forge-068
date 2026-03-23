import { PRODUCT_TYPES, type Product } from "@/lib/productData";
import { StatusDot } from "./StatusDot";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const type = PRODUCT_TYPES.find((t) => t.id === product.typeId);

  return (
    <div
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200"
      onClick={() => onOpen(product)}
    >
      <div className="w-[2px] h-[20px] rounded-sm shrink-0" style={{ background: type?.color || "hsl(var(--border))" }} />
      <span className="text-[13px] shrink-0">{type?.icon}</span>
      <span className="text-[11px] font-semibold min-w-[60px] shrink-0 text-muted-foreground">
        {type?.label}
      </span>
      <div className="flex-1 text-[12px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
        {product.name}
      </div>
      {product.format && (
        <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold shrink-0 whitespace-nowrap violet-surface text-primary">
          {product.format}
        </span>
      )}
      <StatusDot status={product.status} />
    </div>
  );
}
