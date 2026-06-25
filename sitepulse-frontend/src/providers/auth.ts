import type { AuthProvider } from "@refinedev/core";

import { authClient } from "@/lib/auth-client";
import { isPublicRegistrationRoleAllowed } from "@/lib/registration-policy";
import type { SessionUser, SignUpPayload } from "@/types";

const USER_STORAGE_KEY = "sitepulse.user";
const USER_SYNCED_AT_KEY = "sitepulse.user.syncedAt";
const SESSION_SYNC_TTL_MS = 5 * 60 * 1000;

const saveUser = (user: unknown) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(USER_SYNCED_AT_KEY, String(Date.now()));
};

const clearUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(USER_SYNCED_AT_KEY);
};

const getStoredUser = (): SessionUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    clearUser();
    return null;
  }
};

const syncSessionIdentity = async () => {
  const { data, error } = await authClient.getSession();

  if (error || !data) {
    clearUser();
    return null;
  }

  saveUser(data);
  return data;
};

const ensureVerifiedSession = async () => {
  const user = await syncSessionIdentity();

  if (!user) {
    return {
      ok: false as const,
      message:
        "Sign-in succeeded, but the browser did not keep a usable SitePulse session. This usually means the auth cookie was blocked or the frontend/backend origins do not match the live setup.",
    };
  }

  return {
    ok: true as const,
    user,
  };
};

const shouldResyncSession = () => {
  const syncedAt = Number(localStorage.getItem(USER_SYNCED_AT_KEY) ?? 0);
  if (!syncedAt) return true;

  return Date.now() - syncedAt > SESSION_SYNC_TTL_MS;
};

const getFreshIdentity = async () => {
  const stored = getStoredUser();

  if (!stored || shouldResyncSession()) {
    return syncSessionIdentity();
  }

  return stored;
};

export const authProvider: AuthProvider = {
  register: async (params) => {
    const payload = params as SignUpPayload;

    if (!isPublicRegistrationRoleAllowed(payload.role)) {
      return {
        success: false,
        error: {
          name: "Registration blocked",
          message:
            "Only client accounts can be created through public registration.",
        },
      };
    }

    const { data, error } = await authClient.signUp.email(payload);

    if (error || !data) {
      return {
        success: false,
        error: {
          name: "Registration failed",
          message: error?.message || "Unable to create account.",
        },
      };
    }

    const verifiedSession = await ensureVerifiedSession();

    if (!verifiedSession.ok) {
      return {
        success: false,
        error: {
          name: "Session verification failed",
          message: verifiedSession.message,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  login: async ({ email, password }) => {
    const { data, error } = await authClient.signIn.email({ email, password });

    if (error || !data) {
      return {
        success: false,
        error: {
          name: "Login failed",
          message: error?.message || "Invalid credentials.",
        },
      };
    }

    const verifiedSession = await ensureVerifiedSession();

    if (!verifiedSession.ok) {
      return {
        success: false,
        error: {
          name: "Session verification failed",
          message: verifiedSession.message,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  logout: async () => {
    await authClient.signOut();
    clearUser();

    return {
      success: true,
      redirectTo: "/login",
    };
  },
  onError: async (error) => {
    if (error?.statusCode === 401 || error?.response?.status === 401) {
      clearUser();
      return { logout: true };
    }

    return { error };
  },
  check: async () => {
    const user = await syncSessionIdentity();

    if (user) {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
      error: {
        name: "Unauthorized",
        message: "Check failed",
      },
    };
  },
  getIdentity: async () => {
    const stored = getStoredUser();

    if (stored && !shouldResyncSession()) {
      return stored;
    }

    return syncSessionIdentity();
  },
  getPermissions: async () => {
    const user = await getFreshIdentity();
    return user ? { role: user.role } : null;
  },
  forgotPassword: async () => ({
    success: true,
  }),
};
