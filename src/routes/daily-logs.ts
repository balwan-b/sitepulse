import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import {
  createDailyLog,
  getDailyLog,
  listDailyLogs,
  submitDailyLog,
  updateDailyLog,
} from "../services/daily-logs.js";

export const dailyLogsRouter: ExpressRouter = Router();

dailyLogsRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view daily logs");
    const result = await listDailyLogs(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

dailyLogsRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this daily log");
    const result = await getDailyLog(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

dailyLogsRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create daily logs");
    const result = await createDailyLog(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

dailyLogsRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this daily log");
    const result = await updateDailyLog(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

dailyLogsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "submit this daily log");
    const result = await submitDailyLog(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
