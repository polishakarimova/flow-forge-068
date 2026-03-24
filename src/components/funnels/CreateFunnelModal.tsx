import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, Search, ChevronDown } from "lucide-react";
import { useDataStore } from "@/lib/dataStore";
import { PRODUCT_TYPES, type Product } from "@/lib/productData";
import { PLATFORMS } from "@/lib/contentData";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import type { BadgeColor, ContentItem, FunnelProduct, Funnel } from "@/lib/funnelData";

interface CreateFunnelModalProps {
  onClose: () => void;
}

const BADGE_COLORS: { value: BadgeColor; label: string; hex: string }[] = [
  { value: "violet", label: "Фиолетовый", hex: "#8B5CF6" },
  { value: "honey", label: "Золотой", hex: "#E8B66D" },
];

const TIER_STEPS: { typeId: string; label: string; field: keyof Pick<Funnel, "leadMagnet" | "tripwire" | "midTicket" | "flagship" | "consultation"> }[] = [
  { typeId: "lead_magnet", label: "Лид-магнит", field: "leadMagnet" },
  { typeId: "tripwire", label: "Трипвайер", field: "tripwire" },
  { typeId: "mid_ticket", label: "Среднечек", field: "midTicket" },
  { typeId: "flagship", label: "Флагман", field: "flagship" },
  { typeId: "consultation", label: "Консультация / Личная работа", field: "consultation" },
];

const PLATFORM_MAP: Record<string, { platform: string; format: string }> = {
  stories: { platform: "Instagram", format: "Stories" },
  tg_post: { platform: "Telegram", format: "Пост" },
  ig_post: { platform: "Instagram", format: "Пост" },
  carousel: { platform: "Instagram", format: "Карусель" },
  reels: { platform: "Instagram", format: "Reels" },
  threads: { platform: "Threads", format: "Тред" },
  youtube: { platform: "YouTube", format: "Видео" },
  article: { platform: "Blog", format: "Статья" },
  vk: { platform: "VK", format: "Пост" },
};

const STATUS_MAP: Record<string, "published" | "ready" | "draft"> = {
  published: "published",
  ready: "ready",
  in_progress: "draft",
  idea: "draft",
};

function productToFunnelProduct(p: Product): FunnelProduct {
  const typeInfo = PRODUCT_TYPES.find((t) => t.id === p.typeId);
  const tierMap: Record<string, "lead-magnet" | "mid-ticket" | "flagship"> = {
    lead_magnet: "lead-magnet",
    tripwire: "lead-magnet",
    mid_ticket: "mid-ticket",
    flagship: "flagship",
    consultation: "flagship",
    private: "flagship",
  };
  return {
    id: `p${p.id}`,
    name: p.name,
    price: p.price ? `${p.price} ${p.currency}` : "Бесплатно",
    type: typeInfo?.label || p.typeId,
    tier: tierMap[p.typeId] || "lead-magnet",
    description: p.description,
    offerUrl: p.link || undefined,
  };
}

/* ── Reusable dropdown for keyword / product selection ── */

function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  onDelete,
  onAdd,
  addPlaceholder,
}: {
  value: string | number | null;
  onChange: (v: string | number | null) => void;
  options: { value: string | number; label: string; sub?: string }[];
  placeholder: string;
  onDelete?: (v: string | number) => void;
  onAdd?: (label: string) => void;
  addPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [addValue, setAddValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border-[1.5px] border-border bg-card text-[13px] font-medium cursor-pointer transition-all duration-200 hover:border-primary/40 ${
          selected ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border/60 rounded-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)] max-h-[240px] overflow-auto">
          {/* None option */}
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className={`px-3 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-150 ${
              value === null ? "violet-surface text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {placeholder}
          </div>

          {options.map((o) => (
            <div
              key={o.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] cursor-pointer transition-all duration-150 ${
                value === o.value ? "violet-surface text-primary font-semibold" : "text-foreground hover:bg-muted/50"
              }`}
            >
              <span
                className="flex-1 truncate"
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
                {o.sub && <span className="text-[11px] text-muted-foreground ml-1.5">{o.sub}</span>}
              </span>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(o.value); }}
                  className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add new inline */}
          {onAdd && (
            <div className="flex items-center gap-1.5 px-2 pt-1.5 mt-1 border-t border-border">
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addValue.trim()) {
                    onAdd(addValue.trim());
                    setAddValue("");
                  }
                }}
                placeholder={addPlaceholder || "Добавить..."}
                className="flex-1 px-2 py-1.5 rounded-lg border border-border text-[12px] font-bold uppercase outline-none focus:border-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => {
                  if (addValue.trim()) { onAdd(addValue.trim()); setAddValue(""); }
                }}
                disabled={!addValue.trim()}
                className="p-1.5 rounded-lg bg-primary text-primary-foreground cursor-pointer disabled:opacity-30 border-none"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main modal ── */

