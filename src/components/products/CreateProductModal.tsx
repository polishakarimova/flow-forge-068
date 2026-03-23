import { useState } from "react";
import { PRODUCT_TYPES } from "@/lib/productData";
import { FormatSelector } from "./FormatSelector";

interface CreateProductModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; typeId: string; format: string; price: string; currency: string; description: string; link: string }) => void;
  formats: string[];
  onAddFormat: (f: string) => void;
  onDeleteFormat: (f: string) => void;
}

export function CreateProductModal({ onClose, onCreate, formats, onAddFormat, onDeleteFormat }: CreateProductModalProps) {
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [format, setFormat] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = name.trim() && typeId;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[500px] max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="px-7 pt-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-foreground">Новый продукт</h2>
            <button
              onClick={onClose}
              className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
            >
              ✕
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название продукта</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Наставничество 1 на 1"
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              autoFocus
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
                    onClick={() => setTypeId(sel ? "" : t.id)}
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
                placeholder="2 990 ₽ или бесплатно"
                className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
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
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Содержание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что входит в продукт, для кого, результат..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none resize-y leading-relaxed transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>
        </div>

        <div className="px-7 py-4 border-t border-border">
          <button
            onClick={() => {
              if (!canCreate) return;
              onCreate({ name: name.trim(), typeId, format, price: price.trim(), currency: "₽", description: description.trim(), link: link.trim() });
              onClose();
            }}
            disabled={!canCreate}
            className="w-full py-3 px-4 rounded-2xl text-[14px] font-bold cursor-pointer transition-all duration-200 disabled:cursor-not-allowed border-none"
            style={{
              background: canCreate ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" : "hsl(var(--muted))",
              color: canCreate ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            Создать продукт →
          </button>
        </div>
      </div>
    </div>
  );
}
