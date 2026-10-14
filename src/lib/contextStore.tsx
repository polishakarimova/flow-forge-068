import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/authContext";
import {useContextPersistence} from "@/hooks/useContextPersistence";

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
  stateReady: boolean;
  stateError: string;
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

export function ContextProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const {data,setData,isLoading:isContextLoading,stateReady,stateError}=useContextPersistence<ContextState>(isAuthenticated?user?.id||'':'',emptyContextState);
  const {expertProfile,productContexts,references,sourceMaterials,aiAnalyses}=data;
  const loadExpertProfile = useCallback(async () => {}, []);
  const loadProductContexts = useCallback(async () => {}, []);
  const loadReferences = useCallback(async () => {}, []);
  const loadSourceMaterials = useCallback(async () => {}, []);
  const loadAiAnalyses = useCallback(async () => {}, []);
  const updateExpertProfile=useCallback(async(patch:Partial<ExpertProfile>)=>{
    setData(prev=>{const profile={...prev.expertProfile,...patch};return {...prev,expertProfile:{...profile,completionScore:calculateContextCompletion(profile,prev.productContexts,prev.references)}};});
  },[setData]);
  const upsertProductContext=useCallback(async(ctx:ProductContext)=>{
    const temp={...ctx,id:ctx.id||Date.now(),updatedAt:new Date().toISOString()};
    setData(prev=>{const match=(p:ProductContext)=>p.id===temp.id||Boolean(ctx.productId&&p.productId===ctx.productId);return {...prev,productContexts:prev.productContexts.some(match)?prev.productContexts.map(p=>match(p)?temp:p):[temp,...prev.productContexts]};});
  },[setData]);
  const addReference=useCallback(async(ref:ReferenceItem)=>setData(prev=>({...prev,references:[{...ref,id:Date.now(),createdAt:new Date().toISOString()},...prev.references]})),[setData]);
  const updateReference=useCallback(async(ref:ReferenceItem)=>setData(prev=>({...prev,references:prev.references.map(r=>r.id===ref.id?ref:r)})),[setData]);
  const deleteReference=useCallback(async(id:number)=>setData(prev=>({...prev,references:prev.references.filter(r=>r.id!==id)})),[setData]);
  const addSourceMaterial=useCallback(async(material:SourceMaterial)=>setData(prev=>({...prev,sourceMaterials:[{...material,id:Date.now(),createdAt:new Date().toISOString()},...prev.sourceMaterials]})),[setData]);
  const updateSourceMaterial=useCallback(async(material:SourceMaterial)=>setData(prev=>({...prev,sourceMaterials:prev.sourceMaterials.map(m=>m.id===material.id?material:m)})),[setData]);
  const deleteSourceMaterial=useCallback(async(id:number)=>setData(prev=>({...prev,sourceMaterials:prev.sourceMaterials.filter(m=>m.id!==id)})),[setData]);
  const value=useMemo(()=>({expertProfile,productContexts,references,sourceMaterials,aiAnalyses,isContextLoading,stateReady,stateError,loadExpertProfile,updateExpertProfile,loadProductContexts,upsertProductContext,loadReferences,addReference,updateReference,deleteReference,loadSourceMaterials,addSourceMaterial,updateSourceMaterial,deleteSourceMaterial,loadAiAnalyses}),[expertProfile,productContexts,references,sourceMaterials,aiAnalyses,isContextLoading,stateReady,stateError,loadExpertProfile,updateExpertProfile,loadProductContexts,upsertProductContext,loadReferences,addReference,updateReference,deleteReference,loadSourceMaterials,addSourceMaterial,updateSourceMaterial,deleteSourceMaterial,loadAiAnalyses]);
  return <ContextStoreContext.Provider value={value}>{children}</ContextStoreContext.Provider>;
}
export function useContextStore() {
  const ctx = useContext(ContextStoreContext);
  if (!ctx) throw new Error("useContextStore must be used within ContextProvider");
  return ctx;
}
