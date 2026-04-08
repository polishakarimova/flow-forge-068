import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { DEFAULT_FORMATS, type Product, type ProductStatusKey } from "@/lib/productData";
import { type Topic, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { type Funnel } from "@/lib/funnelData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";

interface DataStore {
  // Products
  products: Product[];
  addProduct: (p: Omit<Product, "id" | "status" | "createdDate" | "publishDate">) => void;
  updateProduct: (p: Product) => void;

  // Formats
  formats: string[];
  addFormat: (f: string) => void;
  deleteFormat: (f: string) => void;

  // Topics / Content
  topics: Topic[];
  allContentItems: ContentItemData[];
  addTopic: (t: Omit<Topic, "id">) => void;
  updateTopic: (t: Topic) => void;
  updateContentItem: (item: ContentItemData) => void;

  // Keywords
  keywords: string[];
  addKeyword: (kw: string) => void;
  deleteKeyword: (kw: string) => boolean;

  // Funnels
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  addFunnel: (f: Funnel) => void;
  updateFunnel: (f: Funnel) => void;
  toggleFunnelActive: (id: string) => void;
  funnelsForKeyword: (kw: string) => Funnel[];

  // Loading
  isDataLoading: boolean;
}

const DataStoreContext = createContext<DataStore | null>(null);

/* ── Supabase helpers ────────────────────────────── */

function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    typeId: row.type_id,
    format: row.format,
    status: row.status as ProductStatusKey,
    price: row.price,
    currency: row.currency,
    description: row.description,
    link: row.link,
    createdDate: row.created_date,
    publishDate: row.publish_date,
  };
}

function mapDbContentItem(row: any): ContentItemData {
  return {
    id: row.id,
    platformId: row.platform_id,
    status: row.status as ContentStatusKey,
    title: row.title,
    body: row.body,
    createdDate: row.created_date,
    publishDate: row.publish_date,
  };
}

function mapDbTopic(row: any, contentItems: ContentItemData[]): Topic {
  return {
    id: row.id,
    title: row.title,
    thesisPlan: row.thesis_plan,
    isIdeaBank: row.is_idea_bank,
    contentItems,
  };
}

function mapDbFunnel(row: any): Funnel {
  return {
    id: String(row.id),
    keyword: row.keyword,
    badgeColor: row.badge_color,
    product: row.product,
    productType: row.product_type,
    active: row.active,
    contentCount: row.content_count,
    leads: row.leads,
    sales: row.sales,
    cta: row.cta,
    contentItemIds: row.content_item_ids || [],
    leadMagnetId: row.lead_magnet_id,
    tripwireId: row.tripwire_id,
    midTicketId: row.mid_ticket_id,
    flagshipId: row.flagship_id,
    consultationId: row.consultation_id,
  };
}

