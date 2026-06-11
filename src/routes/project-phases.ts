import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import {
  createProjectPhase,
  getProjectPhase,
  listProjectPhases,
  updateProjectPhase,
} from "../services/project-phases.js";

export const projectPhasesRouter: ExpressRouter = Router();

projectPhasesRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view project phases");
    const result = await listProjectPhases(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

projectPhasesRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this project phase");
    const result = await getProjectPhase(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

projectPhasesRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create project phases");
    const result = await createProjectPhase(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

projectPhasesRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this project phase");
    const result = await updateProjectPhase(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
