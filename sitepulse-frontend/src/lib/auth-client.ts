import { AUTH_API_URL } from "@/constants";
import type { SessionUser, SignUpPayload } from "@/types";

type AuthResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

type AuthUserPayload = {
  id?: string;
  email?: string;
  name?: string;
  role?: SessionUser["role"];
  image?: string | null;
};

const normalizeUser = (payload: AuthUserPayload | null | undefined): SessionUser | null => {
  if (
    !payload ||
    typeof payload.id !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.role !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    image: typeof payload.image === "string" ? payload.image : undefined,
  };
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<AuthResponse<T>> {
  try {
    const response = await fetch(`${AUTH_API_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });

      const payload = (await response.json().catch(() => ({}))) as {
      user?: unknown;
      data?: unknown;
      message?: string;
      code?: string;
      error?: { message?: string; code?: string } | string;
    };

    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message ||
            payload.message ||
            "Authentication failed";

      return { data: null, error: { message, code: payload.code } };
    }

    return {
      data: (normalizeUser(payload.user as AuthUserPayload | null | undefined) ??
        normalizeUser(payload.data as AuthUserPayload | null | undefined)) as T | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message:
          error instanceof Error ? error.message : "Authentication failed",
      },
    };
  }
}

export const authClient = {
  signUp: {
    email: (payload: SignUpPayload) =>
      request<SessionUser>("/sign-up/email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  signIn: {
    email: (payload: { email: string; password: string }) =>
      request<SessionUser>("/sign-in/email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  getSession: () => request<SessionUser>("/get-session"),
  signOut: () =>
    request<null>("/sign-out", {
      method: "POST",
    }),
};
