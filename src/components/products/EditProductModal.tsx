import { useState, useCallback } from "react";
import { formatProductDateLabel, type Product, type ProductStatusKey, type ProductType } from "@/lib/productData";
import { ProductStatusSelect } from "./ProductStatusSelect";
import { FormatSelector } from "./FormatSelector";
import { ProductTypeIcon } from "./ProductTypeIcon";
import { ProductTypeSelector } from "./ProductTypeSelector";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
  formats: string[];
  onAddFormat: (f: string) => void;
  onDeleteFormat: (f: string) => void;
  productTypes: ProductType[];
  onAddProductType: (label: string) => string | null;
  onDeleteProductType: (id: string) => void;
}

export function EditProductModal({ product, onClose, onSave, formats, onAddFormat, onDeleteFormat, productTypes, onAddProductType, onDeleteProductType }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [typeId, setTypeId] = useState(product.typeId);
  const [format, setFormat] = useState(product.format);
  const [price, setPrice] = useState(product.price);
  const [link, setLink] = useState(product.link || "");
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState<ProductStatusKey>(product.status);
  const [publishDate, setPublishDate] = useState(product.publishDate || "");

  const type = productTypes.find((t) => t.id === typeId);

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
        <div className="h-[4px] rounded-t-3xl bg-primary" />
        <div className="px-7 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              {type && <ProductTypeIcon typeId={type.id} size={22} />}
              <span className="text-[16px] font-bold text-foreground uppercase">{type?.label}</span>
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
              className="w-full px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[14px] leading-5 outline-none transition-all duration-200"
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
            <ProductTypeSelector
              value={typeId}
              productTypes={productTypes}
              onChange={setTypeId}
              onAddType={onAddProductType}
              onDeleteType={onDeleteProductType}
            />
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
                className="w-full px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[13px] leading-5 outline-none transition-all duration-200"
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--primary))";
                  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
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
              className="w-full px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[14px] leading-5 outline-none transition-all duration-200"
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Создано</label>
              <div className="px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[13px] leading-5 text-muted-foreground bg-muted/50">
                {formatProductDateLabel(product.createdDate) || "—"}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Дата публикации</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[13px] leading-5 outline-none transition-all duration-200"
                style={{ color: publishDate ? "#334155" : "#94a3b8" }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--primary))";
                  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
              />
            </div>
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
              className="w-full px-3.5 py-2 rounded-xl border-[1.5px] border-border text-[14px] outline-none leading-5 transition-all duration-200"
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
              onSave({ ...product, name: name.trim(), typeId, format, price: price.trim(), description: description.trim(), link: link.trim(), status, publishDate });
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl text-[14px] font-bold cursor-pointer text-white border-none transition-all duration-200 hover:shadow-lg"
            style={{ background: "hsl(var(--primary))" }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

