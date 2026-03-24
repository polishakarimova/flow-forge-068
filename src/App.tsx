import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataStoreProvider } from "@/lib/dataStore";
import Index from "./pages/Index.tsx";
import Content from "./pages/Content.tsx";
import Products from "./pages/Products.tsx";
import FunnelMapPage from "./pages/FunnelMapPage.tsx";
import Calendar from "./pages/Calendar.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DataStoreProvider>
        <BrowserRouter basename="/flow-forge-068">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/content" element={<Content />} />
            <Route path="/products" element={<Products />} />
            <Route path="/map" element={<FunnelMapPage />} />
            <Route path="/calendar" element={<Calendar />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DataStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
