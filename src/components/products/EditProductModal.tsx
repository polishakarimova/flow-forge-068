import { ProductFormDialog } from "./ProductFormDialog";
import { ProductRelations } from "@/components/content/FunnelOverview";
import { useState, useCallback } from "react";
import { formatProductDateLabel, type Product, type ProductStatusKey, type ProductType } from "@/lib/productData";
import { ProductStatusSelect } from "./ProductStatusSelect";
import { FormatSelector } from "./FormatSelector";
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

  const type = productTypes.find(item => item.id === typeId);
  const [nameError, setNameError] = useState(false);

  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(80, el.scrollHeight) + "px";
    }
  }, []);

  const dirty = name !== product.name || typeId !== product.typeId || format !== product.format || price !== product.price || link !== (product.link || "") || description !== product.description || status !== product.status || publishDate !== (product.publishDate || "");
  return (
    <ProductFormDialog title={product.name} onClose={onClose} dirty={dirty} footer={
      <button
        onClick={() => {
          if (!name.trim()) {
            setNameError(true);
            document.getElementById("edit-product-name")?.focus();
            return;
          }
          onSave({ ...product, name: name.trim(), typeId, format, price: price.trim(), description: description.trim(), link: link.trim(), status, publishDate });
          onClose();
        }}
        className="w-full py-2.5 rounded-xl sm:rounded-2xl text-[14px] font-bold cursor-pointer text-white border-none transition-all duration-200 hover:shadow-lg"
        style={{ background: "hsl(var(--primary))" }}
      >
        Сохранить
      </button>
    }>
      <div className="mb-3 flex items-center justify-between"><label htmlFor="edit-product-status" className="text-sm font-medium">Статус</label><ProductStatusSelect value={status} onChange={setStatus} /></div>
      {/* Name */}
      <div className="mb-3 sm:mb-4">
        <label htmlFor="edit-product-name" className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название</label>
        <input
          id="edit-product-name" aria-invalid={nameError && !name.trim()} aria-describedby={nameError && !name.trim() ? "edit-product-name-error" : undefined} value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] leading-5 outline-none transition-all duration-200"
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

      {nameError && !name.trim() && <p id="edit-product-name-error" role="alert" className="mb-3 text-sm text-destructive">Добавьте название продукта.</p>}
      {/* Product type */}
      <div className="mb-3 sm:mb-4">
        <ProductTypeSelector
          value={typeId}
          productTypes={productTypes}
          onChange={setTypeId}
          onAddType={onAddProductType}
          onDeleteType={onDeleteProductType}
        />
      </div>

      {/* Format + Price */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div>
          <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Формат</label>
          <FormatSelector value={format} onChange={setFormat} formats={formats} onAddFormat={onAddFormat} onDeleteFormat={onDeleteFormat} />
        </div>
        <div>
          <label htmlFor="edit-product-price" className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Цена</label>
          <input
            id="edit-product-price" value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="бесплатно"
            className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 outline-none transition-all duration-200"
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
      <div className="mb-3 sm:mb-4">
        <label htmlFor="edit-product-link" className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Ссылка</label>
        <input
          id="edit-product-link" value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] leading-5 outline-none transition-all duration-200"
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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div>
          <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Создано</label>
          <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 text-muted-foreground bg-muted/50">
            {formatProductDateLabel(product.createdDate) || "—"}
          </div>
        </div>
        <div>
          <label htmlFor="edit-product-date" className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Дата публикации</label>
          <input
            type="date"
            id="edit-product-date" value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 outline-none transition-all duration-200"
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
      <div className="mb-4 sm:mb-5">
        <label htmlFor="edit-product-description" className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Содержание</label>
        <textarea
          ref={textareaRef}
          id="edit-product-description" value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.max(80, e.target.scrollHeight) + "px";
          }}
          placeholder="Что входит, для кого, результат..."
          rows={3}
          className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] outline-none leading-5 transition-all duration-200"
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
      <ProductRelations productId={product.id} />
    </ProductFormDialog>
  );
}
