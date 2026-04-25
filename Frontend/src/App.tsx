import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages Auth
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import EmailVerificationPage from "@/pages/auth/EmailVerificationPage";

// Dashboards
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import HRDashboard from "@/pages/dashboard/HRDashboard";
import EmployeeDashboard from "@/pages/dashboard/EmployeeDashboard";
import CandidateDashboard from "@/pages/dashboard/CandidateDashboard";

// Pages RH
import EmployeeListPage from "@/pages/employees/EmployeeListPage";
import EmployeeCreatePage from "@/pages/employees/EmployeeCreatePage";
import EmployeeDetailPage from "@/pages/employees/EmployeeDetailPage";
import LeaveListPage from "@/pages/leaves/LeaveListPage";
import TaskBoardPage from "@/pages/tasks/TaskBoardPage";
import AttendancePage from "@/pages/attendance/AttendancePage";
import PayrollPage from "@/pages/payroll/PayrollPage";

// Documents & Formation
import DocumentsPage from "@/pages/documents/DocumentsPage";
import TrainingPage from "@/pages/training/TrainingPage";

// Pages Recrutement
import JobOfferListPage from "@/pages/recruitment/JobOfferListPage";
import ApplyPage from "@/pages/recruitment/ApplyPage";
import ApplicationTrackingPage from "@/pages/recruitment/ApplicationTrackingPage";

// Pages IA
import ChurnDashboardPage from "@/pages/ai-insights/ChurnDashboardPage";
import AIChatPage from "@/pages/ai/AIChatPage";
import VoiceAssistantPage from "@/pages/ai/VoiceAssistantPage";

// Parametres
import SettingsPage from "@/pages/settings/SettingsPage";
import SecurityPage from "@/pages/settings/SecurityPage";
import ProfilePage from "@/pages/settings/ProfilePage";

// Pages generales
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

const queryClient = new QueryClient();

// Composant qui redirige vers le bon dashboard selon le role
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'RH':
      return <HRDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    case 'CANDIDATE':
      return <CandidateDashboard />;
    default:
      return <HRDashboard />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Redirection de la racine */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Dashboard adaptatif selon le role */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Gestion RH */}
              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <EmployeeListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees/create"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <EmployeeCreatePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees/:id"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <EmployeeDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leaves"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <LeaveListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <TaskBoardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/attendance"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payroll"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />

              {/* Documents & Formation */}
              <Route
                path="/documents"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <DocumentsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/training"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <TrainingPage />
                  </ProtectedRoute>
                }
              />

              {/* Recrutement */}
              <Route
                path="/jobs"
                element={
                  <ProtectedRoute>
                    <JobOfferListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/jobs/:jobId/apply"
                element={
                  <ProtectedRoute allowedRoles={['CANDIDATE']}>
                    <ApplyPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-applications"
                element={
                  <ProtectedRoute allowedRoles={['CANDIDATE']}>
                    <ApplicationTrackingPage />
                  </ProtectedRoute>
                }
              />

              {/* Intelligence Artificielle */}
              <Route
                path="/ai-insights"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <ChurnDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ai-chat"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE']}>
                    <AIChatPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/voice-assistant"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <VoiceAssistantPage />
                  </ProtectedRoute>
                }
              />

              {/* Parametres */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/security"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <SecurityPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
