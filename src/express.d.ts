declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id?: string;
        role?: "admin" | "project_manager" | "site_supervisor" | "client";
      };
    }
  }
}

export {};
