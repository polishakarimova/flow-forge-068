import { PRODUCT_TYPES, PRODUCT_STATUSES, type Product } from "@/lib/productData";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const type = PRODUCT_TYPES.find((t) => t.id === product.typeId);
  const status = PRODUCT_STATUSES[product.status];
  const isActive = product.status === "active";

  return (
    <div
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200"
      onClick={() => onOpen(product)}
    >
      {/* Status dot — animated for active, static for others */}
      {isActive ? (
        <span className="relative shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
          <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
        </span>
      ) : (
        <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: status.color }} />
      )}

      {/* Type abbreviation badge — like funnel ЛМ/СЧ/ФГ */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.05em] bg-foreground/[0.06] text-muted-foreground shrink-0">
        {type?.short}
      </span>

      {/* Product name — like funnel truncated name style */}
      <div className="flex-1 min-w-0 text-[10px] text-muted-foreground/60 truncate">
        {product.name}
      </div>

      {/* Format badge */}
      {product.format && (
        <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold shrink-0 whitespace-nowrap violet-surface text-primary">
          {product.format}
        </span>
      )}
    </div>
  );
}
