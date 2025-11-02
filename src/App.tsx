import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import AccountsDashboard from "./pages/AccountsDashboard";
import Members from "./pages/Members";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import PTReport from "./pages/PTReport";
import Expenses from "./pages/Expenses";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/pt-report" element={<PTReport />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
