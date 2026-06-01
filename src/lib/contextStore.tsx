import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";

type JsonRecord = Record<string, any>;

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

const ContextStoreContext = createContext<ContextStore | null>(null);

function mapExpertProfile(row: any): ExpertProfile {
  return {
    id: row.id,
    userId: row.user_id,
    personalityAnswers: row.personality_answers || {},
    nicheAnswers: row.niche_answers || {},
    audienceAnswers: row.audience_answers || {},
    brandVoice: row.brand_voice || {},
    completionScore: row.completion_score || 0,
  };
}

function mapProductContext(row: any): ProductContext {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    title: row.title || "",
    audience: row.audience || "",
    problem: row.problem || "",
    result: row.result || "",
    offerDetails: row.offer_details || "",
    objections: row.objections || "",
    differentiators: row.differentiators || "",
    proof: row.proof || "",
    rawData: row.raw_data || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReference(row: any): ReferenceItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "",
    type: row.type || "other",
    content: row.content || "",
    url: row.url || "",
    notes: row.notes || "",
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSourceMaterial(row: any): SourceMaterial {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "",
    type: row.type || "other",
    sourceKind: row.source_kind || "text",
    content: row.content || "",
    fileUrl: row.file_url,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAiAnalysis(row: any): AiAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type || "audience",
    title: row.title || "",
    status: row.status || "draft",
    inputSnapshot: row.input_snapshot || {},
    result: row.result || {},
    summary: row.summary || "",
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

export function ContextProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const [expertProfile, setExpertProfile] = useState<ExpertProfile>(emptyProfile);
  const [productContexts, setProductContexts] = useState<ProductContext[]>([]);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [sourceMaterials, setSourceMaterials] = useState<SourceMaterial[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AiAnalysis[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(false);

  const loadExpertProfile = useCallback(async () => {
    if (!userId) {
      setExpertProfile(emptyProfile);
      return;
    }
    const { data } = await supabase.from("expert_profiles").select("*").eq("user_id", userId).maybeSingle();
    setExpertProfile(data ? mapExpertProfile(data) : emptyProfile);
  }, [userId]);

  const loadProductContexts = useCallback(async () => {
    if (!userId) {
      setProductContexts([]);
      return;
    }
    const { data } = await supabase.from("product_contexts").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setProductContexts((data || []).map(mapProductContext));
  }, [userId]);

  const loadReferences = useCallback(async () => {
    if (!userId) {
      setReferences([]);
      return;
    }
    const { data } = await supabase.from("references").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setReferences((data || []).map(mapReference));
  }, [userId]);

  const loadSourceMaterials = useCallback(async () => {
    if (!userId) {
      setSourceMaterials([]);
      return;
    }
    const { data } = await supabase.from("source_materials").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setSourceMaterials((data || []).map(mapSourceMaterial));
  }, [userId]);

  const loadAiAnalyses = useCallback(async () => {
    if (!userId) {
      setAiAnalyses([]);
      return;
    }
    const { data } = await supabase.from("ai_analyses").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setAiAnalyses((data || []).map(mapAiAnalysis));
  }, [userId]);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setExpertProfile(emptyProfile);
      setProductContexts([]);
      setReferences([]);
      setSourceMaterials([]);
      setAiAnalyses([]);
      return;
    }
    let cancelled = false;
    setIsContextLoading(true);
    Promise.all([loadExpertProfile(), loadProductContexts(), loadReferences(), loadSourceMaterials(), loadAiAnalyses()])
      .catch((err) => console.error("Failed to load context:", err))
      .finally(() => {
        if (!cancelled) setIsContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, isAuthenticated, loadExpertProfile, loadProductContexts, loadReferences, loadSourceMaterials, loadAiAnalyses]);

  const updateExpertProfile = useCallback(async (patch: Partial<ExpertProfile>) => {
    const next = { ...expertProfile, ...patch };
    const completionScore = calculateContextCompletion(next, productContexts, references);
    const updated = { ...next, completionScore };
    setExpertProfile(updated);
    if (!userId) return;

    const payload = {
      user_id: userId,
      personality_answers: updated.personalityAnswers,
      niche_answers: updated.nicheAnswers,
      audience_answers: updated.audienceAnswers,
      brand_voice: updated.brandVoice,
      completion_score: completionScore,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("expert_profiles").upsert(payload, { onConflict: "user_id" }).select().single();
    if (data) setExpertProfile(mapExpertProfile(data));
  }, [expertProfile, productContexts, references, userId]);

  const upsertProductContext = useCallback(async (ctx: ProductContext) => {
    const temp = { ...ctx, id: ctx.id || Date.now() };
    setProductContexts((prev) => {
      const exists = prev.some((p) => p.id === temp.id || (ctx.productId && p.productId === ctx.productId));
      return exists ? prev.map((p) => (p.id === temp.id || (ctx.productId && p.productId === ctx.productId) ? temp : p)) : [temp, ...prev];
    });
    if (!userId) return;
    const payload = {
      id: ctx.id,
      user_id: userId,
      product_id: ctx.productId,
      title: ctx.title,
      audience: ctx.audience,
      problem: ctx.problem,
      result: ctx.result,
      offer_details: ctx.offerDetails,
      objections: ctx.objections,
      differentiators: ctx.differentiators,
      proof: ctx.proof,
      raw_data: ctx.rawData,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("product_contexts").upsert(payload).select().single();
    if (data) setProductContexts((prev) => prev.map((p) => p.id === temp.id ? mapProductContext(data) : p));
  }, [userId]);

  const addReference = useCallback(async (ref: ReferenceItem) => {
    const temp = { ...ref, id: Date.now(), createdAt: new Date().toISOString() };
    setReferences((prev) => [temp, ...prev]);
    if (!userId) return;
    const { data } = await supabase.from("references").insert({
      user_id: userId,
      title: ref.title,
      type: ref.type,
      content: ref.content,
      url: ref.url,
      notes: ref.notes,
      tags: ref.tags,
    }).select().single();
    if (data) setReferences((prev) => prev.map((r) => r.id === temp.id ? mapReference(data) : r));
  }, [userId]);

  const updateReference = useCallback(async (ref: ReferenceItem) => {
    setReferences((prev) => prev.map((r) => r.id === ref.id ? ref : r));
    if (!userId || !ref.id) return;
    await supabase.from("references").update({
      title: ref.title,
      type: ref.type,
      content: ref.content,
      url: ref.url,
      notes: ref.notes,
      tags: ref.tags,
      updated_at: new Date().toISOString(),
    }).eq("id", ref.id).eq("user_id", userId);
  }, [userId]);

  const deleteReference = useCallback(async (id: number) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
    if (userId) await supabase.from("references").delete().eq("id", id).eq("user_id", userId);
  }, [userId]);

  const addSourceMaterial = useCallback(async (material: SourceMaterial) => {
    const temp = { ...material, id: Date.now(), createdAt: new Date().toISOString() };
    setSourceMaterials((prev) => [temp, ...prev]);
    if (!userId) return;
    const { data } = await supabase.from("source_materials").insert({
      user_id: userId,
      title: material.title,
      type: material.type,
      source_kind: material.sourceKind,
      content: material.content,
      file_url: material.fileUrl,
      metadata: material.metadata,
    }).select().single();
    if (data) setSourceMaterials((prev) => prev.map((m) => m.id === temp.id ? mapSourceMaterial(data) : m));
  }, [userId]);

  const updateSourceMaterial = useCallback(async (material: SourceMaterial) => {
    setSourceMaterials((prev) => prev.map((m) => m.id === material.id ? material : m));
    if (!userId || !material.id) return;
    await supabase.from("source_materials").update({
      title: material.title,
      type: material.type,
      source_kind: material.sourceKind,
      content: material.content,
      file_url: material.fileUrl,
      metadata: material.metadata,
      updated_at: new Date().toISOString(),
    }).eq("id", material.id).eq("user_id", userId);
  }, [userId]);

  const deleteSourceMaterial = useCallback(async (id: number) => {
    setSourceMaterials((prev) => prev.filter((m) => m.id !== id));
    if (userId) await supabase.from("source_materials").delete().eq("id", id).eq("user_id", userId);
  }, [userId]);

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
  }), [
    expertProfile, productContexts, references, sourceMaterials, aiAnalyses, isContextLoading,
    loadExpertProfile, updateExpertProfile, loadProductContexts, upsertProductContext,
    loadReferences, addReference, updateReference, deleteReference, loadSourceMaterials,
    addSourceMaterial, updateSourceMaterial, deleteSourceMaterial, loadAiAnalyses,
  ]);

  return <ContextStoreContext.Provider value={value}>{children}</ContextStoreContext.Provider>;
}

export function useContextStore() {
  const ctx = useContext(ContextStoreContext);
  if (!ctx) throw new Error("useContextStore must be used within ContextProvider");
  return ctx;
}
