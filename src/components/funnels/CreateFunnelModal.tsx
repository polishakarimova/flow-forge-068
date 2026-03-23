import { useState, useMemo } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { useDataStore } from "@/lib/dataStore";
import { PRODUCT_TYPES, type Product } from "@/lib/productData";
import { PLATFORMS } from "@/lib/contentData";
import type { BadgeColor, ContentItem, FunnelProduct, Funnel } from "@/lib/funnelData";

interface CreateFunnelModalProps {
  onClose: () => void;
}

const BADGE_COLORS: { value: BadgeColor; label: string; hex: string }[] = [
  { value: "violet", label: "Фиолетовый", hex: "#8B5CF6" },
  { value: "honey", label: "Золотой", hex: "#E8B66D" },
  { value: "lilac", label: "Сиреневый", hex: "#A78BFA" },
  { value: "amber", label: "Янтарный", hex: "#D4A056" },
];

// Map productData typeId → product tier slots used in funnel creation steps
const TIER_STEPS: { typeId: string; label: string; field: keyof Pick<Funnel, "leadMagnet" | "tripwire" | "midTicket" | "flagship" | "consultation"> }[] = [
  { typeId: "lead_magnet", label: "Лид-магнит", field: "leadMagnet" },
  { typeId: "tripwire", label: "Трипвайер", field: "tripwire" },
  { typeId: "mid_ticket", label: "Среднечек", field: "midTicket" },
  { typeId: "flagship", label: "Флагман", field: "flagship" },
  { typeId: "consultation", label: "Консультация / Личка", field: "consultation" },
];

// Map contentData platformId → funnelData platform/format
const PLATFORM_MAP: Record<string, { platform: string; format: string }> = {
  stories: { platform: "Instagram", format: "Stories" },
  tg_post: { platform: "Telegram", format: "Пост" },
  ig_post: { platform: "Instagram", format: "Пост" },
  carousel: { platform: "Instagram", format: "Карусель" },
  reels: { platform: "Instagram", format: "Reels" },
  threads: { platform: "Threads", format: "Тред" },
  youtube: { platform: "YouTube", format: "Видео" },
  article: { platform: "Blog", format: "Статья" },
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

export function CreateFunnelModal({ onClose }: CreateFunnelModalProps) {
  const { keywords, addKeyword, deleteKeyword, funnelsForKeyword, products, topics, addFunnel } = useDataStore();

  // Form state
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [badgeColor, setBadgeColor] = useState<BadgeColor>("violet");
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number | null>>({});
  const [selectedContentIds, setSelectedContentIds] = useState<Set<number>>(new Set());

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Products by type
  const productsByType = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      // Group consultation and private together
      const key = p.typeId === "private" ? "consultation" : p.typeId;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [products]);

  // All content items (from non-idea topics)
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

  const handleAddKeyword = () => {
    const kw = newKeyword.trim().toUpperCase();
    if (!kw) return;
    addKeyword(kw);
    setSelectedKeyword(kw);
    setNewKeyword("");
  };

  const handleDeleteKeyword = (kw: string) => {
    const related = funnelsForKeyword(kw);
    if (related.length > 0) {
      setPendingDelete(kw);
    } else {
      deleteKeyword(kw);
      if (selectedKeyword === kw) setSelectedKeyword("");
    }
  };

  const confirmDeleteKeyword = () => {
    if (pendingDelete) {
      deleteKeyword(pendingDelete);
      if (selectedKeyword === pendingDelete) setSelectedKeyword("");
      setPendingDelete(null);
    }
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

    // Build content items for the funnel
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

    // Build product selections
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

          {/* ─── Keyword selection ─── */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-2">Кодовое слово</label>

            {/* Existing keywords */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map((kw) => {
                const sel = selectedKeyword === kw;
                return (
                  <div key={kw} className="flex items-center gap-0">
                    <button
                      onClick={() => setSelectedKeyword(sel ? "" : kw)}
                      className="px-3 py-1.5 rounded-l-xl text-[12px] font-bold cursor-pointer transition-all duration-200 border-none"
                      style={{
                        background: sel ? "hsl(var(--primary))" : "hsl(var(--muted))",
                        color: sel ? "white" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {kw}
                    </button>
                    <button
                      onClick={() => handleDeleteKeyword(kw)}
                      className="px-1.5 py-1.5 rounded-r-xl text-[12px] cursor-pointer transition-all duration-200 border-none flex items-center"
                      style={{
                        background: sel ? "hsl(var(--primary) / 0.8)" : "hsl(var(--muted) / 0.8)",
                        color: sel ? "white" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add new keyword */}
            <div className="flex gap-2">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="Новое слово..."
                className="flex-1 px-3 py-2 rounded-xl border-[1.5px] border-border text-[13px] font-bold uppercase outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-none flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить
              </button>
            </div>
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

          {/* ─── Product tiers ─── */}
          {TIER_STEPS.map((step) => {
            const available = productsByType[step.typeId] || [];
            const selectedId = selectedProducts[step.field] || null;
            const typeInfo = PRODUCT_TYPES.find((t) => t.id === step.typeId);

            return (
              <div key={step.field} className="mb-4">
                <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">
                  {typeInfo?.icon} {step.label}
                  <span className="text-[11px] font-normal ml-1">(необязательно)</span>
                </label>
                {available.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground italic py-1.5">
                    Нет продуктов типа «{step.label}». Создайте в разделе Продукты.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {available.map((p) => {
                      const sel = selectedId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProducts((prev) => ({ ...prev, [step.field]: sel ? null : p.id }))}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] cursor-pointer transition-all duration-200 border-[1.5px]"
                          style={{
                            borderColor: sel ? (typeInfo?.color || "hsl(var(--primary))") : "hsl(var(--border))",
                            background: sel ? (typeInfo?.color || "hsl(var(--primary))") + "10" : "transparent",
                          }}
                        >
                          <span className="font-semibold text-foreground flex-1 truncate">{p.name}</span>
                          {p.price && (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {p.price} {p.currency}
                            </span>
                          )}
                          {sel && <span style={{ color: typeInfo?.color }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ─── Content selection ─── */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">
              📝 Контент для воронки
              <span className="text-[11px] font-normal ml-1">(можно несколько)</span>
            </label>
            {allContent.length === 0 ? (
              <div className="text-[12px] text-muted-foreground italic py-1.5">
                Нет контента. Создайте в разделе Контент.
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-[200px] overflow-auto rounded-xl border border-border p-1.5">
                {allContent.map((ci) => {
                  const sel = selectedContentIds.has(ci.id);
                  const plat = PLATFORMS.find((p) => p.id === ci.platformId);

                  return (
                    <button
                      key={ci.id}
                      onClick={() => toggleContent(ci.id)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] cursor-pointer transition-all duration-150"
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
                        <span className="text-[13px] shrink-0" title={plat.label}>
                          {plat.icon}
                        </span>
                      )}
                      <span className="text-foreground font-medium flex-1 truncate">{ci.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 max-w-[80px] truncate">
                        {ci.topicTitle}
                      </span>
                    </button>
                  );
                })}
              </div>
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
