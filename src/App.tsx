import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataStoreProvider, useDataStore } from "@/lib/dataStore";
import { ContextProvider, useContextStore } from "@/lib/contextStore";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { BackNavigationProvider } from '@/lib/backNavigation';
import { OnboardingTour } from "@/components/OnboardingTour";
import { isTourCompleted } from "@/lib/homeTour";
import { createContext, useContext, useState, useEffect } from "react";
import Index from "./pages/Index.tsx";
import Content from "./pages/Content.tsx";
import ContextPage from "./pages/ContextPage.tsx";
import Products from "./pages/Products.tsx";
import FunnelMapPage from "./pages/FunnelMapPage.tsx";
import Publications from "./pages/Publications.tsx";
import Welcome from "./pages/Welcome.tsx";
import Home from "./pages/Home.tsx";
import { EditorialProvider } from "./lib/editorialContext";
import { MaterialCard } from "./components/content/MaterialCard";
import Profile from "./pages/Profile.tsx";
import Agents from "./pages/Agents.tsx";
import Register from "./pages/Register.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const main = useDataStore();
  const context = useContextStore();
  if (isLoading) return <div role="status" className="p-5 text-sm text-muted-foreground">Проверяем вход…</div>;
  if (!isAuthenticated) return <Navigate replace to={`/?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />;
  const store = location.pathname === '/context' ? context : main;
  const usesPublicationsStore = location.pathname === '/calendar' && new URLSearchParams(location.search).get('view') !== 'legacy';
  if (!usesPublicationsStore) {
    if (store.stateError) return <div role="alert" className="max-w-sm mx-auto p-5 text-sm space-y-3"><p>{store.stateError}</p><button className="text-primary underline" onClick={() => window.location.reload()}>Повторить загрузку</button></div>;
    if (!store.stateReady) return <div role="status" className="p-5 text-sm text-muted-foreground">Загружаем материалы…</div>;
  }
  return <Outlet />;
}

// Tour context so sidebar can trigger it
export const TourContext = createContext<{ startTour: () => void }>({ startTour: () => {} });
export const useTour = () => useContext(TourContext);

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const main = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [tourOwner, setTourOwner] = useState<string | null>(null);
  const homeReady = isAuthenticated && main.stateReady && !main.stateError && location.pathname === '/home' && !location.search;

  // Wait for the actual home workspace. Direct material/calendar links stay usable.
  useEffect(() => {
    if (!homeReady || !user) { setTourOwner(null); return; }
    if (isTourCompleted(user.id)) return;
    const timer = window.setTimeout(() => {
      if (!isTourCompleted(user.id) && !document.querySelector('[role="dialog"], dialog[open]')) setTourOwner(user.id);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [homeReady, user]);

  return (
    <TourContext.Provider value={{ startTour: () => { if (user) { navigate('/home'); setTourOwner(user.id); } } }}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route element={<RequireAuth />}>
        <Route path="/home" element={<Home />} />
        <Route path="/context" element={<ContextPage />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/content" element={<Content />} />
        <Route path="/products" element={<Products />} />
        <Route path="/map" element={<FunnelMapPage />} />
        <Route path="/calendar" element={<Publications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {homeReady && user && tourOwner === user.id && <OnboardingTour key={user.id} userId={user.id} onClose={() => setTourOwner(null)} />}
    </TourContext.Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DataStoreProvider>
          <ContextProvider>
            <BrowserRouter basename="/">
              <EditorialProvider><BackNavigationProvider><AppRoutes /><MaterialCard /></BackNavigationProvider></EditorialProvider>
            </BrowserRouter>
          </ContextProvider>
        </DataStoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
