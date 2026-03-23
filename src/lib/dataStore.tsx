import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { initialProducts, type Product, type ProductStatusKey } from "@/lib/productData";
import { initialTopics, type Topic, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { funnelsData, type Funnel } from "@/lib/funnelData";

interface DataStore {
  // Products
  products: Product[];
  addProduct: (p: Omit<Product, "id" | "status" | "createdDate">) => void;
  updateProduct: (p: Product) => void;

  // Topics / Content
  topics: Topic[];
  addTopic: (t: Omit<Topic, "id">) => void;
  updateTopic: (t: Topic) => void;
  updateContentItem: (item: ContentItemData) => void;

  // Funnels
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  toggleFunnelActive: (id: string) => void;
}

const DataStoreContext = createContext<DataStore | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [funnels, setFunnels] = useState<Funnel[]>(funnelsData);

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

  const toggleFunnelActive = useCallback((id: string) => {
    setFunnels((prev) => prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
  }, []);

  return (
    <DataStoreContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        topics,
        addTopic,
        updateTopic,
        updateContentItem,
        funnels,
        setFunnels,
        toggleFunnelActive,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
