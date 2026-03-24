import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { initialProducts, DEFAULT_FORMATS, type Product, type ProductStatusKey } from "@/lib/productData";
import { initialTopics, type Topic, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { funnelsData, type Funnel } from "@/lib/funnelData";

interface DataStore {
  // Products
  products: Product[];
  addProduct: (p: Omit<Product, "id" | "status" | "createdDate">) => void;
  updateProduct: (p: Product) => void;

  // Formats
  formats: string[];
  addFormat: (f: string) => void;
  deleteFormat: (f: string) => void;

  // Topics / Content
  topics: Topic[];
  addTopic: (t: Omit<Topic, "id">) => void;
  updateTopic: (t: Topic) => void;
  updateContentItem: (item: ContentItemData) => void;

  // Keywords
  keywords: string[];
  addKeyword: (kw: string) => void;
  deleteKeyword: (kw: string) => boolean; // returns false if has funnels

  // Funnels
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  addFunnel: (f: Funnel) => void;
  toggleFunnelActive: (id: string) => void;
  funnelsForKeyword: (kw: string) => Funnel[];
}

const DataStoreContext = createContext<DataStore | null>(null);

// Derive initial keywords from funnelsData
const initialKeywords = [...new Set(funnelsData.map((f) => f.keyword))];

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formats, setFormats] = useState<string[]>(DEFAULT_FORMATS);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [funnels, setFunnels] = useState<Funnel[]>(funnelsData);
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);

  const addProduct = useCallback((data: Omit<Product, "id" | "status" | "createdDate">) => {
    const newProduct: Product = {
      ...data,
      id: Date.now(),
      status: "draft" as ProductStatusKey,
      createdDate: new Date().toISOString().slice(0, 10),
    };
    setProducts((prev) => [newProduct, ...prev]);
  }, []);

  const updateProduct = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const addFormat = useCallback((f: string) => {
    setFormats((prev) => prev.includes(f) ? prev : [...prev, f]);
  }, []);

  const deleteFormat = useCallback((f: string) => {
    setFormats((prev) => prev.filter((x) => x !== f));
  }, []);

  const addTopic = useCallback((data: Omit<Topic, "id">) => {
    const newId = Date.now();
    setTopics((prev) => [{ ...data, id: newId }, ...prev]);
  }, []);

  const updateTopic = useCallback((updated: Topic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const updateContentItem = useCallback((item: ContentItemData) => {
    setTopics((prev) =>
      prev.map((t) => ({
        ...t,
        contentItems: t.contentItems.map((ci) => (ci.id === item.id ? item : ci)),
      }))
    );
  }, []);

  const addKeyword = useCallback((kw: string) => {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  }, []);

  const funnelsForKeyword = useCallback(
    (kw: string) => funnels.filter((f) => f.keyword === kw),
    [funnels]
  );

  const deleteKeyword = useCallback(
    (kw: string) => {
      // Can't delete here if has funnels — caller checks via funnelsForKeyword
      setKeywords((prev) => prev.filter((k) => k !== kw));
      return true;
    },
    []
  );

  const addFunnel = useCallback((f: Funnel) => {
    setFunnels((prev) => [f, ...prev]);
  }, []);

  const toggleFunnelActive = useCallback((id: string) => {
    setFunnels((prev) => prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
  }, []);

  const value = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      formats,
      addFormat,
      deleteFormat,
      topics,
      addTopic,
      updateTopic,
      updateContentItem,
      keywords,
      addKeyword,
      deleteKeyword,
      funnels,
      setFunnels,
      addFunnel,
      toggleFunnelActive,
      funnelsForKeyword,
    }),
    [products, addProduct, updateProduct, formats, addFormat, deleteFormat, topics, addTopic, updateTopic, updateContentItem, keywords, addKeyword, deleteKeyword, funnels, setFunnels, addFunnel, toggleFunnelActive, funnelsForKeyword]
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
