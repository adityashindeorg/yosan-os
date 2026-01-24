import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

// --- AUTH IMPORTS ---
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";

// --- PAGES ---
import Landing from "./pages/Landing"; // <--- We will create this next
import Overview from "./pages/Overview";
import Money from "./pages/Money";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// --- AUTH GUARD COMPONENT ---
// This protects your internal dashboard pages. 
// If a user isn't logged in, it redirects them to the Landing page ("/")
function RequireAuth({ children }: { children: JSX.Element }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  if (user === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 text-[#A9FF53] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

const App = () => {
  // We handle the initial auth check inside the components or guards now, 
  // not globally blocking the whole app.
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Route: The High-End Landing Page */}
              <Route path="/" element={<Landing />} />

              {/* Protected Routes (Only accessible after login) */}
              <Route path="/overview" element={<RequireAuth><Overview /></RequireAuth>} />
              <Route path="/money" element={<RequireAuth><Money /></RequireAuth>} />
              <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;