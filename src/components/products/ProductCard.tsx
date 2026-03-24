import { PRODUCT_TYPES, PRODUCT_STATUSES, type Product } from "@/lib/productData";
import { ProductTypeIcon } from "./ProductTypeIcon";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const type = PRODUCT_TYPES.find((t) => t.id === product.typeId);
  const status = PRODUCT_STATUSES[product.status];

  return (
    <div
      className="card-elevated flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)]"
      onClick={() => onOpen(product)}
    >
      {/* Status dot — gray is static, others pulse */}
      <span className="relative shrink-0 w-2 h-2">
        {status.color !== "#94a3b8" && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
        )}
        <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
      </span>

      {/* Type abbreviation badge */}
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] md:text-[10px] font-medium uppercase tracking-[0.03em] bg-foreground/[0.05] shrink-0" style={{ color: "#4b5563" }}>
        {type && <ProductTypeIcon typeId={type.id} size={14} />}
        {type?.short}
      </span>

      {/* Product name — dark gray like funnel keywords */}
      <div className="flex-1 min-w-0 text-[12px] md:text-[10px] font-normal truncate" style={{ color: "#374151" }}>
        {product.name}
      </div>

      {/* Format badge */}
      {product.format && (
        <span className="text-[11px] md:text-[10px] px-1.5 py-0.5 rounded-lg font-normal shrink-0 whitespace-nowrap violet-surface text-primary">
          {product.format}
        </span>
      )}
    </div>
  );
}
