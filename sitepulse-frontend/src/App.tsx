import { Authenticated, Refine, useGetIdentity } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { ClipboardList } from "lucide-react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Suspense, lazy, type ReactNode } from "react";
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
import { authProvider } from "./providers/auth";
import { dataProvider } from "./providers/data";
import type { SessionUser, SitePulseUserRole } from "./types";

const AccessDeniedPage = lazy(() => import("./pages/access-denied"));
const ClientPortalPage = lazy(() => import("./pages/client-portal"));
const ChangeOrdersCreatePage = lazy(() => import("./pages/change-orders/create"));
const ChangeOrdersListPage = lazy(() => import("./pages/change-orders/list"));
const ChangeOrdersShowPage = lazy(() => import("./pages/change-orders/show"));
const CrewAssignmentsCreatePage = lazy(() => import("./pages/crew-assignments/create"));
const DashboardPage = lazy(() => import("./pages/dashboard"));
const DailyLogsCreatePage = lazy(() => import("./pages/daily-logs/create"));
const DailyLogsListPage = lazy(() => import("./pages/daily-logs/list"));
const DailyLogsShowPage = lazy(() => import("./pages/daily-logs/show"));
const ForgotPassword = lazy(() =>
  import("./pages/forgot-password").then((module) => ({
    default: module.ForgotPassword,
  })),
);
const Login = lazy(() =>
  import("./pages/login").then((module) => ({
    default: module.Login,
  })),
);
const OperationsPage = lazy(() => import("./pages/operations"));
const PunchItemsCreatePage = lazy(() => import("./pages/punch-items/create"));
const PunchItemsListPage = lazy(() => import("./pages/punch-items/list"));
const PunchItemsShowPage = lazy(() => import("./pages/punch-items/show"));
const ProjectPhasesCreatePage = lazy(() => import("./pages/project-phases/create"));
const ProjectPhasesListPage = lazy(() => import("./pages/project-phases/list"));
const ProjectPhasesShowPage = lazy(() => import("./pages/project-phases/show"));
const ProjectsCreatePage = lazy(() => import("./pages/projects/create"));
const ProjectsListPage = lazy(() => import("./pages/projects/list"));
const ProjectsShowPage = lazy(() => import("./pages/projects/show"));
const Register = lazy(() =>
  import("./pages/register").then((module) => ({
    default: module.Register,
  })),
);
const StaffListPage = lazy(() => import("./pages/staff/list"));

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border bg-card/70">
    <p className="text-sm text-muted-foreground">Loading workspace...</p>
  </div>
);

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
              <Suspense fallback={<RouteLoader />}>
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
                        <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
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
                      path="/change-orders"
                      element={
                        <RoleGuard
                          allowedRoles={[
                            USER_ROLES.ADMIN,
                            USER_ROLES.PROJECT_MANAGER,
                            USER_ROLES.SITE_SUPERVISOR,
                            USER_ROLES.CLIENT,
                          ]}
                        >
                          <ChangeOrdersListPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/change-orders/create"
                      element={
                        <RoleGuard
                          allowedRoles={[
                            USER_ROLES.ADMIN,
                            USER_ROLES.PROJECT_MANAGER,
                            USER_ROLES.SITE_SUPERVISOR,
                          ]}
                        >
                          <ChangeOrdersCreatePage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/change-orders/show/:id"
                      element={
                        <RoleGuard
                          allowedRoles={[
                            USER_ROLES.ADMIN,
                            USER_ROLES.PROJECT_MANAGER,
                            USER_ROLES.SITE_SUPERVISOR,
                            USER_ROLES.CLIENT,
                          ]}
                        >
                          <ChangeOrdersShowPage />
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
                        <RoleGuard allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.CLIENT]}>
                          <ClientPortalPage />
                        </RoleGuard>
                      }
                    />
                    <Route path="/access-denied" element={<AccessDeniedPage />} />
                  </Route>
                </Routes>
              </Suspense>
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
