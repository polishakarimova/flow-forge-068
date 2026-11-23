import { ChevronDown } from "lucide-react";
import { PRODUCT_STATUSES, PRODUCT_STATUS_ORDER, type ProductStatusKey } from "@/lib/productData";

interface ProductStatusSelectProps {
  value: ProductStatusKey;
  onChange: (value: ProductStatusKey) => void;
}

export function ProductStatusSelect({ value, onChange }: ProductStatusSelectProps) {
  const status = PRODUCT_STATUSES[value];
  return (
    <div className="relative inline-flex items-center rounded-xl" style={{ background: status.bg }}>
      <span aria-hidden="true" className="absolute left-3 h-2 w-2 rounded-full pointer-events-none" style={{ background: status.color }} />
      <select
        id="edit-product-status"
        value={value}
        onChange={event => onChange(event.target.value as ProductStatusKey)}
        className="min-h-11 appearance-none rounded-xl bg-transparent pl-7 pr-8 text-sm font-medium text-foreground"
      >
        {PRODUCT_STATUS_ORDER.map(key => <option key={key} value={key}>{PRODUCT_STATUSES[key].label}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="absolute right-2 h-4 w-4 pointer-events-none text-muted-foreground" />
    </div>
  );
}
