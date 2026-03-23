import { useState, useRef, useEffect } from "react";
import { PRODUCT_STATUSES, type ProductStatusKey } from "@/lib/productData";

interface StatusDotProps {
  status: ProductStatusKey;
}

export function StatusDot({ status }: StatusDotProps) {
  const [show, setShow] = useState(false);
  const s = PRODUCT_STATUSES[status];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  return (
    <div ref={ref} className="relative shrink-0">
      <div
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="w-[10px] h-[10px] rounded-full cursor-pointer transition-transform duration-150 hover:scale-[1.3]"
        style={{ background: s.color }}
      />
      {show && (
        <div className="absolute bottom-[calc(100%+6px)] right-[-4px] bg-[#1e293b] text-white text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap animate-in fade-in duration-100 z-30">
          {s.label}
          <div className="absolute top-full right-2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1e293b]" />
        </div>
      )}
    </div>
  );
}
