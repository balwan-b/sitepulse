import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";

import { buildDataResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import { getDashboardSnapshot } from "../services/dashboard.js";

export const dashboardRouter: ExpressRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view the SitePulse dashboard");
    const result = await getDashboardSnapshot(actor);
    const payload = buildDataResponse(result);

    const rawEtag = crypto
      .createHash("sha1")
      .update(JSON.stringify(result))
      .digest("hex");
    const etag = `"${rawEtag}"`;

    const incoming = req.headers["if-none-match"];
    if (incoming && (incoming === etag || incoming === rawEtag)) {
      return res.status(304).end();
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=10");
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});
