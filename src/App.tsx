import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataStoreProvider } from "@/lib/dataStore";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { OnboardingTour, isTourCompleted } from "@/components/OnboardingTour";
import { createContext, useContext, useState, useEffect } from "react";
import Index from "./pages/Index.tsx";
import Content from "./pages/Content.tsx";
import Products from "./pages/Products.tsx";
import FunnelMapPage from "./pages/FunnelMapPage.tsx";
import Calendar from "./pages/Calendar.tsx";
import Welcome from "./pages/Welcome.tsx";
import Profile from "./pages/Profile.tsx";
import Register from "./pages/Register.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Tour context so sidebar can trigger it
export const TourContext = createContext<{ startTour: () => void }>({ startTour: () => {} });
export const useTour = () => useContext(TourContext);

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Auto-start tour on first login
  useEffect(() => {
    if (isAuthenticated && !isTourCompleted()) {
      const timer = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  return (
    <TourContext.Provider value={{ startTour: () => setShowTour(true) }}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/content" element={<Content />} />
        <Route path="/products" element={<Products />} />
        <Route path="/map" element={<FunnelMapPage />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}
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
          <BrowserRouter basename="/flow-forge-068">
            <AppRoutes />
          </BrowserRouter>
        </DataStoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
