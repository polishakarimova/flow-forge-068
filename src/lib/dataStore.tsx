import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { type Product, type ProductStatusKey, type ProductType } from "@/lib/productData";
import { type Platform, type Topic, type ContentItemData } from "@/lib/contentData";
import { type Funnel } from "@/lib/funnelData";
import { useAuth } from "@/lib/authContext";
import { useMainState } from "@/hooks/useMainState";

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
  platforms: Platform[];
  addPlatform: (label: string) => string | null;
  deletePlatform: (id: string) => void;
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
  stateReady: boolean;
  stateError: string;
}

export type AppDataState = {
  products: Product[];
  productTypes: ProductType[];
  formats: string[];
  platforms: Platform[];
  topics: Topic[];
  funnels: Funnel[];
  keywords: string[];
};

const DataStoreContext = createContext<DataStore | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { data, setData, isDataLoading, stateError, stateReady } = useMainState(isAuthenticated ? user?.id || '' : '');
  const {products,productTypes,formats,platforms,topics,funnels,keywords}=data;
  const setters=useMemo(()=>{
    const setter=<K extends keyof AppDataState,>(key:K)=>(value:React.SetStateAction<AppDataState[K]>)=>setData(prev=>({...prev,[key]:typeof value==='function'?(value as (old:AppDataState[K])=>AppDataState[K])(prev[key]):value}));
    return {setProducts:setter('products'),setProductTypes:setter('productTypes'),setFormats:setter('formats'),setPlatforms:setter('platforms'),setTopics:setter('topics'),setFunnels:setter('funnels'),setKeywords:setter('keywords')};
  },[setData]);
  const {setProducts,setProductTypes,setFormats,setPlatforms,setTopics,setFunnels,setKeywords}=setters;
  const addProduct = useCallback((data: Omit<Product, "id" | "status" | "createdDate" | "publishDate">) => {
    const createdDate = new Date().toISOString().slice(0, 10);
    const newProduct: Product = { ...data, id: Date.now(), status: "draft" as ProductStatusKey, createdDate, publishDate: "" };
    setProducts((prev) => [newProduct, ...prev]);
  }, [setProducts]);

  const updateProduct = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, [setProducts]);

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
  }, [productTypes,setProductTypes]);

  const deleteProductType = useCallback((id: string) => {
    setProductTypes((prev) => prev.filter((type) => type.id !== id));
    setProducts((prev) => prev.map((product) => (product.typeId === id ? { ...product, typeId: "" } : product)));
  }, [setProductTypes,setProducts]);

  const addFormat = useCallback((f: string) => {
    setFormats((prev) => prev.includes(f) ? prev : [...prev, f]);
  }, [setFormats]);

  const deleteFormat = useCallback((f: string) => {
    setFormats((prev) => prev.filter((x) => x !== f));
  }, [setFormats]);

  const addPlatform = useCallback((label: string) => {
    const normalized = label.trim();
    if (!normalized) return null;
    const existing = platforms.find((platform) => platform.label.toLowerCase() === normalized.toLowerCase());
    if (existing) return existing.id;
    const id = `custom_${Date.now().toString(36)}`;
    setPlatforms((prev) => [
      ...prev,
      {
        id,
        label: normalized,
        icon: "",
        color: "#8b5cf6",
      },
    ]);
    return id;
  }, [platforms,setPlatforms]);

  const deletePlatform = useCallback((id: string) => {
    setPlatforms((prev) => prev.filter((platform) => platform.id !== id));
  }, [setPlatforms]);

  const addTopic = useCallback((data: Omit<Topic, "id">) => {
    setTopics((prev) => [{ ...data, id: Date.now() }, ...prev]);
  }, [setTopics]);

  const updateTopic = useCallback((updated: Topic) => {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, [setTopics]);

  const updateContentItem = useCallback((item: ContentItemData) => {
    setTopics((prev) => prev.map((t) => ({
      ...t,
      contentItems: t.contentItems.map((ci) => (ci.id === item.id ? item : ci)),
    })));
  }, [setTopics]);

  const allContentItems = useMemo(() => topics.flatMap((t) => t.contentItems), [topics]);

  const addKeyword = useCallback((kw: string) => {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  }, [setKeywords]);

  const funnelsForKeyword = useCallback((kw: string) => funnels.filter((f) => f.keyword === kw), [funnels]);

  const deleteKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    return true;
  }, [setKeywords]);

  const addFunnel = useCallback((f: Funnel) => {
    setFunnels((prev) => [f, ...prev]);
  }, [setFunnels]);

  const updateFunnel = useCallback((f: Funnel) => {
    setFunnels((prev) => prev.map((x) => (x.id === f.id ? f : x)));
  }, [setFunnels]);

  const toggleFunnelActive = useCallback((id: string) => {
    setFunnels((prev) => prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
  }, [setFunnels]);

  const value = useMemo(() => ({
    products, addProduct, updateProduct, productTypes, addProductType, deleteProductType,
    formats, addFormat, deleteFormat,
    platforms, addPlatform, deletePlatform,
    topics, allContentItems, addTopic, updateTopic, updateContentItem,
    keywords, addKeyword, deleteKeyword,
    funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword,
    isDataLoading,
    stateReady, stateError,
  }), [products, addProduct, updateProduct, productTypes, addProductType, deleteProductType, formats, addFormat, deleteFormat, platforms, addPlatform, deletePlatform, topics, allContentItems, addTopic, updateTopic, updateContentItem, keywords, addKeyword, deleteKeyword, funnels, setFunnels, addFunnel, updateFunnel, toggleFunnelActive, funnelsForKeyword, isDataLoading, stateReady, stateError]);

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