export function CreateFunnelModal({ onClose }: CreateFunnelModalProps) {
  const { keywords, addKeyword, deleteKeyword, funnelsForKeyword, products, topics, addFunnel } = useDataStore();

  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [badgeColor, setBadgeColor] = useState<BadgeColor>("violet");
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number | null>>({});
  const [selectedContentIds, setSelectedContentIds] = useState<Set<number>>(new Set());
  const [contentSearch, setContentSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const productsByType = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      const key = p.typeId === "private" ? "consultation" : p.typeId;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [products]);

  const allContent = useMemo(() => {
    const items: { id: number; platformId: string; title: string; topicTitle: string; status: string }[] = [];
    topics.forEach((t) => {
      if (!t.isIdeaBank) {
        t.contentItems.forEach((ci) => {
          items.push({ id: ci.id, platformId: ci.platformId, title: ci.title, topicTitle: t.title, status: ci.status });
        });
      }
    });
    return items;
  }, [topics]);

  const filteredContent = useMemo(() => {
    if (!contentSearch.trim()) return allContent;
    const q = contentSearch.toLowerCase();
    return allContent.filter(
      (ci) => ci.title.toLowerCase().includes(q) || ci.topicTitle.toLowerCase().includes(q)
    );
  }, [allContent, contentSearch]);

  const keywordOptions = useMemo(
    () => keywords.map((kw) => ({ value: kw, label: kw })),
    [keywords]
  );

  const handleDeleteKeyword = (kw: string | number) => {
    const kwStr = String(kw);
    const related = funnelsForKeyword(kwStr);
    if (related.length > 0) {
      setPendingDelete(kwStr);
    } else {
      deleteKeyword(kwStr);
      if (selectedKeyword === kwStr) setSelectedKeyword(null);
    }
  };

  const confirmDeleteKeyword = () => {
    if (pendingDelete) {
      deleteKeyword(pendingDelete);
      if (selectedKeyword === pendingDelete) setSelectedKeyword(null);
      setPendingDelete(null);
    }
  };

  const handleAddKeyword = (kw: string) => {
    const upper = kw.toUpperCase();
    addKeyword(upper);
    setSelectedKeyword(upper);
  };

  const toggleContent = (id: number) => {
    setSelectedContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!selectedKeyword) return;

    const contentItems: ContentItem[] = [];
    selectedContentIds.forEach((id) => {
      const ci = allContent.find((c) => c.id === id);
      if (!ci) return;
      const mapped = PLATFORM_MAP[ci.platformId] || { platform: ci.platformId, format: ci.platformId };
      contentItems.push({
        id: `c${ci.id}`,
        platform: mapped.platform,
        format: mapped.format,
        title: ci.title,
        status: STATUS_MAP[ci.status] || "draft",
      });
    });

    const getProduct = (field: string) => {
      const pId = selectedProducts[field];
      if (!pId) return undefined;
      const p = products.find((pr) => pr.id === pId);
      return p ? productToFunnelProduct(p) : undefined;
    };

    const leadMagnet = getProduct("leadMagnet");

    const funnel: Funnel = {
      id: String(Date.now()),
      keyword: selectedKeyword,
      badgeColor,
      product: leadMagnet?.name || selectedKeyword,
      productType: leadMagnet ? "Лид-магнит" : "",
      active: true,
      contentCount: contentItems.length,
      leads: 0,
      sales: 0,
      contentItems,
      cta: `Напиши ${selectedKeyword} в директ`,
      leadMagnet,
      tripwire: getProduct("tripwire"),
      midTicket: getProduct("midTicket"),
      flagship: getProduct("flagship"),
      consultation: getProduct("consultation"),
    };

    addFunnel(funnel);
    onClose();
  };

  const canCreate = !!selectedKeyword;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[540px] max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="px-7 pt-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-foreground">Новая воронка</h2>
            <button
              onClick={onClose}
              className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
            >
              ✕
            </button>
          </div>

          {/* ─── Keyword dropdown ─── */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Кодовое слово</label>
            <SelectDropdown
              value={selectedKeyword}
              onChange={(v) => setSelectedKeyword(v as string | null)}
              options={keywordOptions}
              placeholder="Выберите слово..."
              onDelete={handleDeleteKeyword}
              onAdd={handleAddKeyword}
              addPlaceholder="Новое слово..."
            />
          </div>

          {/* ─── Badge color ─── */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-2">Цвет</label>
            <div className="flex gap-2">
              {BADGE_COLORS.map((bc) => (
                <button
                  key={bc.value}
                  onClick={() => setBadgeColor(bc.value)}
                  className="w-8 h-8 rounded-full cursor-pointer transition-all duration-200 border-2"
                  style={{
                    background: bc.hex,
                    borderColor: badgeColor === bc.value ? "hsl(var(--foreground))" : "transparent",
                    transform: badgeColor === bc.value ? "scale(1.15)" : "scale(1)",
                  }}
                  title={bc.label}
                />
              ))}
            </div>
          </div>

          {/* ─── Product tiers (dropdowns) ─── */}
          {TIER_STEPS.map((step) => {
            const available = productsByType[step.typeId] || [];
            const typeInfo = PRODUCT_TYPES.find((t) => t.id === step.typeId);

            const options = available.map((p) => ({
              value: p.id,
              label: p.name,
              sub: p.price ? `${p.price} ${p.currency}` : undefined,
            }));

            return (
              <div key={step.field} className="mb-3">
                <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">
                  {step.label}
                  <span className="text-[11px] font-normal ml-1 text-muted-foreground/70">(необязательно)</span>
                </label>
                {available.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground italic py-1">
                    Нет продуктов типа «{step.label}»
                  </div>
                ) : (
                  <SelectDropdown
                    value={selectedProducts[step.field] || null}
                    onChange={(v) => setSelectedProducts((prev) => ({ ...prev, [step.field]: v as number | null }))}
                    options={options}
                    placeholder={`Выберите ${step.label.toLowerCase()}...`}
                  />
                )}
              </div>
            );
          })}

          {/* ─── Content selection with search ─── */}
          <div className="mb-5 mt-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">
              Контент для воронки
              {selectedContentIds.size > 0 && (
                <span className="text-primary ml-1">({selectedContentIds.size})</span>
              )}
            </label>
            {allContent.length === 0 ? (
              <div className="text-[12px] text-muted-foreground italic py-1.5">
                Нет контента. Создайте в разделе Контент.
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border-[1.5px] border-border text-[12px] outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                  />
                </div>

                {/* List */}
                <div className="flex flex-col gap-0.5 max-h-[180px] overflow-auto rounded-xl border border-border p-1.5">
                  {filteredContent.length === 0 ? (
                    <div className="text-[12px] text-muted-foreground text-center py-3">Ничего не найдено</div>
                  ) : (
                    filteredContent.map((ci) => {
                      const sel = selectedContentIds.has(ci.id);
                      const plat = PLATFORMS.find((p) => p.id === ci.platformId);

                      return (
                        <button
                          key={ci.id}
                          onClick={() => toggleContent(ci.id)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] cursor-pointer transition-all duration-150 border-none"
                          style={{
                            background: sel ? "hsl(var(--primary) / 0.08)" : "transparent",
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-md border-[1.5px] flex items-center justify-center text-[10px] shrink-0"
                            style={{
                              borderColor: sel ? "hsl(var(--primary))" : "hsl(var(--border))",
                              background: sel ? "hsl(var(--primary))" : "transparent",
                              color: sel ? "white" : "transparent",
                            }}
                          >
                            ✓
                          </span>
                          {plat && (
                            <PlatformIcon platformId={ci.platformId} size={14} />
                          )}
                          <span className="text-foreground font-medium flex-1 truncate">{ci.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 max-w-[80px] truncate">
                            {ci.topicTitle}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-border">
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full py-3 px-4 rounded-2xl text-[14px] font-bold cursor-pointer transition-all duration-200 disabled:cursor-not-allowed border-none"
            style={{
              background: canCreate ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" : "hsl(var(--muted))",
              color: canCreate ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            Создать воронку →
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] animate-in fade-in duration-150"
          onClick={(e) => { if (e.target === e.currentTarget) setPendingDelete(null); }}
        >
          <div className="bg-card rounded-2xl p-6 max-w-[380px] w-full animate-in slide-in-from-bottom-2 duration-200" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-foreground mb-1">Удалить «{pendingDelete}»?</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  К этому кодовому слову привязано {funnelsForKeyword(pendingDelete).length} воронок.
                  При удалении слова воронки останутся, но потеряют привязку.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer border-[1.5px] border-border bg-transparent text-foreground hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteKeyword}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer border-none bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
