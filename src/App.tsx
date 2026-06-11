import { Authenticated, Refine, useGetIdentity } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import {
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";

import "./App.css";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { USER_ROLES } from "./constants";
import AccessDeniedPage from "./pages/access-denied";
import ClientPortalPage from "./pages/client-portal";
import DashboardPage from "./pages/dashboard";
import { ForgotPassword } from "./pages/forgot-password";
import { Login } from "./pages/login";
import OperationsPage from "./pages/operations";
import { Register } from "./pages/register";
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
              resources={[
                {
                  name: "dashboard",
                  list: "/",
                  meta: {
                    label: "Dashboard",
                    icon: <LayoutDashboard />,
                    roles: [
                      USER_ROLES.ADMIN,
                      USER_ROLES.PROJECT_MANAGER,
                      USER_ROLES.SITE_SUPERVISOR,
                      USER_ROLES.CLIENT,
                    ],
                  },
                },
                {
                  name: "operations",
                  list: "/operations",
                  meta: {
                    label: "Operations",
                    icon: <ClipboardList />,
                    roles: [
                      USER_ROLES.ADMIN,
                      USER_ROLES.PROJECT_MANAGER,
                      USER_ROLES.SITE_SUPERVISOR,
                    ],
                  },
                },
                {
                  name: "client-portal",
                  list: "/client-portal",
                  meta: {
                    label: "Client Portal",
                    icon: <BriefcaseBusiness />,
                    roles: [USER_ROLES.ADMIN, USER_ROLES.CLIENT],
                  },
                },
              ]}
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