/* ── Provider ────────────────────────────────────── */

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [formats, setFormats] = useState<string[]>(DEFAULT_FORMATS);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  /* ── Load data from Supabase on login ──────────── */
  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setProducts([]);
      setTopics([]);
      setFunnels([]);
      setKeywords([]);
      return;
    }

    let cancelled = false;
    setIsDataLoading(true);

    async function loadAll() {
      try {
        // Load products
        const { data: prodRows } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        // Load topics
        const { data: topicRows } = await supabase
          .from("topics")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        // Load content items
        const { data: ciRows } = await supabase
          .from("content_items")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        // Load funnels
        const { data: funnelRows } = await supabase
          .from("funnels")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        // Load keywords
        const { data: kwRows } = await supabase
          .from("keywords")
          .select("*")
          .eq("user_id", userId);

        // Load formats
        const { data: fmtRows } = await supabase
          .from("formats")
          .select("*")
          .eq("user_id", userId);

        if (cancelled) return;

        // Map products
        setProducts((prodRows || []).map(mapDbProduct));

        // Map topics with nested content items
        const allCi = (ciRows || []).map(mapDbContentItem);
        const topicsMapped = (topicRows || []).map((t: any) => {
          const items = allCi.filter((ci: any) => {
            const row = (ciRows || []).find((r: any) => r.id === ci.id);
            return row?.topic_id === t.id;
          });
          return mapDbTopic(t, items);
        });
        setTopics(topicsMapped);

        // Map funnels
        setFunnels((funnelRows || []).map(mapDbFunnel));

        // Map keywords
        setKeywords((kwRows || []).map((r: any) => r.keyword));

        // Map formats
        if (fmtRows && fmtRows.length > 0) {
          setFormats(fmtRows.map((r: any) => r.name));
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [userId, isAuthenticated]);

  /* ── Products ──────────────────────────────────── */

  const addProduct = useCallback((data: Omit<Product, "id" | "status" | "createdDate" | "publishDate">) => {
    const createdDate = new Date().toISOString().slice(0, 10);
    const tempId = Date.now();
    const newProduct: Product = { ...data, id: tempId, status: "draft" as ProductStatusKey, createdDate, publishDate: "" };
    setProducts((prev) => [newProduct, ...prev]);

    if (userId) {
      supabase.from("products").insert({
        user_id: userId,
        name: data.name,
        type_id: data.typeId,
        format: data.format,
        price: data.price,
        currency: data.currency,
        description: data.description,
        link: data.link,
        created_date: createdDate,
        publish_date: "",
      }).select().single().then(({ data: row }) => {
        if (row) setProducts((prev) => prev.map((p) => p.id === tempId ? { ...newProduct, id: row.id } : p));
      });
    }
  }, [userId]);

  const updateProduct = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (userId) {
      supabase.from("products").update({
        name: updated.name,
        type_id: updated.typeId,
        format: updated.format,
        status: updated.status,
        price: updated.price,
        currency: updated.currency,
        description: updated.description,
        link: updated.link,
        publish_date: updated.publishDate,
      }).eq("id", updated.id).eq("user_id", userId).then(() => {});
    }
  }, [userId]);

  /* ── Formats ───────────────────────────────────── */

  const addFormat = useCallback((f: string) => {
    setFormats((prev) => prev.includes(f) ? prev : [...prev, f]);
    if (userId) {
      supabase.from("formats").insert({ user_id: userId, name: f }).then(() => {});
    }
  }, [userId]);

  const deleteFormat = useCallback((f: string) => {
    setFormats((prev) => prev.filter((x) => x !== f));
    if (userId) {
      supabase.from("formats").delete().eq("user_id", userId).eq("name", f).then(() => {});
    }
  }, [userId]);

  /* ── Topics & Content ──────────────────────────── */

  const addTopic = useCallback((data: Omit<Topic, "id">) => {
    const tempId = Date.now();
    setTopics((prev) => [{ ...data, id: tempId }, ...prev]);

    if (userId) {
      supabase.from("topics").insert({
        user_id: userId,
        title: data.title,
        thesis_plan: data.thesisPlan,
        is_idea_bank: data.isIdeaBank,
      }).select().single().then(({ data: row }) => {
        if (row) {
          const realId = row.id;
          setTopics((prev) => prev.map((t) => t.id === tempId ? { ...t, id: realId } : t));
          // Insert content items with real topic id
          if (data.contentItems.length > 0) {
            const ciInserts = data.contentItems.map((ci) => ({
              user_id: userId,
              topic_id: realId,
              platform_id: ci.platformId,
              status: ci.status,
              title: ci.title,
              body: ci.body,
              created_date: ci.createdDate,
              publish_date: ci.publishDate,
            }));
            supabase.from("content_items").insert(ciInserts).select().then(({ data: ciRows }) => {
              if (ciRows) {
                const mappedCi = ciRows.map(mapDbContentItem);
                setTopics((prev) => prev.map((t) => t.id === realId ? { ...t, contentItems: mappedCi } : t));
              }
            });
          }
        }
      });
    }
  }, [userId]);

  const updateTopic = useCallback((updated: Topic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (userId) {
      supabase.from("topics").update({
        title: updated.title,
        thesis_plan: updated.thesisPlan,
        is_idea_bank: updated.isIdeaBank,
      }).eq("id", updated.id).eq("user_id", userId).then(() => {});
    }
  }, [userId]);

  const updateContentItem = useCallback((item: ContentItemData) => {
    setTopics((prev) =>
      prev.map((t) => ({
        ...t,
        contentItems: t.contentItems.map((ci) => (ci.id === item.id ? item : ci)),
      }))
    );
    if (userId) {
      supabase.from("content_items").update({
        platform_id: item.platformId,
        status: item.status,
        title: item.title,
        body: item.body,
        publish_date: item.publishDate,
      }).eq("id", item.id).eq("user_id", userId).then(() => {});
    }
  }, [userId]);

  const allContentItems = useMemo(
    () => topics.flatMap((t) => t.contentItems),
    [topics]
  );

  /* ── Keywords ──────────────────────────────────── */

  const addKeyword = useCallback((kw: string) => {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
    if (userId) {
      supabase.from("keywords").insert({ user_id: userId, keyword: kw }).then(() => {});
    }
  }, [userId]);

  const funnelsForKeyword = useCallback(
    (kw: string) => funnels.filter((f) => f.keyword === kw),
    [funnels]
  );

  const deleteKeyword = useCallback(
    (kw: string) => {
      setKeywords((prev) => prev.filter((k) => k !== kw));
      if (userId) {
        supabase.from("keywords").delete().eq("user_id", userId).eq("keyword", kw).then(() => {});
      }
      return true;
    },
    [userId]
  );

  /* ── Funnels ───────────────────────────────────── */

  const addFunnel = useCallback((f: Funnel) => {
    const tempId = f.id;
    setFunnels((prev) => [f, ...prev]);

    if (userId) {
      supabase.from("funnels").insert({
        user_id: userId,
        keyword: f.keyword,
        badge_color: f.badgeColor,
        product: f.product,
        product_type: f.productType,
        active: f.active,
        content_count: f.contentCount,
        leads: f.leads,
        sales: f.sales,
        cta: f.cta,
        content_item_ids: f.contentItemIds,
        lead_magnet_id: f.leadMagnetId,
        tripwire_id: f.tripwireId,
        mid_ticket_id: f.midTicketId,
        flagship_id: f.flagshipId,
        consultation_id: f.consultationId,
      }).select().single().then(({ data: row }) => {
        if (row) {
          setFunnels((prev) => prev.map((x) => x.id === tempId ? { ...f, id: String(row.id) } : x));
        }
      });
    }
  }, [userId]);

  const updateFunnel = useCallback((f: Funnel) => {
    setFunnels((prev) => prev.map((x) => (x.id === f.id ? f : x)));
    if (userId) {
      supabase.from("funnels").update({
        keyword: f.keyword,
        badge_color: f.badgeColor,
        product: f.product,
        product_type: f.productType,
        active: f.active,
        content_count: f.contentCount,
        leads: f.leads,
        sales: f.sales,
        cta: f.cta,
        content_item_ids: f.contentItemIds,
        lead_magnet_id: f.leadMagnetId,
        tripwire_id: f.tripwireId,
        mid_ticket_id: f.midTicketId,
        flagship_id: f.flagshipId,
        consultation_id: f.consultationId,
      }).eq("id", Number(f.id)).eq("user_id", userId).then(() => {});
    }
  }, [userId]);

  const toggleFunnelActive = useCallback((id: string) => {
    setFunnels((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f));
      const funnel = updated.find((f) => f.id === id);
      if (funnel && userId) {
        supabase.from("funnels").update({ active: funnel.active }).eq("id", Number(id)).eq("user_id", userId).then(() => {});
      }
      return updated;
    });
  }, [userId]);

  /* ── Context value ─────────────────────────────── */

  const value = useMemo(
    () => ({
      products, addProduct, updateProduct,
      formats, addFormat, deleteFormat,
      topics, allContentItems, addTopic, updateTopic, updateContentItem,
      keywords, addKeyword, deleteKeyword,
      funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword,
      isDataLoading,
    }),
    [products, addProduct, updateProduct, formats, addFormat, deleteFormat, topics, allContentItems, addTopic, updateTopic, updateContentItem, keywords, addKeyword, deleteKeyword, funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword, isDataLoading]
  );

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
