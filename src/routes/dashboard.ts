import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import { getDashboardSnapshot } from "../services/dashboard.js";

export const dashboardRouter: ExpressRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view the SitePulse dashboard");
    const result = await getDashboardSnapshot(actor);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
