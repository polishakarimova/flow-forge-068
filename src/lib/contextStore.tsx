import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/authContext";

type JsonRecord = Record<string, unknown>;

export interface ExpertProfile {
  id?: number;
  userId?: string;
  personalityAnswers: JsonRecord;
  nicheAnswers: JsonRecord;
  audienceAnswers: JsonRecord;
  brandVoice: JsonRecord;
  completionScore: number;
}

export interface ProductContext {
  id?: number;
  userId?: string;
  productId?: number | null;
  title: string;
  audience: string;
  problem: string;
  result: string;
  offerDetails: string;
  objections: string;
  differentiators: string;
  proof: string;
  rawData: JsonRecord;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferenceItem {
  id?: number;
  userId?: string;
  title: string;
  type: string;
  content: string;
  url: string;
  notes: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SourceMaterial {
  id?: number;
  userId?: string;
  title: string;
  type: string;
  sourceKind: "text" | "link" | "file" | "voice";
  content: string;
  fileUrl?: string | null;
  metadata: JsonRecord;
  createdAt?: string;
  updatedAt?: string;
}

export type AiAnalysisStatus = "draft" | "queued" | "processing" | "completed" | "failed";

export interface AiAnalysis {
  id?: number;
  userId?: string;
  type: string;
  title: string;
  status: AiAnalysisStatus;
  inputSnapshot: JsonRecord;
  result: JsonRecord;
  summary: string;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ContextStore {
  expertProfile: ExpertProfile;
  productContexts: ProductContext[];
  references: ReferenceItem[];
  sourceMaterials: SourceMaterial[];
  aiAnalyses: AiAnalysis[];
  isContextLoading: boolean;
  loadExpertProfile: () => Promise<void>;
  updateExpertProfile: (patch: Partial<ExpertProfile>) => Promise<void>;
  loadProductContexts: () => Promise<void>;
  upsertProductContext: (ctx: ProductContext) => Promise<void>;
  loadReferences: () => Promise<void>;
  addReference: (ref: ReferenceItem) => Promise<void>;
  updateReference: (ref: ReferenceItem) => Promise<void>;
  deleteReference: (id: number) => Promise<void>;
  loadSourceMaterials: () => Promise<void>;
  addSourceMaterial: (material: SourceMaterial) => Promise<void>;
  updateSourceMaterial: (material: SourceMaterial) => Promise<void>;
  deleteSourceMaterial: (id: number) => Promise<void>;
  loadAiAnalyses: () => Promise<void>;
}

const emptyProfile: ExpertProfile = {
  personalityAnswers: {},
  nicheAnswers: {},
  audienceAnswers: {},
  brandVoice: {},
  completionScore: 0,
};

type ContextState = {
  expertProfile: ExpertProfile;
  productContexts: ProductContext[];
  references: ReferenceItem[];
  sourceMaterials: SourceMaterial[];
  aiAnalyses: AiAnalysis[];
};

const emptyContextState: ContextState = {
  expertProfile: emptyProfile,
  productContexts: [],
  references: [],
  sourceMaterials: [],
  aiAnalyses: [
    { type: "audience", title: "Анализ ЦА", status: "draft", inputSnapshot: {}, result: {}, summary: "" },
    { type: "personality", title: "Распаковка личности", status: "draft", inputSnapshot: {}, result: {}, summary: "" },
    { type: "content_strategy", title: "Контент-стратегия", status: "draft", inputSnapshot: {}, result: {}, summary: "" },
    { type: "funnel", title: "Воронка продаж", status: "draft", inputSnapshot: {}, result: {}, summary: "" },
    { type: "product_line", title: "Продуктовая линейка", status: "draft", inputSnapshot: {}, result: {}, summary: "" },
  ],
};

const ContextStoreContext = createContext<ContextStore | null>(null);

export function calculateContextCompletion(profile: ExpertProfile, productContexts: ProductContext[], references: ReferenceItem[]) {
  const countFilled = (obj: JsonRecord) => Object.values(obj || {}).filter((v) => String(v || "").trim().length > 0).length;
  const personality = Math.min(20, Math.round((countFilled(profile.personalityAnswers) / 9) * 20));
  const niche = Math.min(20, Math.round((countFilled(profile.nicheAnswers) / 11) * 20));
  const products = Math.min(20, Math.round((productContexts.filter((p) =>
    [p.audience, p.problem, p.result, p.offerDetails, p.objections, p.differentiators, p.proof].some((v) => v.trim())
  ).length / Math.max(productContexts.length || 1, 1)) * 20));
  const audience = Math.min(25, Math.round((countFilled(profile.audienceAnswers) / 12) * 25));
  const refs = Math.min(15, references.length >= 3 ? 15 : references.length * 5);
  return Math.min(100, personality + niche + products + audience + refs);
}

async function loadState(): Promise<ContextState | null> {
  const response = await fetch("/api/state/context", { credentials: "include" });
  if (!response.ok) return null;
  const { data } = await response.json();
  return data;
}

async function saveState(data: ContextState) {
  await fetch("/api/state/context", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

export function ContextProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [expertProfile, setExpertProfile] = useState<ExpertProfile>(emptyProfile);
  const [productContexts, setProductContexts] = useState<ProductContext[]>([]);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [sourceMaterials, setSourceMaterials] = useState<SourceMaterial[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AiAnalysis[]>(emptyContextState.aiAnalyses);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setExpertProfile(emptyProfile);
      setProductContexts([]);
      setReferences([]);
      setSourceMaterials([]);
      setAiAnalyses(emptyContextState.aiAnalyses);
      setHydrated(false);
      return;
    }
    setIsContextLoading(true);
    loadState()
      .then((data) => {
        if (cancelled) return;
        const next = data || emptyContextState;
        setExpertProfile(next.expertProfile || emptyProfile);
        setProductContexts(next.productContexts || []);
        setReferences(next.references || []);
        setSourceMaterials(next.sourceMaterials || []);
        setAiAnalyses(next.aiAnalyses?.length ? next.aiAnalyses : emptyContextState.aiAnalyses);
        setHydrated(true);
        if (!data) saveState(next).catch(console.error);
      })
      .catch((err) => console.error("Failed to load context:", err))
      .finally(() => {
        if (!cancelled) setIsContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    const timer = window.setTimeout(() => {
      saveState({ expertProfile, productContexts, references, sourceMaterials, aiAnalyses }).catch(console.error);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, hydrated, expertProfile, productContexts, references, sourceMaterials, aiAnalyses]);

  const loadExpertProfile = useCallback(async () => {}, []);
  const loadProductContexts = useCallback(async () => {}, []);
  const loadReferences = useCallback(async () => {}, []);
  const loadSourceMaterials = useCallback(async () => {}, []);
  const loadAiAnalyses = useCallback(async () => {}, []);

  const updateExpertProfile = useCallback(async (patch: Partial<ExpertProfile>) => {
    setExpertProfile((prev) => {
      const next = { ...prev, ...patch };
      return { ...next, completionScore: calculateContextCompletion(next, productContexts, references) };
    });
  }, [productContexts, references]);

  const upsertProductContext = useCallback(async (ctx: ProductContext) => {
    const temp = { ...ctx, id: ctx.id || Date.now(), updatedAt: new Date().toISOString() };
    setProductContexts((prev) => {
      const exists = prev.some((p) => p.id === temp.id || (ctx.productId && p.productId === ctx.productId));
      return exists ? prev.map((p) => (p.id === temp.id || (ctx.productId && p.productId === ctx.productId) ? temp : p)) : [temp, ...prev];
    });
  }, []);

  const addReference = useCallback(async (ref: ReferenceItem) => {
    setReferences((prev) => [{ ...ref, id: Date.now(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const updateReference = useCallback(async (ref: ReferenceItem) => {
    setReferences((prev) => prev.map((r) => r.id === ref.id ? ref : r));
  }, []);

  const deleteReference = useCallback(async (id: number) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addSourceMaterial = useCallback(async (material: SourceMaterial) => {
    setSourceMaterials((prev) => [{ ...material, id: Date.now(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const updateSourceMaterial = useCallback(async (material: SourceMaterial) => {
    setSourceMaterials((prev) => prev.map((m) => m.id === material.id ? material : m));
  }, []);

  const deleteSourceMaterial = useCallback(async (id: number) => {
    setSourceMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(() => ({
    expertProfile,
    productContexts,
    references,
    sourceMaterials,
    aiAnalyses,
    isContextLoading,
    loadExpertProfile,
    updateExpertProfile,
    loadProductContexts,
    upsertProductContext,
    loadReferences,
    addReference,
    updateReference,
    deleteReference,
    loadSourceMaterials,
    addSourceMaterial,
    updateSourceMaterial,
    deleteSourceMaterial,
    loadAiAnalyses,
  }), [expertProfile, productContexts, references, sourceMaterials, aiAnalyses, isContextLoading, loadExpertProfile, updateExpertProfile, loadProductContexts, upsertProductContext, loadReferences, addReference, updateReference, deleteReference, loadSourceMaterials, addSourceMaterial, updateSourceMaterial, deleteSourceMaterial, loadAiAnalyses]);

  return <ContextStoreContext.Provider value={value}>{children}</ContextStoreContext.Provider>;
}

export function useContextStore() {
  const ctx = useContext(ContextStoreContext);
  if (!ctx) throw new Error("useContextStore must be used within ContextProvider");
  return ctx;
}
