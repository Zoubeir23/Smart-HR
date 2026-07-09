import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AutoSEO from "@/components/common/AutoSEO";
import AppErrorBoundary from "@/components/common/AppErrorBoundary";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages Auth (chargement immédiat — nécessaires avant authentification)
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import EmailVerificationPage from "@/pages/auth/EmailVerificationPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LandingPage from "@/pages/LandingPage";

// Pages interview public (sans login, chargement immédiat)
import InterviewLandingPage from "@/pages/interview/InterviewLandingPage";
import InterviewStartPage from "@/pages/interview/InterviewStartPage";
import InterviewCompletedPage from "@/pages/interview/InterviewCompletedPage";

// Dashboards (lazy)
const AdminDashboard = React.lazy(() => import("@/pages/dashboard/AdminDashboard"));
const HRDashboard = React.lazy(() => import("@/pages/dashboard/HRDashboard"));
const EmployeeDashboard = React.lazy(() => import("@/pages/dashboard/EmployeeDashboard"));
const CandidateDashboard = React.lazy(() => import("@/pages/dashboard/CandidateDashboard"));

// Pages RH (lazy)
const EmployeeListPage = React.lazy(() => import("@/pages/employees/EmployeeListPage"));
const EmployeeCreatePage = React.lazy(() => import("@/pages/employees/EmployeeCreatePage"));
const EmployeeDetailPage = React.lazy(() => import("@/pages/employees/EmployeeDetailPage"));
const DepartmentPage = React.lazy(() => import("@/pages/employees/DepartmentPage"));
const TalentManagementPage = React.lazy(() => import("@/pages/personnel/TalentManagementPage"));
const ServicePage = React.lazy(() => import("@/pages/employees/ServicePage"));
const PositionPage = React.lazy(() => import("@/pages/employees/PositionPage"));
const ContractPage = React.lazy(() => import("@/pages/employees/ContractPage"));
const ReferenceTablesPage = React.lazy(() => import("@/pages/employees/ReferenceTablesPage"));
const LeaveListPage = React.lazy(() => import("@/pages/leaves/LeaveListPage"));
const TaskBoardPage = React.lazy(() => import("@/pages/tasks/TaskBoardPage"));
const AttendancePage = React.lazy(() => import("@/pages/attendance/AttendancePage"));
const PayrollPage = React.lazy(() => import("@/pages/payroll/PayrollPage"));
const DisciplinePage = React.lazy(() => import("@/pages/discipline/DisciplinePage"));
const CommunicationPage = React.lazy(() => import("@/pages/communication/CommunicationPage"));
const PerformancePage = React.lazy(() => import("@/pages/performance/PerformancePage"));
const SurveysPage = React.lazy(() => import("@/pages/surveys/SurveysPage"));

// Documents & Formation (lazy)
const DocumentsPage = React.lazy(() => import("@/pages/documents/DocumentsPage"));
const TrainingPage = React.lazy(() => import("@/pages/training/TrainingPage"));

// Pages Recrutement (lazy)
const JobOfferListPage = React.lazy(() => import("@/pages/recruitment/JobOfferListPage"));
const ApplyPage = React.lazy(() => import("@/pages/recruitment/ApplyPage"));
const ApplicationTrackingPage = React.lazy(() => import("@/pages/recruitment/ApplicationTrackingPage"));
const ApplicationsManagementPage = React.lazy(() => import("@/pages/recruitment/ApplicationsManagementPage"));

// Analytics (lazy)
const AnalyticsPage = React.lazy(() => import("@/pages/analytics/AnalyticsPage"));

// Pages IA (lazy)
const ChurnDashboardPage = React.lazy(() => import("@/pages/ai-insights/ChurnDashboardPage"));
const AIChatPage = React.lazy(() => import("@/pages/ai/AIChatPage"));
const RecruteurIAPage = React.lazy(() => import("@/pages/ai/RecruteurIAPage"));
const VoiceAssistantPage = React.lazy(() => import("@/pages/ai/VoiceAssistantPage"));

// Calendrier (lazy)
const CalendarPage = React.lazy(() => import("@/pages/calendar/CalendarPage"));

// Paramètres (lazy)
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));
const SecurityPage = React.lazy(() => import("@/pages/settings/SecurityPage"));
const ProfilePage = React.lazy(() => import("@/pages/settings/ProfilePage"));
const UserManagementPage = React.lazy(() => import("@/pages/admin/UserManagementPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Layout persistant : Sidebar/Navbar rendus une seule fois, ne remontent pas
// à chaque navigation entre pages authentifiées (Outlet swap uniquement le
// contenu). Auparavant chaque page incluait son propre <DashboardLayout>,
// ce qui démontait/remontait tout le chrome (et son état : sidebar replié,
// scroll, dropdowns ouverts) à chaque clic dans le menu.
function AuthenticatedLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

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
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AutoSEO />
            <AppErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Entretien IA partagé — public, sans login */}
              <Route path="/interview/:token" element={<InterviewLandingPage />} />
              <Route path="/interview/:token/start" element={<InterviewStartPage />} />
              <Route path="/interview/:token/completed" element={<InterviewCompletedPage />} />

              {/* Landing Page à la racine */}
              <Route path="/" element={<LandingPage />} />

              {/* Pages authentifiées : Sidebar/Navbar persistants (voir AuthenticatedLayout) */}
              <Route element={<AuthenticatedLayout />}>

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
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <DepartmentPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/talent-management"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <TalentManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/services"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <ServicePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/positions"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <PositionPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reference-tables"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <ReferenceTablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/contracts"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <ContractPage />
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
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <PayrollPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/discipline"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <DisciplinePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/communication"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <CommunicationPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/performance"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <PerformancePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/surveys"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <SurveysPage />
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

              <Route
                path="/calendar"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE']}>
                    <CalendarPage />
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

              <Route
                path="/applications"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <ApplicationsManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Analytiques */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <AnalyticsPage />
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
                path="/recruteur-ia"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                    <RecruteurIAPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/voice-assistant"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE']}>
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

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            </AppErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
