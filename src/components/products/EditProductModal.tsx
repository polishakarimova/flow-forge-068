import { useState, useRef, useCallback } from "react";
import { PRODUCT_TYPES, type Product, type ProductStatusKey } from "@/lib/productData";
import { ProductStatusSelect } from "./ProductStatusSelect";
import { FormatSelector } from "./FormatSelector";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
  formats: string[];
  onAddFormat: (f: string) => void;
  onDeleteFormat: (f: string) => void;
}

export function EditProductModal({ product, onClose, onSave, formats, onAddFormat, onDeleteFormat }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [typeId, setTypeId] = useState(product.typeId);
  const [format, setFormat] = useState(product.format);
  const [price, setPrice] = useState(product.price);
  const [link, setLink] = useState(product.link || "");
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState<ProductStatusKey>(product.status);

  const type = PRODUCT_TYPES.find((t) => t.id === typeId);

  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(80, el.scrollHeight) + "px";
    }
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[520px] max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="h-[4px] rounded-t-3xl" style={{ background: type?.color || "hsl(var(--primary))" }} />
        <div className="px-7 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{type?.icon}</span>
              <span className="text-[16px] font-bold" style={{ color: type?.color }}>{type?.label}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ProductStatusSelect value={status} onChange={setStatus} />
              <button
                onClick={onClose}
                className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200"
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = type?.color || "hsl(var(--primary))";
                (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(type?.color || "#6366f1")}15`;
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Product type */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-2">Тип продукта</label>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TYPES.map((t) => {
                const sel = typeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeId(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      border: sel ? `2px solid ${t.color}` : "2px solid hsl(var(--border))",
                      background: sel ? t.color + "10" : "transparent",
                      color: sel ? t.color : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                    {sel && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format + Price */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Формат</label>
              <FormatSelector value={format} onChange={setFormat} formats={formats} onAddFormat={onAddFormat} onDeleteFormat={onDeleteFormat} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Цена</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="бесплатно"
                className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] outline-none transition-all duration-200"
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = type?.color || "hsl(var(--primary))";
                  (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(type?.color || "#6366f1")}15`;
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Link */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Ссылка</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200"
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = type?.color || "hsl(var(--primary))";
                (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(type?.color || "#6366f1")}15`;
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Содержание</label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.max(80, e.target.scrollHeight) + "px";
              }}
              placeholder="Что входит, для кого, результат..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none leading-relaxed transition-all duration-200"
              style={{ resize: "none", minHeight: 80, overflow: "hidden" }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = type?.color || "hsl(var(--primary))";
                (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(type?.color || "#6366f1")}15`;
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Save */}
          <button
            onClick={() => {
              onSave({ ...product, name: name.trim(), typeId, format, price: price.trim(), description: description.trim(), link: link.trim(), status });
              onClose();
            }}
            className="w-full py-3 rounded-2xl text-[15px] font-bold cursor-pointer text-white border-none transition-all duration-200 hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${type?.color || "hsl(var(--primary))"}, ${type?.color || "hsl(var(--primary))"}dd)` }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
