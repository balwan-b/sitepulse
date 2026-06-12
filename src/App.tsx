import { Authenticated, Refine, useGetIdentity } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { ClipboardList } from "lucide-react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import "./App.css";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { USER_ROLES } from "./constants";
import { sitePulseResources } from "./lib/resource-adapters";
import AccessDeniedPage from "./pages/access-denied";
import ClientPortalPage from "./pages/client-portal";
import CrewAssignmentsCreatePage from "./pages/crew-assignments/create";
import DashboardPage from "./pages/dashboard";
import DailyLogsCreatePage from "./pages/daily-logs/create";
import DailyLogsListPage from "./pages/daily-logs/list";
import DailyLogsShowPage from "./pages/daily-logs/show";
import { ForgotPassword } from "./pages/forgot-password";
import { Login } from "./pages/login";
import OperationsPage from "./pages/operations";
import PunchItemsCreatePage from "./pages/punch-items/create";
import PunchItemsListPage from "./pages/punch-items/list";
import PunchItemsShowPage from "./pages/punch-items/show";
import ProjectPhasesCreatePage from "./pages/project-phases/create";
import ProjectPhasesListPage from "./pages/project-phases/list";
import ProjectPhasesShowPage from "./pages/project-phases/show";
import ProjectsCreatePage from "./pages/projects/create";
import ProjectsListPage from "./pages/projects/list";
import ProjectsShowPage from "./pages/projects/show";
import { Register } from "./pages/register";
import StaffListPage from "./pages/staff/list";
import { authProvider } from "./providers/auth";
import { dataProvider } from "./providers/data";
import type { SessionUser, SitePulseUserRole } from "./types";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              dataProvider={dataProvider}
              authProvider={authProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                title: {
                  text: "SitePulse",
                  icon: <ClipboardList />,
                },
              }}
              resources={sitePulseResources}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated key="public-routes" fallback={<Outlet />}>
                      <NavigateToResource fallbackTo="/" />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                <Route
                  element={
                    <Authenticated key="private-routes" fallback={<Login />}>
                      <Layout>
                        <Outlet />
                      </Layout>
                    </Authenticated>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route
                    path="/projects"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                          USER_ROLES.CLIENT,
                        ]}
                      >
                        <ProjectsListPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/projects/create"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN]}
                      >
                        <ProjectsCreatePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/projects/show/:id"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                          USER_ROLES.CLIENT,
                        ]}
                      >
                        <ProjectsShowPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/project-phases"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                          USER_ROLES.CLIENT,
                        ]}
                      >
                        <ProjectPhasesListPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/project-phases/create"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER]}
                      >
                        <ProjectPhasesCreatePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/project-phases/show/:id"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                          USER_ROLES.CLIENT,
                        ]}
                      >
                        <ProjectPhasesShowPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/crew-assignments/create"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER]}
                      >
                        <CrewAssignmentsCreatePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/daily-logs"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <DailyLogsListPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/daily-logs/create"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SITE_SUPERVISOR]}
                      >
                        <DailyLogsCreatePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/daily-logs/show/:id"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <DailyLogsShowPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/punch-items"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <PunchItemsListPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/punch-items/create"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <PunchItemsCreatePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/punch-items/show/:id"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <PunchItemsShowPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER]}
                      >
                        <StaffListPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/operations"
                    element={
                      <RoleGuard
                        allowedRoles={[
                          USER_ROLES.ADMIN,
                          USER_ROLES.PROJECT_MANAGER,
                          USER_ROLES.SITE_SUPERVISOR,
                        ]}
                      >
                        <OperationsPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/client-portal"
                    element={
                      <RoleGuard
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.CLIENT]}
                      >
                        <ClientPortalPage />
                      </RoleGuard>
                    }
                  />
                  <Route path="/access-denied" element={<AccessDeniedPage />} />
                </Route>
              </Routes>

              <Toaster />
              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
            <DevtoolsPanel />
          </DevtoolsProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly SitePulseUserRole[];
  children: ReactNode;
}) {
  const { data: identity, isLoading } = useGetIdentity<SessionUser>();

  if (isLoading) {
    return null;
  }

  if (!identity || !allowedRoles.includes(identity.role)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

export default App;
