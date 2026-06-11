import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import { createProject, getProject, listProjects, updateProject } from "../services/projects.js";

export const projectsRouter: ExpressRouter = Router();

projectsRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view projects");
    const result = await listProjects(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this project");
    const result = await getProject(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create projects");
    const result = await createProject(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

projectsRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this project");
    const result = await updateProject(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
