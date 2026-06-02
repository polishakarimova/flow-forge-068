import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { DEFAULT_FORMATS, DEFAULT_PRODUCT_TYPES, initialProducts, type Product, type ProductStatusKey, type ProductType } from "@/lib/productData";
import { initialTopics, type Topic, type ContentItemData } from "@/lib/contentData";
import { funnelsData, type Funnel } from "@/lib/funnelData";
import { useAuth } from "@/lib/authContext";

interface DataStore {
  products: Product[];
  addProduct: (p: Omit<Product, "id" | "status" | "createdDate" | "publishDate">) => void;
  updateProduct: (p: Product) => void;
  productTypes: ProductType[];
  addProductType: (label: string) => string | null;
  deleteProductType: (id: string) => void;
  formats: string[];
  addFormat: (f: string) => void;
  deleteFormat: (f: string) => void;
  topics: Topic[];
  allContentItems: ContentItemData[];
  addTopic: (t: Omit<Topic, "id">) => void;
  updateTopic: (t: Topic) => void;
  updateContentItem: (item: ContentItemData) => void;
  keywords: string[];
  addKeyword: (kw: string) => void;
  deleteKeyword: (kw: string) => boolean;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  addFunnel: (f: Funnel) => void;
  updateFunnel: (f: Funnel) => void;
  toggleFunnelActive: (id: string) => void;
  funnelsForKeyword: (kw: string) => Funnel[];
  isDataLoading: boolean;
}

type AppDataState = {
  products: Product[];
  productTypes: ProductType[];
  formats: string[];
  topics: Topic[];
  funnels: Funnel[];
  keywords: string[];
};

const emptyState: AppDataState = {
  products: [],
  productTypes: DEFAULT_PRODUCT_TYPES,
  formats: DEFAULT_FORMATS,
  topics: [],
  funnels: [],
  keywords: [],
};

const demoState: AppDataState = {
  products: initialProducts,
  productTypes: DEFAULT_PRODUCT_TYPES,
  formats: DEFAULT_FORMATS,
  topics: initialTopics,
  funnels: funnelsData,
  keywords: Array.from(new Set(funnelsData.map((f) => f.keyword))),
};

const DataStoreContext = createContext<DataStore | null>(null);

async function loadState(): Promise<AppDataState | null> {
  const response = await fetch("/api/state/main", { credentials: "include" });
  if (!response.ok) return null;
  const { data } = await response.json();
  return data;
}

async function saveState(data: AppDataState) {
  await fetch("/api/state/main", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>(DEFAULT_PRODUCT_TYPES);
  const [formats, setFormats] = useState<string[]>(DEFAULT_FORMATS);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [funnels, setFunnelsRaw] = useState<Funnel[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setProducts([]);
      setProductTypes(DEFAULT_PRODUCT_TYPES);
      setTopics([]);
      setFunnelsRaw([]);
      setKeywords([]);
      setFormats(DEFAULT_FORMATS);
      setHydrated(false);
      return;
    }
    setIsDataLoading(true);
    loadState()
      .then((data) => {
        if (cancelled) return;
        const next = data || demoState;
        setProducts(next.products || []);
        setProductTypes(next.productTypes?.length ? next.productTypes : DEFAULT_PRODUCT_TYPES);
        setFormats(next.formats?.length ? next.formats : DEFAULT_FORMATS);
        setTopics(next.topics || []);
        setFunnelsRaw(next.funnels || []);
        setKeywords(next.keywords || []);
        setHydrated(true);
        if (!data) saveState(next).catch(console.error);
      })
      .catch((err) => console.error("Failed to load app state:", err))
      .finally(() => {
        if (!cancelled) setIsDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    const timer = window.setTimeout(() => {
      saveState({ products, productTypes, formats, topics, funnels, keywords }).catch(console.error);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, hydrated, products, productTypes, formats, topics, funnels, keywords]);

  const setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>> = useCallback((value) => {
    setFunnelsRaw(value);
  }, []);

  const addProduct = useCallback((data: Omit<Product, "id" | "status" | "createdDate" | "publishDate">) => {
    const createdDate = new Date().toISOString().slice(0, 10);
    const newProduct: Product = { ...data, id: Date.now(), status: "draft" as ProductStatusKey, createdDate, publishDate: "" };
    setProducts((prev) => [newProduct, ...prev]);
  }, []);

  const updateProduct = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const addProductType = useCallback((label: string) => {
    const normalized = label.trim();
    if (!normalized) return null;
    const existing = productTypes.find((type) => type.label.toLowerCase() === normalized.toLowerCase());
    if (existing) return existing.id;
    const id = `custom_${Date.now().toString(36)}`;
    setProductTypes((prev) => {
      const short = normalized
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "+";
      return [
        ...prev,
        {
          id,
          label: normalized.toLowerCase(),
          short,
          icon: "+",
          color: "#8b5cf6",
        },
      ];
    });
    return id;
  }, [productTypes]);

  const deleteProductType = useCallback((id: string) => {
    setProductTypes((prev) => prev.filter((type) => type.id !== id));
    setProducts((prev) => prev.map((product) => (product.typeId === id ? { ...product, typeId: "" } : product)));
  }, []);

  const addFormat = useCallback((f: string) => {
    setFormats((prev) => prev.includes(f) ? prev : [...prev, f]);
  }, []);

  const deleteFormat = useCallback((f: string) => {
    setFormats((prev) => prev.filter((x) => x !== f));
  }, []);

  const addTopic = useCallback((data: Omit<Topic, "id">) => {
    setTopics((prev) => [{ ...data, id: Date.now() }, ...prev]);
  }, []);

  const updateTopic = useCallback((updated: Topic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const updateContentItem = useCallback((item: ContentItemData) => {
    setTopics((prev) => prev.map((t) => ({
      ...t,
      contentItems: t.contentItems.map((ci) => (ci.id === item.id ? item : ci)),
    })));
  }, []);

  const allContentItems = useMemo(() => topics.flatMap((t) => t.contentItems), [topics]);

  const addKeyword = useCallback((kw: string) => {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  }, []);

  const funnelsForKeyword = useCallback((kw: string) => funnels.filter((f) => f.keyword === kw), [funnels]);

  const deleteKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    return true;
  }, []);

  const addFunnel = useCallback((f: Funnel) => {
    setFunnelsRaw((prev) => [f, ...prev]);
  }, []);

  const updateFunnel = useCallback((f: Funnel) => {
    setFunnelsRaw((prev) => prev.map((x) => (x.id === f.id ? f : x)));
  }, []);

  const toggleFunnelActive = useCallback((id: string) => {
    setFunnelsRaw((prev) => prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
  }, []);

  const value = useMemo(() => ({
    products, addProduct, updateProduct, productTypes, addProductType, deleteProductType,
    formats, addFormat, deleteFormat,
    topics, allContentItems, addTopic, updateTopic, updateContentItem,
    keywords, addKeyword, deleteKeyword,
    funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword,
    isDataLoading,
  }), [products, addProduct, updateProduct, productTypes, addProductType, deleteProductType, formats, addFormat, deleteFormat, topics, allContentItems, addTopic, updateTopic, updateContentItem, keywords, addKeyword, deleteKeyword, funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword, isDataLoading]);

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
